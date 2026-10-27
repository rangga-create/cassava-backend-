import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Injectable } from "@nestjs/common";
import { FirebaseService } from "../common/services/firebase.service";

type AuthenticatedSocket = Socket & {
  user?: {
    uid: string;
    email: string;
    role?: string;
    companyId?: string;
  };
  handshake: Socket["handshake"] & {
    auth: { token?: string };
  };
};

@WebSocketGateway({
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  namespace: "/community",
})
@Injectable()
export class CommunityGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private groupRooms: Map<string, Set<string>> = new Map(); // groupId -> Set of socketIds

  constructor(private readonly firebaseService: FirebaseService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake auth or headers
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(" ")[1];

      if (!token) {
        client.disconnect();
        return;
      }

      // Verify token (simplified - in production use Firebase Admin)
      const user = await this.verifyToken(token);
      if (!user) {
        client.disconnect();
        return;
      }

      client.user = user;

      // Track user sockets
      if (!this.userSockets.has(user.uid)) {
        this.userSockets.set(user.uid, new Set());
      }
      this.userSockets.get(user.uid)!.add(client.id);

      // Join user's groups
      const memberships = await this.getUserGroupMemberships(user.uid);
      for (const membership of memberships) {
        if (membership.status === "ACTIVE") {
          client.join(`group:${membership.groupId}`);
          if (!this.groupRooms.has(membership.groupId)) {
            this.groupRooms.set(membership.groupId, new Set());
          }
          this.groupRooms.get(membership.groupId)!.add(client.id);
        }
      }

      console.log(`Client connected: ${client.id} (user: ${user.uid})`);
    } catch (error) {
      console.error("Connection error:", error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      const userSockets = this.userSockets.get(client.user.uid);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.userSockets.delete(client.user.uid);
        }
      }

      // Remove from group rooms
      for (const [groupId, sockets] of this.groupRooms.entries()) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.groupRooms.delete(groupId);
        }
      }
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("joinGroup")
  async handleJoinGroup(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string },
  ) {
    if (!client.user) return { error: "Not authenticated" };

    const { groupId } = data;

    // Verify membership
    const membership = await this.getMembership(groupId, client.user.uid);
    if (!membership || membership.status !== "ACTIVE") {
      return { error: "Not a member of this group" };
    }

    client.join(`group:${groupId}`);
    if (!this.groupRooms.has(groupId)) {
      this.groupRooms.set(groupId, new Set());
    }
    this.groupRooms.get(groupId)!.add(client.id);

    // Notify others in group
    client.to(`group:${groupId}`).emit("memberJoined", {
      userId: client.user.uid,
      groupId,
    });

    return { success: true, groupId };
  }

  @SubscribeMessage("leaveGroup")
  async handleLeaveGroup(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string },
  ) {
    if (!client.user) return { error: "Not authenticated" };

    const { groupId } = data;
    client.leave(`group:${groupId}`);

    const groupSockets = this.groupRooms.get(groupId);
    if (groupSockets) {
      groupSockets.delete(client.id);
    }

    client.to(`group:${groupId}`).emit("memberLeft", {
      userId: client.user.uid,
      groupId,
    });

    return { success: true, groupId };
  }

  @SubscribeMessage("sendMessage")
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string; text: string; mentionIds?: string[] },
  ) {
    if (!client.user) return { error: "Not authenticated" };

    const { groupId, text } = data;
    if (typeof text !== "string" || !text.trim() || text.length > 2000) {
      return { error: "Message must contain 1 to 2000 characters" };
    }

    // Verify membership
    const membership = await this.getMembership(groupId, client.user.uid);
    if (!membership || membership.status !== "ACTIVE") {
      return { error: "Not a member of this group" };
    }

    const requestedMentionIds = Array.isArray(data.mentionIds)
      ? [...new Set(data.mentionIds.filter((id): id is string => typeof id === "string"))].slice(0, 20)
      : [];
    const activeMembers = requestedMentionIds.length
      ? await this.firebaseService.getDocuments("groupMembers", [
          { field: "groupId", operator: "==", value: groupId },
          { field: "status", operator: "==", value: "ACTIVE" },
        ])
      : [];
    const mentions: { userId: string; username: string }[] = [];
    for (const member of activeMembers) {
      if (!requestedMentionIds.includes(member.userId)) continue;
      const mentionedUser = await this.firebaseService.getDocument("users", member.userId);
      if (!mentionedUser) continue;
      const username = this.getUsername(mentionedUser);
      const mentionPattern = new RegExp(`@${this.escapeRegExp(username)}(?![a-zA-Z0-9_.-])`, "i");
      if (mentionPattern.test(text)) mentions.push({ userId: member.userId, username });
    }

    // Save message to database
    const messageId = await this.firebaseService.createDocument("messages", {
      groupId,
      senderId: client.user.uid,
      text,
      mentions,
      status: "SENT",
      createdAt: new Date().toISOString(),
    });

    const message = await this.firebaseService.getDocument("messages", messageId);

    // Get sender info
    const sender = await this.firebaseService.getDocument("users", client.user.uid);

    const enrichedMessage = {
      ...message,
      sender: sender ? { id: sender.id, name: sender.name } : null,
    };

    // Broadcast to group
    this.server.to(`group:${groupId}`).emit("newMessage", enrichedMessage);

    return { success: true, message: enrichedMessage };
  }

  private getUsername(user: { username?: string; email?: string; name?: string }) {
    const rawUsername = user.username || user.email?.split("@")[0] || user.name || "user";
    return rawUsername.toLowerCase().replace(/[^a-z0-9_.-]/g, "") || "user";
  }

  private escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  @SubscribeMessage("typing")
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string; isTyping: boolean },
  ) {
    if (!client.user) return;

    client.to(`group:${data.groupId}`).emit("userTyping", {
      userId: client.user.uid,
      groupId: data.groupId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage("markAsRead")
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string; messageId: string },
  ) {
    if (!client.user) return;

    // Update message read status (optional)
    // Broadcast read receipt
    client.to(`group:${data.groupId}`).emit("messageRead", {
      messageId: data.messageId,
      userId: client.user.uid,
    });
  }

  // Helper methods
  private async verifyToken(token: string): Promise<any> {
    try {
      if (this.firebaseService.isFirebaseReady()) {
        const decoded = await this.firebaseService.getAuth().verifyIdToken(token);
        const userDoc = await this.firebaseService.getDocument("users", decoded.uid);
        return {
          uid: decoded.uid,
          email: decoded.email,
          emailVerified: decoded.email_verified,
          role: userDoc?.role,
          companyId: userDoc?.companyId,
        };
      } else {
        // Mock mode
        const mockUid = token.startsWith("mock-token-") ? token.replace("mock-token-", "") : "dev-user-001";
        const userDoc = await this.firebaseService.getDocument("users", mockUid);
        return {
          uid: mockUid,
          email: userDoc?.email || "admin@indocassava.com",
          emailVerified: true,
          role: userDoc?.role || "OWNER",
          companyId: userDoc?.companyId || "company-dev-001",
        };
      }
    } catch {
      return null;
    }
  }

  private async getUserGroupMemberships(userId: string): Promise<any[]> {
    return this.firebaseService.getDocuments("groupMembers", [
      { field: "userId", operator: "==", value: userId },
      { field: "status", operator: "==", value: "ACTIVE" },
    ]);
  }

  private async getMembership(groupId: string, userId: string): Promise<any> {
    const members = await this.firebaseService.getDocuments("groupMembers", [
      { field: "groupId", operator: "==", value: groupId },
      { field: "userId", operator: "==", value: userId },
    ]);
    return members[0] || null;
  }

  // Public method to send notifications to specific user
  async sendToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }

  // Public method to broadcast to group
  broadcastToGroup(groupId: string, event: string, data: any) {
    this.server.to(`group:${groupId}`).emit(event, data);
  }
}
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  GoneException,
} from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { FirebaseService } from "../common/services/firebase.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { CreateGroupDto, GroupVisibility, GroupTopic } from "./dto/create-group.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { CreateReportDto, ReportTargetType, ReportReason } from "./dto/report.dto";
import { UpdateMemberRoleDto, InviteMemberDto, GroupMemberRole } from "./dto/group-member.dto";
import { PaginationDto } from "../common/dto/pagination.dto";

@Injectable()
export class CommunityService {
  private readonly GROUPS_COLLECTION = "groups";
  private readonly GROUP_MEMBERS_COLLECTION = "groupMembers";
  private readonly GROUP_INVITATIONS_COLLECTION = "groupInvitations";
  private readonly MESSAGES_COLLECTION = "messages";
  private readonly REPORTS_COLLECTION = "reports";
  private readonly MODERATION_ACTIONS_COLLECTION = "moderationActions";

  constructor(private readonly firebaseService: FirebaseService) {}

  // ==================== GROUP MANAGEMENT ====================

  async createGroup(createGroupDto: CreateGroupDto, user: AuthUser) {
    const groupId = await this.firebaseService.createDocument(this.GROUPS_COLLECTION, {
      ...createGroupDto,
      creatorId: user.uid,
      companyId: user.companyId || null,
      status: "ACTIVE",
      memberCount: 1,
    });

    // Add creator as OWNER
    await this.firebaseService.createDocument(this.GROUP_MEMBERS_COLLECTION, {
      groupId,
      userId: user.uid,
      role: GroupMemberRole.OWNER,
      status: "ACTIVE",
      joinedAt: new Date().toISOString(),
    });

    const group = await this.firebaseService.getDocument(this.GROUPS_COLLECTION, groupId);
    return { success: true, data: group, message: "Group created successfully" };
  }

  async getGroups(query: PaginationDto, user: AuthUser) {
    const { page = 1, limit = 10, search, sortBy = "createdAt", sortOrder = "desc" } = query;

    const filters: any[] = [
      { field: "status", operator: "==", value: "ACTIVE" },
    ];

    const documents = await this.firebaseService.getDocuments(
      this.GROUPS_COLLECTION,
      filters,
      { field: sortBy, direction: sortOrder },
      limit * page,
    );

    const userMemberships = await this.getUserMemberships(user.uid);
    const activeMemberships = userMemberships.filter((membership) => membership.status === "ACTIVE");
    const userMembershipByGroupId = new Map(activeMemberships.map((membership) => [membership.groupId, membership]));
    const visibleGroups = documents.filter(
      (group) => group.visibility === GroupVisibility.PUBLIC || userMembershipByGroupId.has(group.id),
    );
    let filteredDocs = visibleGroups;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredDocs = visibleGroups.filter(
        (doc) =>
          doc.name?.toLowerCase().includes(searchLower) ||
          doc.description?.toLowerCase().includes(searchLower),
      );
    }

    // Add member status for current user
    const enrichedDocs = filteredDocs.map((group) => {
      const membership = userMembershipByGroupId.get(group.id);
      return {
        ...group,
        isMember: !!membership,
        userRole: membership?.role,
      };
    });

    const total = enrichedDocs.length;
    const offset = (page - 1) * limit;
    const paginatedDocs = enrichedDocs.slice(offset, offset + limit);

    return {
      success: true,
      data: paginatedDocs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      message: "Groups retrieved successfully",
    };
  }

  async getGroup(id: string, user: AuthUser) {
    const group = await this.firebaseService.getDocument(this.GROUPS_COLLECTION, id);
    if (!group) {
      throw new NotFoundException("Group not found");
    }

    // Check access for private/invite-only groups
    if (group.visibility !== GroupVisibility.PUBLIC) {
      const membership = await this.getMembership(id, user.uid);
      if (!membership || membership.status !== "ACTIVE") {
        throw new ForbiddenException("You are not a member of this group");
      }
      group.userRole = membership.role;
    } else {
      const membership = await this.getMembership(id, user.uid);
      const isActiveMember = membership?.status === "ACTIVE";
      group.isMember = isActiveMember;
      group.userRole = isActiveMember ? membership.role : undefined;
    }

    // Get member count
    const members = await this.firebaseService.getDocuments(this.GROUP_MEMBERS_COLLECTION, [
      { field: "groupId", operator: "==", value: id },
      { field: "status", operator: "==", value: "ACTIVE" },
    ]);
    group.memberCount = members.length;

    return { success: true, data: group, message: "Group retrieved successfully" };
  }

  async updateGroup(id: string, updateGroupDto: UpdateGroupDto, user: AuthUser) {
    const group = await this.firebaseService.getDocument(this.GROUPS_COLLECTION, id);
    if (!group) {
      throw new NotFoundException("Group not found");
    }

    const membership = await this.getMembership(id, user.uid);
    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      throw new ForbiddenException("Only group owner or admin can update group");
    }

    await this.firebaseService.updateDocument(this.GROUPS_COLLECTION, id, updateGroupDto);
    const updatedGroup = await this.firebaseService.getDocument(this.GROUPS_COLLECTION, id);
    return { success: true, data: updatedGroup, message: "Group updated successfully" };
  }

  async deleteGroup(id: string, user: AuthUser) {
    const group = await this.firebaseService.getDocument(this.GROUPS_COLLECTION, id);
    if (!group) {
      throw new NotFoundException("Group not found");
    }

    const membership = await this.getMembership(id, user.uid);
    if (!membership || membership.role !== "OWNER") {
      throw new ForbiddenException("Only group owner can delete group");
    }

    await this.firebaseService.updateDocument(this.GROUPS_COLLECTION, id, { status: "DELETED" });
    return { success: true, data: null, message: "Group deleted successfully" };
  }

  // ==================== MEMBERSHIP ====================

  async joinGroup(groupId: string, user: AuthUser) {
    const group = await this.firebaseService.getDocument(this.GROUPS_COLLECTION, groupId);
    if (!group) {
      throw new NotFoundException("Group not found");
    }
    if (group.status !== "ACTIVE") {
      throw new BadRequestException("Group is not active");
    }

    // Check if already member
    const existing = await this.getMembership(groupId, user.uid);
    if (existing) {
      if (existing.status === "ACTIVE") {
        return { success: true, message: "Already a member of this group" };
      }
      // Reactivate if previously left
      await this.firebaseService.updateDocument(this.GROUP_MEMBERS_COLLECTION, existing.id, {
        status: "ACTIVE",
        joinedAt: new Date().toISOString(),
      });
      await this.incrementMemberCount(groupId);
      return { success: true, message: "Rejoined group successfully" };
    }

    // Check join permissions
    if (group.visibility === GroupVisibility.INVITE_ONLY) {
      throw new ForbiddenException("This group is invite-only");
    }

    await this.firebaseService.createDocument(this.GROUP_MEMBERS_COLLECTION, {
      groupId,
      userId: user.uid,
      role: GroupMemberRole.MEMBER,
      status: "ACTIVE",
      joinedAt: new Date().toISOString(),
    });

    await this.incrementMemberCount(groupId);
    return { success: true, message: "Joined group successfully" };
  }

  async createGroupInvitation(groupId: string, user: AuthUser) {
    const group = await this.firebaseService.getDocument(this.GROUPS_COLLECTION, groupId);
    if (!group || group.status !== "ACTIVE") throw new NotFoundException("Group not found");

    const membership = await this.getMembership(groupId, user.uid);
    if (!membership || membership.status !== "ACTIVE" || !["OWNER", "ADMIN"].includes(membership.role)) {
      throw new ForbiddenException("Only group admins can create invitation links");
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await this.firebaseService.createDocument(this.GROUP_INVITATIONS_COLLECTION, {
      groupId,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      createdBy: user.uid,
      expiresAt,
      revokedAt: null,
    });

    return { success: true, data: { token, expiresAt }, message: "Invitation link created successfully" };
  }

  async getGroupInvitation(token: string) {
    const invitation = await this.findGroupInvitation(token);
    this.assertInvitationValid(invitation);
    const group = await this.firebaseService.getDocument(this.GROUPS_COLLECTION, invitation.groupId);
    if (!group || group.status !== "ACTIVE") throw new NotFoundException("Invited group not found");

    return {
      success: true,
      data: {
        group: {
          id: group.id,
          name: group.name,
          description: group.description || "",
          topic: group.topic,
          imageUrl: group.imageUrl || "",
          memberCount: group.memberCount || 0,
        },
        expiresAt: invitation.expiresAt,
      },
      message: "Invitation is valid",
    };
  }

  async joinGroupByInvitation(token: string, user: AuthUser) {
    const invitation = await this.findGroupInvitation(token);
    this.assertInvitationValid(invitation);
    const group = await this.firebaseService.getDocument(this.GROUPS_COLLECTION, invitation.groupId);
    if (!group || group.status !== "ACTIVE") throw new NotFoundException("Invited group not found");

    const existing = await this.getMembership(group.id, user.uid);
    if (existing?.status === "ACTIVE") {
      return { success: true, data: { groupId: group.id }, message: "Already a member of this group" };
    }
    if (existing) {
      await this.firebaseService.updateDocument(this.GROUP_MEMBERS_COLLECTION, existing.id, {
        role: GroupMemberRole.MEMBER,
        status: "ACTIVE",
        joinedAt: new Date().toISOString(),
      });
    } else {
      await this.firebaseService.createDocument(this.GROUP_MEMBERS_COLLECTION, {
        groupId: group.id,
        userId: user.uid,
        role: GroupMemberRole.MEMBER,
        status: "ACTIVE",
        joinedAt: new Date().toISOString(),
      });
    }
    await this.incrementMemberCount(group.id);

    return { success: true, data: { groupId: group.id }, message: "Joined group successfully" };
  }

  async leaveGroup(groupId: string, user: AuthUser) {
    const membership = await this.getMembership(groupId, user.uid);
    if (!membership) {
      throw new NotFoundException("Not a member of this group");
    }
    if (membership.role === "OWNER") {
      throw new BadRequestException("Owner cannot leave. Transfer ownership first.");
    }

    await this.firebaseService.updateDocument(this.GROUP_MEMBERS_COLLECTION, membership.id, {
      status: "LEFT",
    });
    await this.decrementMemberCount(groupId);
    return { success: true, message: "Left group successfully" };
  }

  async getMembers(groupId: string, user: AuthUser, query: PaginationDto) {
    await this.checkGroupAccess(groupId, user);

    const filters = [
      { field: "groupId", operator: "==", value: groupId },
      { field: "status", operator: "==", value: "ACTIVE" },
    ];

    const members = await this.firebaseService.getDocuments(
      this.GROUP_MEMBERS_COLLECTION,
      filters,
      { field: "joinedAt", direction: "asc" },
    );

    // Enrich with user data
    const enriched = await Promise.all(
      members.map(async (m) => {
        const userDoc = await this.firebaseService.getDocument("users", m.userId);
        return {
          ...m,
          user: userDoc
            ? {
                id: userDoc.id,
                name: userDoc.name,
                email: userDoc.email,
                username: (userDoc.username || userDoc.email?.split("@")[0] || userDoc.name || "user")
                  .toLowerCase()
                  .replace(/[^a-z0-9_.-]/g, "") || "user",
              }
            : null,
        };
      }),
    );

    return { success: true, data: enriched, message: "Members retrieved successfully" };
  }

  async updateMemberRole(groupId: string, targetUserId: string, dto: UpdateMemberRoleDto, user: AuthUser) {
    const group = await this.firebaseService.getDocument(this.GROUPS_COLLECTION, groupId);
    if (!group) throw new NotFoundException("Group not found");

    const requesterMembership = await this.getMembership(groupId, user.uid);
    if (!requesterMembership || !["OWNER", "ADMIN"].includes(requesterMembership.role)) {
      throw new ForbiddenException("Only owner or admin can change roles");
    }

    // Owner can't be demoted by admin
    const targetMembership = await this.getMembership(groupId, targetUserId);
    if (!targetMembership) throw new NotFoundException("Target user is not a member");
    if (targetMembership.role === "OWNER" && requesterMembership.role !== "OWNER") {
      throw new ForbiddenException("Cannot change owner role");
    }

    // Admin can't promote to owner
    if (dto.role === "OWNER" && requesterMembership.role !== "OWNER") {
      throw new ForbiddenException("Only owner can promote to owner");
    }

    await this.firebaseService.updateDocument(this.GROUP_MEMBERS_COLLECTION, targetMembership.id, {
      role: dto.role,
    });

    // Log moderation action
    await this.logModerationAction({
      moderatorId: user.uid,
      targetUserId,
      groupId,
      action: `ROLE_CHANGED_TO_${dto.role}`,
      reason: `Role updated by ${requesterMembership.role}`,
    });

    return { success: true, message: "Member role updated successfully" };
  }

  async removeMember(groupId: string, targetUserId: string, user: AuthUser) {
    const group = await this.firebaseService.getDocument(this.GROUPS_COLLECTION, groupId);
    if (!group) throw new NotFoundException("Group not found");

    const requesterMembership = await this.getMembership(groupId, user.uid);
    if (!requesterMembership || !["OWNER", "ADMIN"].includes(requesterMembership.role)) {
      throw new ForbiddenException("Only owner or admin can remove members");
    }

    const targetMembership = await this.getMembership(groupId, targetUserId);
    if (!targetMembership) throw new NotFoundException("Target user is not a member");

    // Can't remove owner
    if (targetMembership.role === "OWNER") {
      throw new ForbiddenException("Cannot remove group owner");
    }

    // Admin can't remove admin (only owner can)
    if (targetMembership.role === "ADMIN" && requesterMembership.role !== "OWNER") {
      throw new ForbiddenException("Only owner can remove admin");
    }

    await this.firebaseService.updateDocument(this.GROUP_MEMBERS_COLLECTION, targetMembership.id, {
      status: "REMOVED",
    });
    await this.decrementMemberCount(groupId);

    await this.logModerationAction({
      moderatorId: user.uid,
      targetUserId,
      groupId,
      action: "MEMBER_REMOVED",
      reason: "Removed by group admin/owner",
    });

    return { success: true, message: "Member removed successfully" };
  }

  async inviteMember(groupId: string, dto: InviteMemberDto, user: AuthUser) {
    const group = await this.firebaseService.getDocument(this.GROUPS_COLLECTION, groupId);
    if (!group) throw new NotFoundException("Group not found");

    const requesterMembership = await this.getMembership(groupId, user.uid);
    if (!requesterMembership || !["OWNER", "ADMIN"].includes(requesterMembership.role)) {
      throw new ForbiddenException("Only owner or admin can invite members");
    }

    if (!dto.userId && !dto.email) {
      throw new BadRequestException("Provide either userId or email");
    }

    const targetUser = dto.userId
      ? await this.firebaseService.getDocument("users", dto.userId)
      : (
          await this.firebaseService.getDocuments("users", [
            { field: "email", operator: "==", value: dto.email?.trim().toLowerCase() },
          ])
        )[0] || null;
    if (!targetUser) throw new NotFoundException("User not found");

    // Check if already member
    const existing = await this.getMembership(groupId, targetUser.id);
    if (existing && existing.status === "ACTIVE") {
      throw new BadRequestException("User is already a member");
    }

    if (existing) {
      await this.firebaseService.updateDocument(this.GROUP_MEMBERS_COLLECTION, existing.id, {
        role: dto.role || GroupMemberRole.MEMBER,
        status: "ACTIVE",
        joinedAt: new Date().toISOString(),
        invitedBy: user.uid,
      });
    } else {
      await this.firebaseService.createDocument(this.GROUP_MEMBERS_COLLECTION, {
        groupId,
        userId: targetUser.id,
        role: dto.role || GroupMemberRole.MEMBER,
        status: "ACTIVE",
        joinedAt: new Date().toISOString(),
        invitedBy: user.uid,
      });
    }

    await this.incrementMemberCount(groupId);
    return { success: true, message: "Member invited successfully" };
  }

  // ==================== MESSAGING ====================

  async sendMessage(groupId: string, dto: SendMessageDto, user: AuthUser) {
    await this.checkGroupAccess(groupId, user);

    const messageId = await this.firebaseService.createDocument(this.MESSAGES_COLLECTION, {
      groupId,
      senderId: user.uid,
      text: dto.text,
      status: "SENT",
      createdAt: new Date().toISOString(),
    });

    const message = await this.firebaseService.getDocument(this.MESSAGES_COLLECTION, messageId);
    return { success: true, data: message, message: "Message sent successfully" };
  }

  async getMessages(groupId: string, user: AuthUser, query: PaginationDto) {
    await this.checkGroupAccess(groupId, user);

    const { page = 1, limit = 50, sortBy = "createdAt", sortOrder = "asc" } = query;

    const filters = [{ field: "groupId", operator: "==", value: groupId }];
    const messages = await this.firebaseService.getDocuments(
      this.MESSAGES_COLLECTION,
      filters,
      { field: sortBy, direction: sortOrder },
      limit * page,
    );

    // Enrich with sender data
    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const sender = await this.firebaseService.getDocument("users", msg.senderId);
        return { ...msg, sender: sender ? { id: sender.id, name: sender.name } : null };
      }),
    );

    const total = enriched.length;
    const offset = (page - 1) * limit;
    const paginated = enriched.slice(offset, offset + limit);

    return {
      success: true,
      data: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      message: "Messages retrieved successfully",
    };
  }

  async deleteMessage(messageId: string, user: AuthUser) {
    const message = await this.firebaseService.getDocument(this.MESSAGES_COLLECTION, messageId);
    if (!message) throw new NotFoundException("Message not found");

    const membership = await this.getMembership(message.groupId, user.uid);
    const isSender = message.senderId === user.uid;
    const isAdmin = membership && ["OWNER", "ADMIN"].includes(membership.role);

    if (!isSender && !isAdmin) {
      throw new ForbiddenException("You can only delete your own messages or be admin");
    }

    await this.firebaseService.updateDocument(this.MESSAGES_COLLECTION, messageId, {
      status: "DELETED",
      deletedBy: user.uid,
      deletedAt: new Date().toISOString(),
    });

    return { success: true, message: "Message deleted successfully" };
  }

  // ==================== MODERATION ====================

  async createReport(dto: CreateReportDto, user: AuthUser) {
    // Verify target exists
    if (dto.targetType === ReportTargetType.MESSAGE) {
      const msg = await this.firebaseService.getDocument(this.MESSAGES_COLLECTION, dto.targetId);
      if (!msg) throw new NotFoundException("Message not found");
      await this.checkGroupAccess(msg.groupId, user);
    } else {
      const membership = await this.getMembership(dto.targetId, user.uid); // targetId is groupId for member reports
      if (!membership) throw new NotFoundException("Group not found or not a member");
    }

    const reportId = await this.firebaseService.createDocument(this.REPORTS_COLLECTION, {
      ...dto,
      reporterId: user.uid,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    });

    const report = await this.firebaseService.getDocument(this.REPORTS_COLLECTION, reportId);
    return { success: true, data: report, message: "Report submitted successfully" };
  }

  async getReports(groupId: string, user: AuthUser, query: PaginationDto) {
    const membership = await this.getMembership(groupId, user.uid);
    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      throw new ForbiddenException("Only group admin can view reports");
    }

    const filters = [{ field: "groupId", operator: "==", value: groupId }]; // We need to add groupId to reports
    // For now, filter by target being in this group's messages/members
    const reports = await this.firebaseService.getDocuments(
      this.REPORTS_COLLECTION,
      [],
      { field: "createdAt", direction: "desc" },
    );

    // Filter reports related to this group (simplified)
    const groupReports = reports.filter((r) => {
      // In real impl, add groupId to report or join with target
      return true;
    });

    return { success: true, data: groupReports, message: "Reports retrieved successfully" };
  }

  async reviewReport(reportId: string, dto: any, user: AuthUser) {
    const report = await this.firebaseService.getDocument(this.REPORTS_COLLECTION, reportId);
    if (!report) throw new NotFoundException("Report not found");

    // Check if user is admin of the target group
    // Simplified: assume platform moderator or group admin
    if (user.role !== "SUPER_ADMIN") {
      // Would need to verify group admin
    }

    await this.firebaseService.updateDocument(this.REPORTS_COLLECTION, reportId, {
      status: "REVIEWED",
      reviewerId: user.uid,
      resolution: dto.resolution,
      reviewedAt: new Date().toISOString(),
    });

    // Log action
    await this.logModerationAction({
      moderatorId: user.uid,
      targetUserId: report.targetId,
      groupId: report.groupId || "unknown",
      action: "REPORT_REVIEWED",
      reason: dto.resolution || "Report reviewed",
    });

    return { success: true, message: "Report reviewed successfully" };
  }

  async getModerationHistory(groupId: string, user: AuthUser) {
    const membership = await this.getMembership(groupId, user.uid);
    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      throw new ForbiddenException("Only group admin can view moderation history");
    }

    const actions = await this.firebaseService.getDocuments(
      this.MODERATION_ACTIONS_COLLECTION,
      [{ field: "groupId", operator: "==", value: groupId }],
      { field: "createdAt", direction: "desc" },
    );

    return { success: true, data: actions, message: "Moderation history retrieved" };
  }

  // ==================== HELPERS ====================

  private async getMembership(groupId: string, userId: string) {
    const members = await this.firebaseService.getDocuments(this.GROUP_MEMBERS_COLLECTION, [
      { field: "groupId", operator: "==", value: groupId },
      { field: "userId", operator: "==", value: userId },
    ]);
    return members[0] || null;
  }

  private async getUserMemberships(userId: string) {
    return this.firebaseService.getDocuments(this.GROUP_MEMBERS_COLLECTION, [
      { field: "userId", operator: "==", value: userId },
      { field: "status", operator: "==", value: "ACTIVE" },
    ]);
  }

  private async findGroupInvitation(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      throw new NotFoundException("Invitation link is invalid");
    }
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const invitations = await this.firebaseService.getDocuments(
      this.GROUP_INVITATIONS_COLLECTION,
      [{ field: "tokenHash", operator: "==", value: tokenHash }],
      undefined,
      1,
    );
    if (!invitations[0]) throw new NotFoundException("Invitation link is invalid");
    return invitations[0];
  }

  private assertInvitationValid(invitation: any) {
    if (invitation.revokedAt) throw new GoneException("Invitation link has been revoked");
    const expiresAt = Date.parse(invitation.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      throw new GoneException("Invitation link has expired");
    }
  }

  private async checkGroupAccess(groupId: string, user: AuthUser) {
    const group = await this.firebaseService.getDocument(this.GROUPS_COLLECTION, groupId);
    if (!group) throw new NotFoundException("Group not found");

    if (group.visibility !== GroupVisibility.PUBLIC) {
      const membership = await this.getMembership(groupId, user.uid);
      if (!membership || membership.status !== "ACTIVE") {
        throw new ForbiddenException("Not a member of this group");
      }
    }
  }

  private async incrementMemberCount(groupId: string) {
    const group = await this.firebaseService.getDocument(this.GROUPS_COLLECTION, groupId);
    if (group) {
      await this.firebaseService.updateDocument(this.GROUPS_COLLECTION, groupId, {
        memberCount: (group.memberCount || 0) + 1,
      });
    }
  }

  private async decrementMemberCount(groupId: string) {
    const group = await this.firebaseService.getDocument(this.GROUPS_COLLECTION, groupId);
    if (group) {
      await this.firebaseService.updateDocument(this.GROUPS_COLLECTION, groupId, {
        memberCount: Math.max(0, (group.memberCount || 1) - 1),
      });
    }
  }

  private async logModerationAction(data: {
    moderatorId: string;
    targetUserId: string;
    groupId: string;
    action: string;
    reason: string;
  }) {
    await this.firebaseService.createDocument(this.MODERATION_ACTIONS_COLLECTION, {
      ...data,
      createdAt: new Date().toISOString(),
    });
  }
}
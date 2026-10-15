import { Injectable, NotFoundException } from "@nestjs/common";
import { FirebaseService } from "../common/services/firebase.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { PaginationDto } from "../common/dto/pagination.dto";

@Injectable()
export class NotificationsService {
  private readonly COLLECTION = "notifications";

  constructor(private readonly firebaseService: FirebaseService) {}

  async findAll(query: PaginationDto, user: AuthUser) {
    const { page = 1, limit = 10 } = query;

    const filters: { field: string; operator: any; value: unknown }[] = [
      { field: "userId", operator: "==", value: user.uid },
    ];

    const documents = await this.firebaseService.getDocuments(
      this.COLLECTION,
      filters,
      { field: "createdAt", direction: "desc" },
      limit * page,
    );

    const total = documents.length;
    const offset = (page - 1) * limit;
    const paginatedDocs = documents.slice(offset, offset + limit);

    return {
      success: true,
      data: paginatedDocs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      message: "Notifications retrieved successfully",
    };
  }

  async markRead(id: string, user: AuthUser) {
    const notification = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    await this.firebaseService.updateDocument(this.COLLECTION, id, {
      read: true,
    });

    return {
      success: true,
      data: null,
      message: "Notification marked as read",
    };
  }

  async markAllRead(user: AuthUser) {
    const notifications = await this.firebaseService.getDocuments(
      this.COLLECTION,
      [
        { field: "userId", operator: "==", value: user.uid },
        { field: "read", operator: "==", value: false },
      ],
    );

    // Use batch if Firebase is ready, otherwise update one by one (mock mode)
    if (this.firebaseService.isFirebaseReady()) {
      const batch = this.firebaseService.getFirestore().batch();
      notifications.forEach((notification) => {
        const ref = this.firebaseService
          .getFirestore()
          .collection(this.COLLECTION)
          .doc(notification.id);
        batch.update(ref, { read: true });
      });
      await batch.commit();
    } else {
      for (const notification of notifications) {
        await this.firebaseService.updateDocument(this.COLLECTION, notification.id, {
          read: true,
        });
      }
    }

    return {
      success: true,
      data: null,
      message: "All notifications marked as read",
    };
  }
}

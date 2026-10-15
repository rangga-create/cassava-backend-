import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FirebaseService } from "../common/services/firebase.service";
import { EmailService } from "../email/email.service";
import { CreateContactDto, ContactSubject } from "./dto/contact.dto";

@Injectable()
export class ContactService {
  private readonly COLLECTION = "contactMessages";
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async submitContactForm(dto: CreateContactDto) {
    const subjectLabels: Record<string, string> = {
      product_inquiry: "Product Inquiry",
      pricing: "Pricing Request",
      bulk_order: "Bulk Order",
      partnership: "Partnership",
      export_consultation: "Export Consultation",
      other: "Other",
    };

    // 1. Save contact message to Firestore
    const contactId = await this.firebaseService.createDocument(
      this.COLLECTION,
      {
        ...dto,
        status: "NEW",
        read: false,
        replied: false,
      },
    );
    this.logger.log(`Contact message saved: ${contactId}`);

    // 2. Send confirmation email to the user
    await this.emailService.sendContactConfirmation(
      dto.email,
      dto.name,
      subjectLabels[dto.subject] || dto.subject,
    );

    // 3. Send notification email to admin
    const adminEmail = this.configService.get<string>(
      "ADMIN_EMAIL",
      "ranggasaputraaaa453@gmail.com",
    );
    await this.emailService.sendAdminNotification(adminEmail, {
      name: dto.name,
      email: dto.email,
      company: dto.company,
      phone: dto.phone,
      subject: dto.subject,
      message: dto.message,
    });

    // 4. Create in-app notification for admin users
    try {
      const adminUsers = await this.firebaseService.getDocuments("users", [
        { field: "role", operator: "in", value: ["OWNER", "MANAGER"] },
      ]);

      const messageSnippet =
        dto.message.length > 100
          ? dto.message.substring(0, 100) + "..."
          : dto.message;

      for (const admin of adminUsers) {
        await this.firebaseService.createDocument("notifications", {
          userId: admin.id,
          companyId: admin.companyId || "company-dev-001",
          type: "INFO",
          title: `New Contact: ${subjectLabels[dto.subject] || dto.subject}`,
          message: `From: ${dto.name} (${dto.email}) - ${messageSnippet}`,
          read: false,
          contactId,
          contactData: {
            name: dto.name,
            email: dto.email,
            company: dto.company || null,
            phone: dto.phone || null,
            subject: dto.subject,
            message: dto.message,
          },
        });
      }
      this.logger.log(
        `In-app notifications created for ${adminUsers.length} admin(s)`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to create in-app notifications: ${error.message}`,
      );
    }

    return {
      success: true,
      data: { id: contactId },
      message:
        "Your message has been sent successfully. We will get back to you within 24 hours.",
    };
  }
}

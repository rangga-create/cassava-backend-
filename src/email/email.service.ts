import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("RESEND_API_KEY");
    this.fromEmail = this.configService.get<string>(
      "EMAIL_FROM",
      "INDOCASSAVA <onboarding@resend.dev>",
    );
    this.resend = new Resend(apiKey);
  }

  async sendContactConfirmation(to: string, name: string, subject: string) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `We received your message - ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #16a34a; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 20px;">INDOCASSAVA</h1>
            </div>
            <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #111827; margin-top: 0;">Hi ${name},</h2>
              <p style="color: #4b5563; line-height: 1.6;">
                Thank you for contacting INDOCASSAVA! We have received your message regarding <strong>${subject}</strong>.
              </p>
              <p style="color: #4b5563; line-height: 1.6;">
                Our team will review your inquiry and get back to you within <strong>24 hours</strong> during business days.
              </p>
              <div style="background-color: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">If you have urgent questions, feel free to contact us directly:</p>
                <p style="color: #111827; margin: 5px 0 0 0;">📞 +62 31 123 4567</p>
                <p style="color: #111827; margin: 5px 0 0 0;">📱 +62 812 3456 7890 (WhatsApp)</p>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                This is an automated confirmation email from INDOCASSAVA. Please do not reply directly to this email.
              </p>
            </div>
          </div>
        `,
      });

      if (error) {
        this.logger.error(`Failed to send confirmation email: ${error.message}`);
        return false;
      }

      this.logger.log(`Confirmation email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send confirmation email: ${error.message}`);
      return false;
    }
  }

  async sendAdminNotification(
    adminEmail: string,
    formData: {
      name: string;
      email: string;
      company?: string;
      phone?: string;
      subject: string;
      message: string;
    },
  ) {
    try {
      const subjectLabels: Record<string, string> = {
        product_inquiry: "Product Inquiry",
        pricing: "Pricing Request",
        bulk_order: "Bulk Order",
        partnership: "Partnership",
        export_consultation: "Export Consultation",
        other: "Other",
      };

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: adminEmail,
        subject: `[New Contact] ${subjectLabels[formData.subject] || formData.subject} from ${formData.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #16a34a; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 20px;">📬 New Contact Form Submission</h1>
            </div>
            <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; width: 120px; vertical-align: top;"><strong>Name</strong></td>
                  <td style="padding: 10px 0; color: #111827;">${formData.name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; vertical-align: top;"><strong>Email</strong></td>
                  <td style="padding: 10px 0; color: #111827;"><a href="mailto:${formData.email}">${formData.email}</a></td>
                </tr>
                ${formData.company ? `
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; vertical-align: top;"><strong>Company</strong></td>
                  <td style="padding: 10px 0; color: #111827;">${formData.company}</td>
                </tr>` : ""}
                ${formData.phone ? `
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; vertical-align: top;"><strong>Phone</strong></td>
                  <td style="padding: 10px 0; color: #111827;">${formData.phone}</td>
                </tr>` : ""}
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; vertical-align: top;"><strong>Subject</strong></td>
                  <td style="padding: 10px 0; color: #111827;">${subjectLabels[formData.subject] || formData.subject}</td>
                </tr>
              </table>
              <div style="background-color: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; margin-top: 15px;">
                <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;"><strong>Message</strong></p>
                <p style="color: #111827; margin: 0; line-height: 1.6; white-space: pre-wrap;">${formData.message}</p>
              </div>
              <div style="margin-top: 20px; text-align: center;">
                <a href="mailto:${formData.email}?subject=Re: ${subjectLabels[formData.subject] || formData.subject}" style="display: inline-block; background-color: #16a34a; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Reply to ${formData.name}</a>
              </div>
            </div>
          </div>
        `,
      });

      if (error) {
        this.logger.error(`Failed to send admin notification: ${error.message}`);
        return false;
      }

      this.logger.log(`Admin notification sent to ${adminEmail}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send admin notification: ${error.message}`);
      return false;
    }
  }
}

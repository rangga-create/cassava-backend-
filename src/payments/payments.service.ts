import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { FirebaseService } from "../common/services/firebase.service";
import { ConfigService } from "@nestjs/config";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { PaymentStatus } from "./entities/payment.entity";

@Injectable()
export class PaymentsService {
  private readonly COLLECTION = "payments";
  private readonly snap: any;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly configService: ConfigService,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const midtrans = require("midtrans-client");
    const isProduction = this.configService.get("MIDTRANS_IS_PRODUCTION") === "true";
    const serverKey = this.configService.get("MIDTRANS_SERVER_KEY") || "";
    const clientKey = this.configService.get("MIDTRANS_CLIENT_KEY") || "";
    
    this.logger.log(`Midtrans Config: isProduction=${isProduction}, serverKey=${serverKey.substring(0, 15)}...`);
    
    this.snap = new midtrans.Snap({
      isProduction,
      serverKey,
      clientKey,
    });
  }

  async createPayment(dto: CreatePaymentDto, user: AuthUser) {
    // 1. Verify sales order exists and is CONFIRMED
    const order = await this.firebaseService.getDocument(
      "salesOrders",
      dto.salesOrderId,
    );
    if (!order) {
      throw new NotFoundException("Sales order not found");
    }
    if (order.status !== "CONFIRMED") {
      throw new BadRequestException(
        "Order must be in CONFIRMED status to process payment",
      );
    }

    // 2. Check if there's already a PENDING payment for this order
    const existingPayments = await this.firebaseService.getDocuments(
      this.COLLECTION,
      [
        { field: "salesOrderId", operator: "==", value: dto.salesOrderId },
        { field: "status", operator: "==", value: PaymentStatus.PENDING },
      ],
    );
    if (existingPayments.length > 0) {
      // Return existing snap token if still valid
      return {
        token: existingPayments[0].snapToken,
        paymentId: existingPayments[0].id,
      };
    }

    // 3. Create Midtrans transaction parameter
    const parameter = {
      transaction_details: {
        order_id: order.soNumber,
        gross_amount: dto.amount,
      },
      credit_card: { secure: true },
      customer_details: dto.customerDetails,
    };

    // 4. Get snap token from Midtrans
    this.logger.log(`Creating Midtrans transaction for order: ${order.soNumber}, amount: ${dto.amount}`);
    let transaction;
    try {
      transaction = await this.snap.createTransaction(parameter);
      this.logger.log(`Midtrans transaction created: token=${transaction.token?.substring(0, 20)}...`);
    } catch (error) {
      this.logger.error(`Midtrans API error: ${error.message}`);
      throw error;
    }

    // 5. Save payment record to Firestore
    const paymentId = await this.firebaseService.createDocument(
      this.COLLECTION,
      {
        companyId: user.companyId,
        salesOrderId: dto.salesOrderId,
        soNumber: order.soNumber,
        customerId: order.customerId,
        amount: dto.amount,
        currency: dto.currency,
        provider: "MIDTRANS",
        snapToken: transaction.token,
        status: PaymentStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    );

    this.logger.log(
      `Payment created for order ${order.soNumber}, paymentId: ${paymentId}`,
    );

    return { token: transaction.token, paymentId };
  }

  async handleWebhook(notification: any) {
    // 1. Verify notification signature
    const statusResponse = await this.snap.transaction.notification(
      notification,
    );

    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;
    const grossAmount = statusResponse.gross_amount;

    this.logger.log(
      `Webhook received for order: ${orderId}, status: ${transactionStatus}`,
    );

    // 2. Find payment record
    const payments = await this.firebaseService.getDocuments(this.COLLECTION, [
      { field: "soNumber", operator: "==", value: orderId },
    ]);

    if (payments.length === 0) {
      this.logger.warn(`Payment not found for order: ${orderId}`);
      return { status: "ok" };
    }

    const payment = payments[0];

    // 3. Idempotency check - if already PAID, skip
    if (payment.status === PaymentStatus.PAID) {
      this.logger.log(
        `Payment already PAID for order: ${orderId}, skipping`,
      );
      return { status: "ok" };
    }

    // 4. Verify amount
    if (parseFloat(grossAmount) !== payment.amount) {
      this.logger.error(
        `Amount mismatch for order: ${orderId}. Expected: ${payment.amount}, Got: ${grossAmount}`,
      );
      return { status: "error", message: "Amount mismatch" };
    }

    // 5. Process based on status
    if (
      transactionStatus === "capture" ||
      transactionStatus === "settlement"
    ) {
      if (fraudStatus === "accept" || !fraudStatus) {
        // Payment successful
        await this.processSuccessfulPayment(payment, statusResponse);
      }
    } else if (transactionStatus === "deny") {
      await this.updatePaymentStatus(
        payment.id,
        PaymentStatus.FAILED,
        statusResponse,
      );
    } else if (
      transactionStatus === "cancel" ||
      transactionStatus === "expire"
    ) {
      await this.updatePaymentStatus(
        payment.id,
        PaymentStatus.EXPIRED,
        statusResponse,
      );
    }
    // 'pending' status - do nothing, wait for next notification

    return { status: "ok" };
  }

  private async processSuccessfulPayment(payment: any, notification: any) {
    // 1. Update payment status to PAID
    await this.firebaseService.updateDocument(this.COLLECTION, payment.id, {
      status: PaymentStatus.PAID,
      providerTransactionId: notification.transaction_id,
      paymentMethod: notification.payment_type,
      notificationPayload: notification,
      updatedAt: new Date().toISOString(),
    });

    // 2. Update sales order status: CONFIRMED → PROCESSING
    await this.firebaseService.updateDocument(
      "salesOrders",
      payment.salesOrderId,
      {
        status: "PROCESSING",
        paymentStatus: "PAID",
        paymentId: payment.id,
        updatedAt: new Date().toISOString(),
      },
    );

    // 3. Create finance transaction: REVENUE
    await this.firebaseService.createDocument("transactions", {
      companyId: payment.companyId,
      type: "REVENUE",
      amount: payment.amount,
      currency: payment.currency,
      relatedType: "payment",
      relatedId: payment.id,
      salesOrderId: payment.salesOrderId,
      soNumber: payment.soNumber,
      description: `Payment received for ${payment.soNumber}`,
      provider: "MIDTRANS",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 4. Update customer.totalPurchase (first time only)
    const customer = await this.firebaseService.getDocument(
      "customers",
      payment.customerId,
    );
    if (customer) {
      await this.firebaseService.updateDocument(
        "customers",
        payment.customerId,
        {
          totalPurchase: (customer.totalPurchase || 0) + payment.amount,
          updatedAt: new Date().toISOString(),
        },
      );
    }

    this.logger.log(
      `Payment processed successfully for order: ${payment.soNumber}`,
    );
  }

  private async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    notification: any,
  ) {
    await this.firebaseService.updateDocument(this.COLLECTION, paymentId, {
      status,
      notificationPayload: notification,
      updatedAt: new Date().toISOString(),
    });
  }

  async getPaymentByOrderId(orderId: string) {
    const payments = await this.firebaseService.getDocuments(
      this.COLLECTION,
      [{ field: "salesOrderId", operator: "==", value: orderId }],
      { field: "createdAt", direction: "desc" },
      1,
    );
    return payments[0] || null;
  }
}

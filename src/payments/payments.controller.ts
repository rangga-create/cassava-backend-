import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiExcludeController } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import {
  CurrentUser,
  AuthUser,
} from "../common/decorators/current-user.decorator";
import { AuthGuard } from "../common/guards/auth.guard";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("create")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Create Midtrans Snap payment" })
  async createPayment(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.createPayment(dto, user);
  }

  @Post("webhook/midtrans")
  @HttpCode(HttpStatus.OK)
  async handleMidtransWebhook(@Body() notification: any) {
    return this.paymentsService.handleWebhook(notification);
  }

  @Get("status/:salesOrderId")
  @ApiOperation({ summary: "Get payment status for a sales order" })
  async getPaymentStatus(
    @Param("salesOrderId") salesOrderId: string,
  ) {
    const payment =
      await this.paymentsService.getPaymentByOrderId(salesOrderId);
    return {
      success: true,
      data: payment
        ? { status: payment.status, paymentId: payment.id }
        : null,
    };
  }
}

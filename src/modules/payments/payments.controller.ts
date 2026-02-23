import { Controller, Post, Headers, Req, HttpCode } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('webhooks')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('paystack')
  @HttpCode(200)
  async handlePaystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: any,
  ) {
    await this.paymentsService.handleWebhook(signature, req.rawBody);
    return { received: true };
  }
}

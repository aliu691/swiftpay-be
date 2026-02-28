import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  Get,
  Param,
} from '@nestjs/common';
import { ApiResponse } from 'src/utils/api-response';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('webhooks/paystack')
  @HttpCode(200)
  async handlePaystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: any,
  ) {
    await this.paymentsService.handleWebhook(signature, req.rawBody);
    return { received: true };
  }

  @Get('verify/:reference')
  async verifyPayment(@Param('reference') reference: string) {
    const result = await this.paymentsService.verifyPayment(reference);

    return ApiResponse.success('Payment verified', result);
  }
}

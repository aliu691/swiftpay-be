import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly baseUrl = 'https://api.zeptomail.com/v1.1/email';

  async sendEmail(options: { to: string; subject: string; html: string }) {
    try {
      await axios.post(
        this.baseUrl,
        {
          from: {
            address: process.env.ZEPTO_FROM_EMAIL!,
            name: process.env.ZEPTO_FROM_NAME || 'SwiftPay',
          },
          to: [
            {
              email_address: {
                address: options.to,
              },
            },
          ],
          subject: options.subject,
          htmlbody: options.html,
        },
        {
          headers: {
            Authorization: `Zoho-enczapikey ${process.env.ZEPTO_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Email sent to ${options.to}`);
    } catch (error: any) {
      this.logger.error(
        `ZeptoMail error sending to ${options.to}`,
        error?.response?.data || error.message,
      );
    }
  }
}

import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MailService {
  async sendResetEmail(to: string, token: string) {
    await axios.post(
      'https://api.zeptomail.com/v1.1/email',
      {
        from: {
          address: process.env.ZEPTO_FROM_EMAIL,
        },
        to: [
          {
            email_address: {
              address: to,
            },
          },
        ],
        subject: 'Password Reset',
        htmlbody: `<p>Reset link:</p>
          <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}">
            Reset Password
          </a>`,
      },
      {
        headers: {
          Authorization: `Zoho-enczapikey ${process.env.ZEPTO_API_KEY}`,
        },
      },
    );
  }
}

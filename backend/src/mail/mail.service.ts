import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor(
    private configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',

      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
  }

  async sendOtpEmail(email: string, otp: string) {
    await this.transporter.sendMail({
      from: this.configService.get<string>('EMAIL_USER'),

      to: email,

      subject: 'RideX Email Verification',

      html: `
        <div style="font-family:Arial;padding:20px">
          <h2>RideX</h2>

          <p>Your verification code is:</p>

          <h1 style="letter-spacing:5px;color:#2563eb;">
            ${otp}
          </h1>

          <p>This code expires in <b>5 minutes</b>.</p>

          <p>If you didn't create this account, ignore this email.</p>
        </div>
      `,
    });
  }

  async sendResetOtpEmail(email: string, otp: string) {
    await this.transporter.sendMail({
      from: this.configService.get<string>('EMAIL_USER'),
      to: email,
      subject: 'RideX Password Reset',
      html: `
        <div style="font-family:Arial;padding:20px">
          <h2>RideX</h2>
          <p>Your password reset code is:</p>
          <h1 style="letter-spacing:5px;color:#2563eb;">${otp}</h1>
          <p>This code expires in <b>5 minutes</b>.</p>
          <p>If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
  }
}
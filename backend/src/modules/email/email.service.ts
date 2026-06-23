import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      const emailConfig = this.configService.get('email');
      if (!emailConfig || !emailConfig.smtp) {
        this.logger.warn('Email configuration not found or incomplete. Email service disabled.');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure,
        auth:
          emailConfig.smtp.auth.user && emailConfig.smtp.auth.pass
            ? {
                user: emailConfig.smtp.auth.user,
                pass: emailConfig.smtp.auth.pass,
              }
            : undefined,
      });

      this.logger.log(
        `✅ Email service initialized with SMTP server: ${emailConfig.smtp.host}:${emailConfig.smtp.port}`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize email service:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Email service not initialized. Email not sent.');
      return false;
    }

    try {
      const emailConfig = this.configService.get('email') || {};
      const fromAddress = emailConfig?.from?.address;
      const fromName = emailConfig?.from?.name;
      const fromValue = fromName && fromAddress ? `${fromName} <${fromAddress}>` : fromAddress;
      const result = await this.transporter.sendMail({
        from: fromValue,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(`✅ Email sent to ${options.to}. Message ID: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  async sendVerificationEmail(email: string, token: string, baseUrl?: string): Promise<boolean> {
    const emailConfig = this.configService.get('email') || {};
    const verificationTemplate = emailConfig?.templates?.verification || {};
    const expiryMinutes = verificationTemplate?.expiryMinutes ?? 60;
    const subject = verificationTemplate?.subject || 'Verify your email - CareDroid';
    const resolvedBaseUrl = baseUrl || this.getFrontendBaseUrl();
    const verificationLink = `${resolvedBaseUrl}/verify-email?token=${token}`;
    const html = `
      <h2>Verify your email</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${verificationLink}">Verify Email</a>
      <p>Or copy this link: ${verificationLink}</p>
      <p>This link expires in ${expiryMinutes} minutes.</p>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text: `Verify your email: ${verificationLink}`,
    });
  }

  async sendPasswordResetEmail(email: string, token: string, baseUrl?: string): Promise<boolean> {
    const emailConfig = this.configService.get('email') || {};
    const resetTemplate = emailConfig?.templates?.passwordReset || {};
    const expiryMinutes = resetTemplate?.expiryMinutes ?? 30;
    const subject = resetTemplate?.subject || 'Reset your password - CareDroid';
    const resolvedBaseUrl = baseUrl || this.getFrontendBaseUrl();
    const resetLink = `${resolvedBaseUrl}/reset-password?token=${token}`;
    const html = `
      <h2>Reset your password</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>Or copy this link: ${resetLink}</p>
      <p>This link expires in ${expiryMinutes} minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text: `Reset your password: ${resetLink}`,
    });
  }

  async sendTwoFactorCode(email: string, code: string): Promise<boolean> {
    const emailConfig = this.configService.get('email') || {};
    const subject =
      emailConfig?.templates?.twoFactorCode?.subject ||
      'Your two-factor authentication code - CareDroid';
    const html = `
      <h2>Two-Factor Authentication Code</h2>
      <p>Your authentication code is:</p>
      <h1 style="letter-spacing: 2px;">${code}</h1>
      <p>This code expires in 5 minutes.</p>
      <p>Do not share this code with anyone.</p>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text: `Your 2FA code: ${code}`,
    });
  }

  async sendMagicLinkEmail(email: string, token: string, baseUrl?: string): Promise<boolean> {
    const resolvedBaseUrl = baseUrl || this.getFrontendBaseUrl();
    const magicLink = `${resolvedBaseUrl}/auth/magic-link?token=${encodeURIComponent(token)}`;
    const html = `
      <h2>Sign in to CareDroid</h2>
      <p>Click the link below to sign in:</p>
      <a href="${magicLink}">Sign in</a>
      <p>Or copy this link: ${magicLink}</p>
      <p>This link expires in 15 minutes.</p>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Your CareDroid sign-in link',
      html,
      text: `Sign in: ${magicLink}`,
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const html = `
      <h2>Welcome to CareDroid!</h2>
      <p>Hello ${name},</p>
      <p>Thank you for registering with CareDroid Clinical Companion.</p>
      <p>Your account is now active and you can start exploring our clinical tools.</p>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Welcome to CareDroid - CareDroid',
      html,
      text: `Welcome to CareDroid, ${name}!`,
    });
  }

  private getFrontendBaseUrl(): string {
    const emailConfig = this.configService.get<any>('email');
    return emailConfig?.frontendUrl || 'http://localhost:8000';
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';

jest.mock('nodemailer');

describe('EmailService', () => {
  const mockSendMail = jest.fn();
  const mockCreateTransport = nodemailer.createTransport as jest.Mock;

  const fullEmailConfig = {
    smtp: {
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: { user: 'apikey', pass: 'test-api-key' },
    },
    from: { name: 'CareDroid', address: 'noreply@caredroid.health' },
    templates: {
      verification: { subject: 'Verify your email - CareDroid', expiryMinutes: 60 },
      passwordReset: { subject: 'Reset your password - CareDroid', expiryMinutes: 30 },
      twoFactorCode: { subject: 'Your two-factor authentication code' },
    },
    frontendUrl: 'https://app.caredroid.health',
  };

  const buildService = (configOverride: Record<string, unknown> | undefined): EmailService => {
    const mockConfigService = {
      get: jest.fn((key: string) => (key === 'email' ? configOverride : undefined)),
    };
    return new EmailService(mockConfigService as unknown as ConfigService);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateTransport.mockReturnValue({ sendMail: mockSendMail });
  });

  it('should be defined', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: { get: jest.fn(() => fullEmailConfig) } },
      ],
    }).compile();

    expect(module.get<EmailService>(EmailService)).toBeDefined();
  });

  describe('initializeTransporter', () => {
    it('creates a transporter with the configured SMTP host/port/auth', () => {
      buildService(fullEmailConfig);

      expect(mockCreateTransport).toHaveBeenCalledWith({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: { user: 'apikey', pass: 'test-api-key' },
      });
    });

    it('omits auth when user/pass are not both present', () => {
      buildService({
        ...fullEmailConfig,
        smtp: { host: 'localhost', port: 1025, secure: false, auth: {} },
      });

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ auth: undefined }),
      );
    });

    it('does not create a transporter when email config is missing', () => {
      buildService(undefined);
      expect(mockCreateTransport).not.toHaveBeenCalled();
    });

    it('does not create a transporter when smtp config is missing', () => {
      buildService({});
      expect(mockCreateTransport).not.toHaveBeenCalled();
    });
  });

  describe('sendEmail', () => {
    it('returns false without sending when the transporter was never initialized', async () => {
      const service = buildService(undefined);
      const result = await service.sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' });

      expect(result).toBe(false);
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('sends mail with the configured from address and returns true on success', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'msg-1' });
      const service = buildService(fullEmailConfig);

      const result = await service.sendEmail({
        to: 'patient@example.com',
        subject: 'Subject line',
        html: '<p>Body</p>',
        text: 'Body',
      });

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'CareDroid <noreply@caredroid.health>',
        to: 'patient@example.com',
        subject: 'Subject line',
        html: '<p>Body</p>',
        text: 'Body',
      });
    });

    it('returns false and does not throw when the transport rejects', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP connection refused'));
      const service = buildService(fullEmailConfig);

      const result = await service.sendEmail({
        to: 'patient@example.com',
        subject: 'Subject',
        html: '<p>Body</p>',
      });

      expect(result).toBe(false);
    });
  });

  describe('templated senders', () => {
    beforeEach(() => {
      mockSendMail.mockResolvedValue({ messageId: 'msg-1' });
    });

    it('sendVerificationEmail includes the token link and configured expiry', async () => {
      const service = buildService(fullEmailConfig);
      await service.sendVerificationEmail('user@example.com', 'tok-123');

      const call = mockSendMail.mock.calls[0][0];
      expect(call.to).toBe('user@example.com');
      expect(call.subject).toBe('Verify your email - CareDroid');
      expect(call.html).toContain('https://app.caredroid.health/verify-email?token=tok-123');
      expect(call.html).toContain('60 minutes');
    });

    it('sendVerificationEmail honors an explicit baseUrl override', async () => {
      const service = buildService(fullEmailConfig);
      await service.sendVerificationEmail(
        'user@example.com',
        'tok-123',
        'https://custom.example.com',
      );

      const call = mockSendMail.mock.calls[0][0];
      expect(call.html).toContain('https://custom.example.com/verify-email?token=tok-123');
    });

    it('sendPasswordResetEmail includes the token link and configured expiry', async () => {
      const service = buildService(fullEmailConfig);
      await service.sendPasswordResetEmail('user@example.com', 'reset-456');

      const call = mockSendMail.mock.calls[0][0];
      expect(call.subject).toBe('Reset your password - CareDroid');
      expect(call.html).toContain('https://app.caredroid.health/reset-password?token=reset-456');
      expect(call.html).toContain('30 minutes');
    });

    it('sendTwoFactorCode includes the raw code in both html and text', async () => {
      const service = buildService(fullEmailConfig);
      await service.sendTwoFactorCode('user@example.com', '482913');

      const call = mockSendMail.mock.calls[0][0];
      expect(call.html).toContain('482913');
      expect(call.text).toContain('482913');
    });

    it('sendMagicLinkEmail URL-encodes the token', async () => {
      const service = buildService(fullEmailConfig);
      await service.sendMagicLinkEmail('user@example.com', 'tok with space');

      const call = mockSendMail.mock.calls[0][0];
      expect(call.html).toContain('token=tok%20with%20space');
    });

    it('sendWelcomeEmail greets the user by name', async () => {
      const service = buildService(fullEmailConfig);
      await service.sendWelcomeEmail('user@example.com', 'Dr. Rivera');

      const call = mockSendMail.mock.calls[0][0];
      expect(call.html).toContain('Hello Dr. Rivera');
      expect(call.text).toContain('Dr. Rivera');
    });

    it('falls back to the default frontend URL when none is configured', async () => {
      const service = buildService({ ...fullEmailConfig, frontendUrl: undefined });
      await service.sendVerificationEmail('user@example.com', 'tok-789');

      const call = mockSendMail.mock.calls[0][0];
      expect(call.html).toContain('http://localhost:3000/verify-email?token=tok-789');
    });
  });
});

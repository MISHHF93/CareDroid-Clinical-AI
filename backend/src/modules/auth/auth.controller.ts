import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getFrontendBaseUrl(): string {
    const raw =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'http://localhost:5173';
    return raw.replace(/\/$/, '');
  }

  private redirectOAuthSuccess(res: Response, accessToken: string | undefined) {
    if (!accessToken) {
      return res.redirect(`${this.getFrontendBaseUrl()}/auth?error=oauth`);
    }
    const target = `${this.getFrontendBaseUrl()}/auth-callback?token=${encodeURIComponent(accessToken)}`;
    return res.redirect(target);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user with email and password' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || 'unknown';

    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Post('dev-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Development only: issue JWT for local UI bypass' })
  async devSession(@Req() req: Request) {
    const ipAddress = req.ip || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.createDevSession(ipAddress, userAgent);
  }

  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 2FA token during login' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated with 2FA' })
  @ApiResponse({ status: 401, description: 'Invalid 2FA token' })
  async verifyTwoFactor(@Body() body: { userId: string; token: string }, @Req() req: Request) {
    const ipAddress = req.ip || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || 'unknown';

    return this.authService.verifyTwoFactorLogin(body.userId, body.token, ipAddress, userAgent);
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email address with token from email' })
  @ApiResponse({ status: 200, description: 'Email successfully verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleLogin() {
    // Passport handles this
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const accessToken = req.user?.accessToken;
    if (accessToken) {
      return this.redirectOAuthSuccess(res, accessToken);
    }
    return res.json({
      accessToken: req.user?.accessToken,
      refreshToken: req.user?.refreshToken,
      expiresIn: req.user?.expiresIn,
      provider: 'google',
    });
  }

  @Get('linkedin')
  @UseGuards(AuthGuard('linkedin'))
  @ApiOperation({ summary: 'Initiate LinkedIn OAuth login' })
  async linkedinLogin() {
    // Passport handles this
  }

  @Get('linkedin/callback')
  @UseGuards(AuthGuard('linkedin'))
  @ApiOperation({ summary: 'LinkedIn OAuth callback' })
  async linkedinCallback(@Req() req: any, @Res() res: Response) {
    const accessToken = req.user?.accessToken;
    if (accessToken) {
      return this.redirectOAuthSuccess(res, accessToken);
    }
    return res.json({
      accessToken: req.user?.accessToken,
      refreshToken: req.user?.refreshToken,
      expiresIn: req.user?.expiresIn,
      provider: 'linkedin',
    });
  }

  @Post('magic-link')
  @ApiOperation({ summary: 'Request magic login link' })
  async requestMagicLink(@Body() body: { email: string }) {
    return this.authService.requestMagicLink(body.email);
  }

  @Get('oidc')
  @ApiOperation({ summary: 'OIDC SSO entry (placeholder)' })
  async oidcLogin() {
    return { message: 'OIDC SSO is not configured yet.' };
  }

  @Get('saml')
  @ApiOperation({ summary: 'SAML SSO entry (placeholder)' })
  async samlLogin() {
    return { message: 'SAML SSO is not configured yet.' };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Req() req: any) {
    return req.user;
  }
}

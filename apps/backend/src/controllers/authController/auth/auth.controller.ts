import { Controller, Post, Body, Get, UseGuards, Req, UnauthorizedException, ForbiddenException, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../../guards/auth/auth.guard';
import { AuthService } from '../../../services/auth/auth.service';
import { SendOtpAuthDto, VerifyOtpAuthDto, RegisterDeviceDto, RefreshTokenDto, ApiKeyNameDto, ApiKeyDto } from './auth.dto';

// TODO: Fix JWT token timestamp
// TODO: Fix all the status code and rejection

// always send refresh token too ig, cus i need to be able to identify session from them
// alternative is to encode refresh token in jwt token
// or maybe have a session ID that's probably better

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Send OTP for authentication' })
  @ApiResponse({ status: 201, description: 'OTP sent successfully' })
  @Post('sendOtp')
  async signUp(@Body() data: SendOtpAuthDto) {
    return this.authService.sendOtp(data.phoneNumber);
  }

  @ApiOperation({ summary: 'Verify OTP to complete authentication' })
  @ApiResponse({ status: 201, description: 'OTP verified successfully, returns tokens' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or transaction ID' })
  @Post('verifyOtp')
  @HttpCode(201)
  async verifyOtp(@Body() data: VerifyOtpAuthDto) {
    return this.authService.verifyOtp(data.transactionId, data.userInputOtp);
  }

  @ApiOperation({ summary: 'Register a device for push notifications' })
  @ApiResponse({ status: 201, description: 'Device registered successfully' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('register')
  async registerDevice(@Body() data: RegisterDeviceDto, @Req() req) {
    const userId = req.user.userId;
    const sessionId = req.user.sessionId;
    return this.authService.registerDevice(userId, data.phoneNumber, data.fcmToken, sessionId);
  }

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns user profile data' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('me')
  async getMe(@Req() req) {
    return this.authService.getUserProfile(req.user.userId);
  }

  @ApiOperation({ summary: 'Refresh authentication token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @Post('refresh')
  async refreshToken(@Body() data: RefreshTokenDto) {
    return this.authService.refreshToken(data.refreshToken);
  }

  @ApiOperation({ summary: 'Sign out from current session' })
  @ApiResponse({ status: 200, description: 'Successfully signed out' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('signout')
  async signOut(@Req() req) {
    const sessionId = req.user.sessionId;
    return this.authService.signOut(sessionId);
  }

  @ApiOperation({ summary: 'Sign out from all sessions' })
  @ApiResponse({ status: 200, description: 'Successfully signed out from all devices' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('signoutall')
  async signOutAll(@Req() req) {
    const userId = req.user.userId;
    return this.authService.signOutAll(userId);
  }

  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('apiKey/createNew')
  async createNewApiKey(@Body() data: ApiKeyNameDto, @Req() req) {
    const userId = req.user.userId;
    return this.authService.createNewApiKey(userId, data.name);
  }

  @ApiOperation({ summary: 'Get all API keys' })
  @ApiResponse({ status: 200, description: 'Returns list of API keys' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('apiKey/getAll')
  async getAllApiKeys(@Req() req) {
    const userId = req.user.userId;
    return this.authService.getApiKeys(userId);
  }

  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key revoked successfully' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('apiKey/revoke')
  async revokeApiKey(@Body() data: ApiKeyDto) {
    return this.authService.revokeApiKey(data.apiKey);
  }

  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'Returns user statistics' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('stats')
  async getAllStats(@Req() req) {
    const userId = req.user.userId;
    const sessionId = req.user.sessionId;
    return this.authService.getStats(userId, sessionId);
  }
}
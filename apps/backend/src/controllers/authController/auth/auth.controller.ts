import { Controller, Post, Body, Get, UseGuards, Req, UnauthorizedException, ForbiddenException, HttpCode } from '@nestjs/common';
import { AuthGuard } from '../../../guards/auth/auth.guard';
import { AuthService } from '../../../services/auth/auth.service';

// TODO: Fix JWT token timestamp
// TODO: Fix all the status code and rejection

// always send refresh token too ig, cus i need to be able to identify session from them
// alternative is to encode refresh token in jwt token
// or maybe have a session ID that's probably better

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // singup is a bit misleading, since this is also
  // the only way to login, but oh well
  @Post('sendOtp')
  async signUp(@Body() data: { phoneNumber: string }) {
    return this.authService.sendOtp(data.phoneNumber);
  }

  @Post('verifyOtp')
  @HttpCode(201)
  async verifyOtp(@Body() data: { transactionId: string; userInputOtp: string }) {
    return this.authService.verifyOtp(data.transactionId, data.userInputOtp);
  }

  @UseGuards(AuthGuard)
  @Post('register')
  async registerDevice(@Body() data: { phoneNumber: string; fcmToken: string }, @Req() req) {
    const userId = req.user.userId;
    const sessionId = req.user.sessionId;
    return this.authService.registerDevice(userId, data.phoneNumber, data.fcmToken, sessionId);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async getMe(@Req() req) {
    return this.authService.getUserProfile(req.user.userId);
  }

  @Post('refresh')
  async refreshToken(@Body() data: { refreshToken: string }) {
    return this.authService.refreshToken(data.refreshToken);
  }

  @UseGuards(AuthGuard)
  @Post('signout')
  async signOut(@Req() req) {
    const sessionId = req.user.sessionId;
    return this.authService.signOut(sessionId);
  }

  @UseGuards(AuthGuard)
  @Post('signoutall')
  async signOutAll(@Req() req) {
    const userId = req.user.userId;
    return this.authService.signOutAll(userId);
  }

  @UseGuards(AuthGuard)
  @Post('apiKey/createNew')
  async createNewApiKey(@Body() data: { name: string; }, @Req() req) {
    const userId = req.user.userId;
    return this.authService.createNewApiKey(userId, data.name);
  }

  @UseGuards(AuthGuard)
  @Get('apiKey/getAll')
  async getAllApiKeys(@Req() req) {
    const userId = req.user.userId;
    return this.authService.getApiKeys(userId);
  }

  @UseGuards(AuthGuard)
  @Post('apiKey/revoke')
  async revokeApiKey(@Body() data: { apiKey: string; }) {
    return this.authService.revokeApiKey(data.apiKey);
  }

  @UseGuards(AuthGuard)
  @Get('stats')
  async getAllStats(@Req() req) {
    const userId = req.user.userId;
    const sessionId = req.user.sessionId;
    return this.authService.getStats(userId, sessionId);
  }
}
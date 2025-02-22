import { Controller, Post, Body, Inject, Get, UseGuards, Req, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from '../../../guards/auth/auth.guard'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

// TODO: Fix JWT token timestamp
// TODO: Fix all the status code and rejection

// always send refresh token too ig, cus i need to be able to identify session from them
// alternative is to encode refresh token in jwt token
// or maybe have a session ID that's probably better

// TODO: add dto's for everything for better type safety, I wish we had Trpc :((
// adding dtos would help with the documentation swagger thing too!

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject('AUTH_SERVICE') private readonly authService: ClientProxy) {}

  // singup is a bit misleading, since this is also
  // the only way to login, but oh well
  @Post('sendOtp')
  @ApiOperation({ summary: '[INTERNAL] Send OTP to phone number' })
  @ApiResponse({ status: 201, description: 'OTP sent successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid phone number.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phoneNumber: { type: 'string', example: '+1234567890' },
      },
      required: ['phoneNumber'],
    },
  })
  async signUp(@Body() data: { phoneNumber: string }) {
    return this.authService.send('auth.sendOtp', data).toPromise();
  }

  @Post('verifyOtp')
  @ApiOperation({ summary: '[INTERNAL] Verify OTP for login' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid OTP.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        transactionId: { type: 'string', example: 'abcd1234' },
        userInputOtp: { type: 'string', example: '123456' },
      },
      required: ['transactionId', 'userInputOtp'],
    },
  })
  async verifyOtp(@Body() data: { transactionId: string; userInputOtp: string }) {
    return this.authService.send('auth.verify_otp', data).toPromise();
  }

  @UseGuards(AuthGuard)
  @Post('register')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[INTERNAL] Register device for notifications' })
  @ApiResponse({ status: 201, description: 'Device registered successfully.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        deviceHash: { type: 'string', example: 'abc123def456' },
        fcmToken: { type: 'string', example: 'some-fcm-token' },
      },
      required: ['deviceHash', 'fcmToken'],
    },
  })
  async registerDevice(@Body() data: { deviceHash: string; fcmToken: string }, @Req() req) {
    const userId = req.user.userId;
    const sessionId = req.user.sessionId;
    return this.authService.send('auth.register', { userId, sessionId, ...data }).toPromise();
  }

  @UseGuards(AuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[INTERNAL] Get user details' })
  @ApiResponse({ status: 200, description: 'User details retrieved successfully.' })
  async getMe(@Req() req) {
    return this.authService.send('auth.me', { userId: req.user.userId }).toPromise();
  }

  @Post('refresh')
  @ApiOperation({ summary: '[INTERNAL] Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', example: 'some-refresh-token' },
      },
      required: ['refreshToken'],
    },
  })
  async refreshToken(@Body() data: { refreshToken: string }) {
    return this.authService.send('auth.refresh', data).toPromise();
  }

  @UseGuards(AuthGuard)
  @Post('signout')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[INTERNAL] Sign out of current session' })
  @ApiResponse({ status: 200, description: 'Signed out successfully.' })
  async signOut(@Req() req){
    // doesn't need userId even though we have it from the authGuard
    // cus userId has nothing to do with session, refreshToken identifies that better
    const sessionId = req.user.sessionId;
    return this.authService.send('auth.signOut', { sessionId }).toPromise();
  }

  @UseGuards(AuthGuard)
  @Post('signoutall')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[INTERNAL] Sign out of all sessions' })
  @ApiResponse({ status: 200, description: 'All sessions signed out successfully.' })
  async signOutAll(@Req() req){
    const userId = req.user.userId;
    return this.authService.send('auth.signOutAll', {userId}).toPromise();
  }

  @UseGuards(AuthGuard)
  @Post('apiKey/createNew')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[INTERNAL] Create a new API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'My API Key' },
      },
      required: ['name'],
    },
  })
  async createNewApiKey(@Body() data: { name: string; }, @Req() req){
    const userId = req.user.userId;
    return this.authService.send('auth.apiKey.createNewApiKey', {userId, ...data}).toPromise();
  }

  @UseGuards(AuthGuard)
  @Get('apiKey/getAll')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[INTERNAL] Get all API keys' })
  @ApiResponse({ status: 200, description: 'List of API keys retrieved successfully.' })
  async getAllApiKeys(@Req() req){
    const userId = req.user.userId;
    return this.authService.send('auth.apiKey.getApiKeys', {userId}).toPromise();
  }

  @UseGuards(AuthGuard)
  @Post('apiKey/revoke')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[INTERNAL] Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key revoked successfully.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        apiKey: { type: 'string', example: 'some-api-key' },
      },
      required: ['apiKey'],
    },
  })
  async revokeApiKey(@Body() data: { apiKey: string; }){
    return this.authService.send('auth.apiKey.revokeApiKey', data).toPromise();
  }

  @UseGuards(AuthGuard)
  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[INTERNAL] Get all user stats' })
  @ApiResponse({ status: 200, description: 'User stats retrieved successfully.' })
  async getAllStats(@Req() req){
    const userId = req.user.userId;
    const sessionId = req.user.sessionId;
    return this.authService.send('auth.stats.getStatsComplete', { userId, sessionId }).toPromise();
  }
}
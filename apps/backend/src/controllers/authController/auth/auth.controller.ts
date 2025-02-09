import { Controller, Post, Body, Inject, Get, UseGuards, Req, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from '../../../guards/auth/auth.guard'

// TODO: Fix JWT token timestamp
// TODO: Fix all the status code and rejection

// always send refresh token too ig, cus i need to be able to identify session from them
// alternative is to encode refresh token in jwt token
// or maybe have a session ID that's probably better

@Controller('auth')
export class AuthController {
  constructor(@Inject('AUTH_SERVICE') private readonly authService: ClientProxy) {}

  // singup is a bit misleading, since this is also
  // the only way to login, but oh well
  @Post('signup')
  async signUp(@Body() data: { phoneNumber: string }) {
    return this.authService.send('auth.signUp', data).toPromise();
  }

  @Post('verify-otp')
  async verifyOtp(@Body() data: { transactionId: string; userInputOtp: string }) {
    return this.authService.send('auth.verify_otp', data).toPromise();
  }

  @UseGuards(AuthGuard)
  @Post('register')
  async registerDevice(@Body() data: { deviceHash: string; fcmToken: string }, @Req() req) {
    const userId = req.user.userId;
    const sessionId = req.user.sessionId;
    return this.authService.send('auth.register', { userId, sessionId, ...data }).toPromise();
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async getMe(@Req() req) {
    return this.authService.send('auth.me', { userId: req.user.userId }).toPromise();
  }

  @Post('refresh')
  async refreshToken(@Body() data: { refreshToken: string }) {
    return this.authService.send('auth.refresh', data).toPromise();
  }

  @UseGuards(AuthGuard)
  @Post('signout')
  async signOut(@Req() req){
    // doesn't need userId even though we have it from the authGuard
    // cus userId has nothing to do with session, refreshToken identifies that better
    const sessionId = req.user.sessionId;
    return this.authService.send('auth.signOut', { sessionId }).toPromise();
  }

  @UseGuards(AuthGuard)
  @Post('signoutall')
  async signOutAll(@Body() data: { refreshToken: string; }, @Req() req){
    const userId = req.user.userId;
    return this.authService.send('auth.signOutAll', {userId, ...data}).toPromise();
  }
}
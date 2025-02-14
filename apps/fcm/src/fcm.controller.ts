import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FcmService } from './fcm.service';

@Controller()
export class FcmController {
  constructor(private readonly fcmService: FcmService) {}

  @MessagePattern('fcm.sendPingMessage')
  async sendPingMessage(@Payload() data: { token: string }) {
    return this.fcmService.sendPingMessage(data.token);
  }

  @MessagePattern('fcm.sendServiceMessage')
  async sendDataMessage(@Payload() data: { token: string; otp: string; phoneNumber: string }) {
    return this.fcmService.sendServiceMessage(data.token, data.otp, data.phoneNumber);
  }

  @MessagePattern('fcm.sendPushNotification')
  async sendPushNotification(@Payload() data: { token: string; message: string }) {
    return this.fcmService.sendPushNotification(data.token, data.message);
  }
}
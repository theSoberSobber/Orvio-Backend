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
  async sendDataMessage(@Payload() data: { fcmToken: string; otp: string; phoneNumber: string; tid: string }) {
    console.log("Message recieved at the fcm service with data...", data);
    return this.fcmService.sendServiceMessage(data.fcmToken, data.otp, data.phoneNumber, data.tid);
  }

  @MessagePattern('fcm.sendPushNotification')
  async sendPushNotification(@Payload() data: { fcmToken: string; message: string }) {
    return this.fcmService.sendPushNotification(data.fcmToken, data.message);
  }
}
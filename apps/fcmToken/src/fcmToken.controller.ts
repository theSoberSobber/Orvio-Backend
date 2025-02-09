import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { FcmTokenService } from './fcmToken.service';

@Controller()
export class FcmTokenController {
  constructor(private readonly fcmTokenService: FcmTokenService) {}

  @MessagePattern('fcmToken.registerDevice')
  async registerDevice(device: any) {
    console.log("[FCM SERVICE] REGISTRATION MESSAGE REACHED CONTROLLER");
    return this.fcmTokenService.registerDevice(device);
  }

  @MessagePattern('fcmToken.getToken')
  async getToken() {
    return this.fcmTokenService.getToken();
  }
}
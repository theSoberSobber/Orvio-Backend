import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { FcmService } from './fcm.service';

@Controller()
export class FcmController {
  constructor(private readonly fcmService: FcmService) {}

  @MessagePattern('fcm.registerDevice')
  async registerDevice(device: any) {
    console.log("[FCM SERVICE] REGISTRATION MESSAGE REACHED CONTROLLER");
    return this.fcmService.registerDevice(device);
  }

  @MessagePattern('fcm.getToken')
  async getToken() {
    return this.fcmService.getToken();
  }
}
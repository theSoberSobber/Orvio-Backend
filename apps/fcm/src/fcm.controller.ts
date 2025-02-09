import { Controller, Get } from '@nestjs/common';
import { FcmService } from './fcm.service';

@Controller()
export class FcmController {
  constructor(private readonly fcmService: FcmService) {}

  @Get()
  getHello(): string {
    return this.fcmService.getHello();
  }
}

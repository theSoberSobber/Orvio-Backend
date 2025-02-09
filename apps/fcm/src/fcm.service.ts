import { Injectable } from '@nestjs/common';

@Injectable()
export class FcmService {
  getHello(): string {
    return 'Hello World!';
  }
}

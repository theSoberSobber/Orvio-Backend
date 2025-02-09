import { Injectable } from '@nestjs/common';

// probably should maintain a redist set of tokens
// the cron that 

@Injectable()
export class FcmService {
  getHello(): string {
    return 'Hello World!';
  }
}

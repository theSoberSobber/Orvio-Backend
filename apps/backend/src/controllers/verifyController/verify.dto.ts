import { ApiProperty } from '@nestjs/swagger';

export class VerifyTokenParamDto {
  @ApiProperty({
    description: 'JWT token to verify the message',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  token: string;
} 
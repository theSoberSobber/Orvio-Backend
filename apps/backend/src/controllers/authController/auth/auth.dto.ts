import { ApiProperty } from '@nestjs/swagger';

export class SendOtpAuthDto {
  @ApiProperty({
    description: 'Phone number to send OTP for authentication',
    example: '+1234567890'
  })
  phoneNumber: string;
}

export class VerifyOtpAuthDto {
  @ApiProperty({
    description: 'Transaction ID received from sendOtp',
    example: 'tid_1234567890'
  })
  transactionId: string;

  @ApiProperty({
    description: 'OTP entered by the user',
    example: '123456'
  })
  userInputOtp: string;
}

export class RegisterDeviceDto {
  @ApiProperty({
    description: 'Phone number of the device',
    example: '+1234567890'
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Firebase Cloud Messaging token for push notifications',
    example: 'cC_EQ-GzSxCRphT5h1...'
  })
  fcmToken: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token received during authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  refreshToken: string;
}

export class ApiKeyNameDto {
  @ApiProperty({
    description: 'Name to identify the API key',
    example: 'Production Server'
  })
  name: string;
}

export class ApiKeyDto {
  @ApiProperty({
    description: 'API key to revoke',
    example: 'sk_test_abc123...'
  })
  apiKey: string;
} 
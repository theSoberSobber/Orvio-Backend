import { ApiProperty } from '@nestjs/swagger';
import { CreditMode } from 'apps/shared/entities/user.entity';

export class SendOtpDto {
  @ApiProperty({
    description: 'Phone number to send OTP to',
    example: '+1234567890'
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Organization name for the service',
    example: 'Acme Inc',
    required: false
  })
  orgName?: string;

  @ApiProperty({
    description: 'OTP expiry time in seconds',
    example: 300,
    required: false
  })
  otpExpiry?: number;

  @ApiProperty({
    description: 'Webhook URL for customer reporting',
    example: 'https://example.com/webhooks/otp',
    required: false
  })
  reportingCustomerWebhook?: string;

  @ApiProperty({
    description: 'Secret for webhook authentication',
    example: 'secret123',
    required: false
  })
  reportingCustomerWebhookSecret?: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Transaction ID received from sendOtp',
    example: 'tid_1234567890'
  })
  tid: string;

  @ApiProperty({
    description: 'OTP entered by the user',
    example: '123456'
  })
  userInputOtp: string;
}

export class AckDto {
  @ApiProperty({
    description: 'Transaction ID to acknowledge',
    example: 'tid_1234567890'
  })
  tid: string;
}

export class CreditModeDto {
  @ApiProperty({
    description: 'Credit mode to set (DIRECT: charge 1 credit, MODERATE: charge 1 credit with refund policy, STRICT: charge 2 credits with verification)',
    enum: CreditMode,
    example: CreditMode.MODERATE
  })
  mode: CreditMode;
} 
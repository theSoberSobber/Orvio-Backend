import { Injectable } from '@nestjs/common';

@Injectable()
export class OtpService {
  private otpStore = new Map<string, { otp: string; phone: string }>();

  sendOtp(phone: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const transactionId = Date.now().toString(); // Fake transaction ID
    this.otpStore.set(transactionId, { otp, phone });

    console.log(`📩 Sent OTP ${otp} to ${phone} (Transaction ID: ${transactionId})`);
    return { transactionId };
  }

  verifyOtp(transactionId: string, otp: string) {
    const record = this.otpStore.get(transactionId);
    if (!record) return false;
    
    const isValid = record.otp === otp;
    if (isValid) this.otpStore.delete(transactionId); // OTP should be one-time use
    return isValid;
  }
}
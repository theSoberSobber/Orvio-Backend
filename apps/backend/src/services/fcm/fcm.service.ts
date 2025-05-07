import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private readonly baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  private readonly privateKey = process.env.JWT_SECRET || 'default-secret-key';

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      if (admin.apps.length) {
        this.logger.log('Firebase Admin SDK already initialized');
        return;
      }

      const serviceFilePath = process.env.FCM_SERVICE_FILE_PATH;
      if (!serviceFilePath) {
        throw new Error('FCM_SERVICE_FILE_PATH is not defined in environment variables');
      }

      const absolutePath = path.resolve(process.cwd(), serviceFilePath);
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`FCM service account file not found at path: ${absolutePath}`);
      }

      const serviceAccount = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      this.logger.log('Firebase Admin SDK initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize Firebase: ${error.message}`);
    }
  }

  /**
   * Format the OTP message with OTP value and timestamp
   * @param otp The OTP code
   * @param timestamp ISO timestamp string
   * @returns Formatted message string
   */
  private formatMessage(otp: string, timestamp: string, orgName?: string): string {
    // Convert ISO timestamp to readable format
    const date = new Date(timestamp);
    const formattedDate = date.toISOString().replace('T', ' ').substring(0, 19);
    
    const formattedMessage = `${otp}${orgName ? ` for "${orgName}"` : ''}. It was requested at ${formattedDate}\nSent by Orvio (${this.baseUrl})`;
    this.logger.log(`[formatMessage] Created formatted message: ${formattedMessage}`);
    
    return formattedMessage;
  }

  /**
   * Create a signed verification URL for the message
   * @param message The message to sign
   * @returns Signed verification URL
   */
  private createVerificationUrl(message: string): string {
    const payload = { message };
    const token = jwt.sign(payload, this.privateKey);
    const verificationUrl = `${this.baseUrl}/verify/${token}`;
    
    this.logger.log(`[createVerificationUrl] Created verification URL: ${verificationUrl}`);
    return verificationUrl;
  }

  async sendPingMessage(token: string) {
    const message = {
      token,
      data: {
        type: 'PING',
        timestamp: new Date().toISOString(),
      },
      android: {
        priority: 'high' as 'high',
      },
    };
    return this.sendMessage(message);
  }

  async sendServiceMessage(token: string, otp: string, phoneNumber: string, tid: string, timestamp: string, orgName?: string) {
    const formattedMessage = this.formatMessage(otp, timestamp, orgName);
    const verificationUrl = this.createVerificationUrl(formattedMessage);
    
    // Append verification URL to the message
    const finalMessage = `${formattedMessage}\n\nVerify this message: ${verificationUrl}`;
    
    const message = {
      token,
      data: {
        type: 'OTP',
        otp: otp,
        phoneNumber: phoneNumber,
        tid: tid,
        timestamp: timestamp,
        message: finalMessage,  // Use the message with verification URL
        verificationUrl: verificationUrl // Also include as separate field
      },
    };

    this.logger.log(`[sendServiceMessage] Sending OTP message with verification URL`);
    return this.sendMessage(message);
  }

  async sendPushNotification(token: string, message: string) {
    const notification = {
      token,
      notification: {
        title: 'New Notification',
        body: message,
      },
      data: {
        type: 'notification',
        timestamp: new Date().toISOString(),
      },
      android: {
        priority: 'high' as 'high',
      },
    };

    return this.sendMessage(notification);
  }

  private async sendMessage(message: admin.messaging.Message) {
    try {
      this.logger.log(`[sendMessage] Attempting to send message: ${JSON.stringify(message.data)}`);
      const response = await admin.messaging().send(message);
      this.logger.log(`FCM message sent successfully: ${response}`);
      return { success: true, messageId: response };
    } catch (error) {
      this.logger.error(`Error sending FCM message: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }
} 
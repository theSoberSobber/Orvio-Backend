import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);

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

  async sendServiceMessage(token: string, otp: string, phoneNumber: string, tid: string, timestamp: string) {
    const message = {
      token,
      data: {
        type: 'OTP',
        otp: otp,
        phoneNumber: phoneNumber,
        tid: tid,
        timestamp: timestamp,
      },
    };

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
      const response = await admin.messaging().send(message);
      this.logger.log(`FCM message sent successfully: ${response}`);
      return { success: true, messageId: response };
    } catch (error) {
      this.logger.error(`Error sending FCM message: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }
} 
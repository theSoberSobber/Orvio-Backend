import { Injectable, Inject, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { Device } from 'apps/shared/entities/device.entity';
import * as crypto from "crypto";
import { Session } from 'apps/shared/entities/session.entity';
import { FcmTokenService } from '../fcmToken/fcmToken.service';
import { FcmService } from '../fcm/fcm.service';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

@Injectable()
export class ServiceService {
  private readonly logger = new Logger(ServiceService.name);
  private readonly ttl = Number(process.env.TTL) || 5;
  private readonly maxOtpDepth = 2;
  private readonly intervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly fcmTokenService: FcmTokenService, // Direct dependency on FcmTokenService
    private readonly fcmService: FcmService, // Direct dependency on FcmService
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    @InjectRedis('SERVICE_SERVICE_REDIS') private readonly redis: Redis,
  ) {}

  async sendOtp(userIdThatRequested: string, phoneNumber: string, reportingCustomerWebhook?: string, reportingCustomerWebhookSecret?: string): Promise<{ tid: string }> {
    const tid = uuidv4();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const timestamp = new Date().toISOString();
    this.schedule(tid, otp, phoneNumber, timestamp, reportingCustomerWebhook, reportingCustomerWebhookSecret);
    return { tid };
  }

  private async schedule(tid: string, otp: string, phoneNumber: string, timestamp: string, reportingCustomerWebhook?: string, reportingCustomerWebhookSecret?: string) {
    const businessLogic = async () => {
      const internalTimestamp = new Date().toLocaleString();
      console.log(`[${internalTimestamp}] Starting business logic...`);

      // Get random device token directly from FcmTokenService
      const { device: newDevice } = await this.fcmTokenService.getToken();
      
      if (!newDevice) {
        this.logger.warn("No device available for sending OTP");
        return;
      }

      const luaScript = `
        local otpKey = 'otp:' .. KEYS[1]
        local otpKeyDeviceAssigned = 'otp:deviceAssigned:' .. KEYS[1]
        local otpKeyAcknowledged = 'otp:acknowledged:' .. KEYS[1]

        local depthKey = 'otp:depth:' .. KEYS[1]
        
        local otpExists = redis.call('GET', otpKey)
        local depthExists = redis.call('GET', depthKey)
        
        if not otpExists and not depthExists then
          redis.call('SET', otpKey, ARGV[1])
          redis.call('SET', otpKeyDeviceAssigned, ARGV[2])
          redis.call('SET', otpKeyAcknowledged, ARGV[3])
          redis.call('SET', depthKey, 1)
          return 1
        end

        local alreadyAcknowledged = redis.call('GET', otpKeyAcknowledged)
        if alreadyAcknowledged and tonumber(alreadyAcknowledged) == 1 then
            return 0 -- Already acknowledged
        end
        
        if depthExists and not otpExists then
          redis.call('DEL', depthKey)
          return 0
        end
        
        if tonumber(depthExists) > tonumber(ARGV[4]) then
          redis.call('DEL', depthKey)
          return -1
        end
        
        redis.call('INCR', depthKey)

        redis.call('SET', otpKey, ARGV[1])
        redis.call('SET', otpKeyDeviceAssigned, ARGV[2])
        redis.call('SET', otpKeyAcknowledged, ARGV[3])

        return 1
      `;
      
      const result = await this.redis.eval(luaScript, 1, tid, otp, newDevice.id, 0, this.maxOtpDepth);
  
      console.log("RESULT OF LUA SCRIPT (SUPPOSED TO BE 0 IF ALREADY ACKNOWLEDGED): ", result);

      if (result === 0 || result === -1) {
        clearInterval(this.intervals.get(tid));
        this.intervals.delete(tid);

        if (reportingCustomerWebhook) {
          const payload = JSON.stringify({
            tid,
            status: result === 0 ? 'acknowledged' : 'failed',
          });
  
          const signature = reportingCustomerWebhookSecret
            ? crypto.createHmac('sha256', reportingCustomerWebhookSecret).update(payload).digest('hex')
            : undefined;
          
          this.notifyWebhook(reportingCustomerWebhook, payload, signature);
        }

        return;
      }

      let cnt = 0;
      let success = false;
      
      while(!success && cnt < 3) {
        // Call FcmService directly instead of using the client proxy
        const response = await this.fcmService.sendServiceMessage(
          newDevice.fcmToken, 
          otp, 
          phoneNumber, 
          tid, 
          timestamp
        );
        
        if(response.success) {
          success = true;
        } else {
          await delay(5000);
        }
        
        cnt++;
      }
    };
    
    businessLogic();
    const interval = setInterval(businessLogic, this.ttl * 1000);
    this.intervals.set(tid, interval);
  }

  async ack(userIdThatFullfilled: string, tid: string, sessionId: string): Promise<{ success: boolean; status: string }> {
    const session = await this.sessionRepo.findOne({
        where: { id: sessionId },
        relations: ['device'],
    });

    if (!session || !session.device) {
        return { success: false, status: 'session_invalid' };
    }

    const deviceId = session.device.id;

    const luaScript = `
        local otpKey = 'otp:' .. KEYS[1]
        local otpKeyDeviceAssigned = 'otp:deviceAssigned:' .. KEYS[1]
        local otpKeyAcknowledged = 'otp:acknowledged:' .. KEYS[1]

        local otpExists = redis.call('GET', otpKey)
        if not otpExists then
            return 0 -- OTP doesn't exist or expired
        end

        local alreadyAcknowledged = redis.call('GET', otpKeyAcknowledged)
        if alreadyAcknowledged and tonumber(alreadyAcknowledged) == 1 then
            return 0 -- Already acknowledged
        end

        local assignedDevice = redis.call('GET', otpKeyDeviceAssigned)
        if assignedDevice ~= ARGV[1] then
            return -1 -- Wrong device
        end

        redis.call('SET', otpKeyAcknowledged, 1)
        return 1 -- Acknowledged successfully
    `;

    const result = await this.redis.eval(luaScript, 1, tid, deviceId);

    if (result === 1) {
        return { success: true, status: 'acknowledged' };
    } else if (result === -1) {
        return { success: false, status: 'wrong_device' };
    } else {
        return { success: false, status: 'otp_invalid' };
    }
  }

  async verifyOtp(tid: string, userInputOtp: string): Promise<{ success: boolean; status: string }> {
    const luaScript = `
        local otpKey = 'otp:' .. KEYS[1]
        local otpKeyDepth = 'otp:depth:' .. KEYS[1]
        local otpKeyAcknowledged = 'otp:acknowledged:' .. KEYS[1]
        local otpKeyDeviceAssigned = 'otp:deviceAssigned:' .. KEYS[1]

        local otpStored = redis.call('GET', otpKey)
        if not otpStored then
            return {0, nil} -- OTP doesn't exist or expired
        end

        if otpStored ~= ARGV[1] then
            return {0, nil} -- OTP mismatch
        end

        local deviceId = redis.call('GET', otpKeyDeviceAssigned)

        -- Delete all OTP-related keys EXCEPT depth
        redis.call('DEL', otpKey, otpKeyAcknowledged, otpKeyDeviceAssigned)
        
        return {1, deviceId} -- OTP verified
    `;

    const result = (await this.redis.eval(luaScript, 1, tid, userInputOtp)) as [number, string | null];

    const isVerified = result[0] === 1;
    const deviceId = result[1] ?? undefined;

    return { success: isVerified, status: isVerified ? 'verified' : 'invalid_otp' };
  }

  private async notifyWebhook(webhookUrl: string, payload: string, signature?: string) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (signature) headers['X-Signature'] = signature;
  
      await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: payload,
      });
    } catch (error) {
      this.logger.error(`Failed to notify webhook: ${error.message}`);
    }
  }  
} 
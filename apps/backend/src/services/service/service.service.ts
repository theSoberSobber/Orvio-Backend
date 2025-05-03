import { Injectable, Inject, Logger, HttpException, HttpStatus } from '@nestjs/common';
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
import { MetricsService } from '../metrics/metrics.service';
import { CreditService } from '../credit/credit.service';
import { CreditMode } from 'apps/shared/entities/user.entity';
import { SYSTEM_SERVICE_USER_ID } from '../otp/otp.service';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

@Injectable()
export class ServiceService {
  private readonly logger = new Logger(ServiceService.name);
  private readonly ttl = Number(process.env.TTL) || 5;
  private readonly maxOtpDepth = 2;
  private readonly intervals = new Map<string, NodeJS.Timeout>();
  // Store user ID for each transaction to handle refunds
  private readonly tidToUserMap = new Map<string, string>();

  constructor(
    private readonly fcmTokenService: FcmTokenService,
    private readonly fcmService: FcmService, 
    private readonly metricsService: MetricsService,
    private readonly creditService: CreditService,
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    @InjectRedis('SERVICE_SERVICE_REDIS') private readonly redis: Redis,
  ) {}

  async sendOtp(userIdThatRequested: string, phoneNumber: string, reportingCustomerWebhook?: string, reportingCustomerWebhookSecret?: string, otpExpiry: number = 120, orgName?: string): Promise<{ tid: string }> {
    // Check if this is a system service request - bypass credit check if it is
    const isSystemRequest = userIdThatRequested === SYSTEM_SERVICE_USER_ID;
    
    if (!isSystemRequest) {
      // Regular user request - check and deduct credits
      const hasCredits = await this.creditService.checkAndDeductCredits(userIdThatRequested);
      
      if (!hasCredits) {
        throw new HttpException('Insufficient credits', HttpStatus.PAYMENT_REQUIRED);
      }
    } else {
      this.logger.log('Processing system service request - bypassing credit check');
    }

    const tid = uuidv4();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const timestamp = new Date().toISOString();
    
    // Store the user ID for potential refund later (only for regular users)
    if (!isSystemRequest) {
      this.tidToUserMap.set(tid, userIdThatRequested);
      
      // Store credit mode in Redis for later reference
      const creditMode = await this.creditService.getCreditMode(userIdThatRequested);
      await this.redis.set(`credit:mode:${tid}`, creditMode);
    }
    
    this.schedule(tid, otp, phoneNumber, timestamp, reportingCustomerWebhook, reportingCustomerWebhookSecret, otpExpiry, orgName);
    return { tid };
  }

  private scheduleVerificationCheckAfterExpiry(tid: string, deviceId: string, expiryTime: number = 120) {
    console.log(`Scheduling verification check after ${expiryTime} seconds for TID: ${tid}, Device: ${deviceId}`);
    
    setTimeout(() => {
      const verificationCheck = async () => {
        const checkScript = `
          local otpKey = 'otp:' .. KEYS[1]
          local otpKeyDepth = 'otp:depth:' .. KEYS[1]
          
          local otpExists = redis.call('GET', otpKey)
          local depthExists = redis.call('GET', otpKeyDepth)
          
          if depthExists and not otpExists then
            -- OTP was verified after acknowledgment (depth exists but otp doesn't)
            redis.call('DEL', otpKeyDepth)
            return 1
          else
            -- OTP was not verified after acknowledgment
            redis.call('DEL', otpKeyDepth)
            return 0
          end
        `;

        const timestamp = new Date().toLocaleString();
        console.log(`[${timestamp}] Checking verification status after expiry for TID: ${tid}, Device: ${deviceId}`);

        try {
          const result = await this.redis.eval(checkScript, 1, tid);
          const currentTime = new Date().toLocaleString();
          
          // Get the credit mode for this transaction
          const creditMode = await this.redis.get(`credit:mode:${tid}`);
          const userId = this.tidToUserMap.get(tid);
          
          if (result === 1) {
            // Verified after acknowledgment
            console.log(`[${currentTime}] OTP verified after acknowledgment for TID: ${tid}, Device: ${deviceId}`);
            // Update metrics: Decrement sentAckNotVerified, Increment sentAckVerified
            await this.metricsService.decrementMetric(deviceId, 'sentAckNotVerified');
            await this.metricsService.incrementMetric(deviceId, 'sentAckVerified');
            console.log(`[${currentTime}] Updated metrics: Decremented sentAckNotVerified, Incremented sentAckVerified for device ${deviceId}`);
            
            // For STRICT mode: No refund needed, all conditions met
          } else {
            // Not verified after acknowledgment
            console.log(`[${currentTime}] OTP NOT verified after acknowledgment for TID: ${tid}, Device: ${deviceId}`);
            
            // For STRICT mode: Credit should be refunded since OTP wasn't verified
            if (userId && creditMode === CreditMode.STRICT) {
              await this.creditService.refundCredits(userId);
              console.log(`[${currentTime}] Refunded credit to user ${userId} in STRICT mode due to unverified OTP`);
            }
          }
          
          // Clean up after expiry
          await this.redis.del(`credit:mode:${tid}`);
          this.tidToUserMap.delete(tid);
          
        } catch (error) {
          const currentTime = new Date().toLocaleString();
          console.error(`[${currentTime}] Error checking verification status: ${error.message}`);
        }
      };
      verificationCheck();
    }, expiryTime * 1000);
  }

  private async schedule(tid: string, otp: string, phoneNumber: string, timestamp: string, reportingCustomerWebhook?: string, reportingCustomerWebhookSecret?: string, otpExpiry: number = 120, orgName?: string) {
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
          return 2 -- Already verified
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
      
      // Get credit mode and user ID for this transaction
      const creditMode = await this.redis.get(`credit:mode:${tid}`);
      const userId = this.tidToUserMap.get(tid);

      if (result === 0) {
        // Case 1: ack came first, no idea about verification till now
        clearInterval(this.intervals.get(tid));
        this.intervals.delete(tid);

        // Schedule verification check to be done after otpExpiry
        console.log(`[${internalTimestamp}] OTP acknowledged. Calling scheduleVerificationCheckAfterExpiry.`);
        
        // Increment sentAckNotVerified metric
        await this.metricsService.incrementMetric(newDevice.id, 'sentAckNotVerified');
        console.log(`[${internalTimestamp}] Updated metrics: Incremented sentAckNotVerified for device ${newDevice.id}`);

        // For MODERATE mode: Credit should be kept (ack received)
        // For STRICT mode: We'll decide during verification check
        
        this.scheduleVerificationCheckAfterExpiry(tid, newDevice.id, otpExpiry);

        if (reportingCustomerWebhook) {
          const payload = JSON.stringify({
            tid,
            status: 'acknowledged',
          });
  
          const signature = reportingCustomerWebhookSecret
            ? crypto.createHmac('sha256', reportingCustomerWebhookSecret).update(payload).digest('hex')
            : undefined;
          
          this.notifyWebhook(reportingCustomerWebhook, payload, signature);
        }

        return;
      } else if (result === 2) {
        // Case 2: verified before ack
        clearInterval(this.intervals.get(tid));
        this.intervals.delete(tid);

        // Increment sentAckVerified metric
        await this.metricsService.incrementMetric(newDevice.id, 'sentAckVerified');
        console.log(`[${internalTimestamp}] Updated metrics: Incremented sentAckVerified for device ${newDevice.id}`);

        // For all modes: Credit should be kept (verified)
        
        if (reportingCustomerWebhook) {
          const payload = JSON.stringify({
            tid,
            status: 'verified',
          });
  
          const signature = reportingCustomerWebhookSecret
            ? crypto.createHmac('sha256', reportingCustomerWebhookSecret).update(payload).digest('hex')
            : undefined;
          
          this.notifyWebhook(reportingCustomerWebhook, payload, signature);
        }

        // Clean up
        await this.redis.del(`credit:mode:${tid}`);
        this.tidToUserMap.delete(tid);
        
        return;
      } else if (result === -1) {
        // Failed case (max depth exceeded)
        clearInterval(this.intervals.get(tid));
        this.intervals.delete(tid);

        // Increment failedToSendAck metric
        await this.metricsService.incrementMetric(newDevice.id, 'failedToSendAck');
        console.log(`[${internalTimestamp}] Updated metrics: Incremented failedToSendAck for device ${newDevice.id}`);

        // For DIRECT mode: Keep the deduction
        // For MODERATE and STRICT modes: Refund the credit
        if (userId && (creditMode === CreditMode.MODERATE || creditMode === CreditMode.STRICT)) {
          await this.creditService.refundCredits(userId);
          console.log(`[${internalTimestamp}] Refunded credit to user ${userId} due to failed OTP send (max depth exceeded)`);
        }

        if (reportingCustomerWebhook) {
          const payload = JSON.stringify({
            tid,
            status: 'failed',
          });
  
          const signature = reportingCustomerWebhookSecret
            ? crypto.createHmac('sha256', reportingCustomerWebhookSecret).update(payload).digest('hex')
            : undefined;
          
          this.notifyWebhook(reportingCustomerWebhook, payload, signature);
        }
        
        // Clean up
        await this.redis.del(`credit:mode:${tid}`);
        this.tidToUserMap.delete(tid);

        return;
      }

      // Increment totalMessagesSent metric
      await this.metricsService.incrementMetric(newDevice.id, 'totalMessagesSent');
      console.log(`[${internalTimestamp}] Updated metrics: Incremented totalMessagesSent for device ${newDevice.id}`);

      let cnt = 0;
      let success = false;
      
      while(!success && cnt < 3) {
        // Call FcmService directly instead of using the client proxy
        const response = await this.fcmService.sendServiceMessage(
          newDevice.fcmToken, 
          otp, 
          phoneNumber, 
          tid, 
          timestamp,
          orgName
        );
        
        if(response.success) {
          success = true;
          
          // Increment messageSentSuccessfully metric on successful send
          await this.metricsService.incrementMetric(newDevice.id, 'messageSentSuccessfully');
          console.log(`[${internalTimestamp}] Updated metrics: Incremented messageSentSuccessfully for device ${newDevice.id}`);
        } else {
          // Increment messageTried metric only when a message send fails
          await this.metricsService.incrementMetric(newDevice.id, 'messageTried');
          console.log(`[${internalTimestamp}] Updated metrics: Incremented messageTried for device ${newDevice.id}`);
          
          await delay(5000);
        }
        
        cnt++;
      }
      
      // If we couldn't send the message successfully and there's no ack yet
      if (!success) {
        // For DIRECT mode: Keep the deduction
        // For MODERATE and STRICT modes: Refund the credit
        if (userId && (creditMode === CreditMode.MODERATE || creditMode === CreditMode.STRICT)) {
          await this.creditService.refundCredits(userId);
          console.log(`[${internalTimestamp}] Refunded credit to user ${userId} due to failed OTP send (couldn't send message)`);
        }
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

  /**
   * Get user's current credit balance
   * @param userId User ID to get credits for
   * @returns Number of credits available
   */
  async getUserCredits(userId: string): Promise<number> {
    return this.creditService.getCredits(userId);
  }

  /**
   * Get user's current credit mode
   * @param userId User ID to get credit mode for
   * @returns Current credit mode
   */
  async getUserCreditMode(userId: string): Promise<CreditMode> {
    return this.creditService.getCreditMode(userId);
  }

  /**
   * Set user's credit mode
   * @param userId User ID to update
   * @param mode New credit mode
   */
  async setUserCreditMode(userId: string, mode: CreditMode): Promise<void> {
    await this.creditService.setCreditMode(userId, mode);
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
import { Injectable, Inject, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { Device } from 'apps/shared/entities/device.entity';
import { ClientProxy } from '@nestjs/microservices';
import * as crypto from "crypto";
import { Session } from 'apps/shared/entities/session.entity';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// TODO: On correct/failed transactions pipe everything to kafka and make a stats service
// to consumer and write things to db when needed
// kafka async emit, use the cp-kafka one

@Injectable()
export class ServiceService {
  private readonly logger = new Logger(ServiceService.name);
  private readonly ttl = Number(process.env.TTL) || 5;
  private readonly maxOtpDepth = 2;
  private readonly intervals = new Map<string, NodeJS.Timeout>();

  constructor(
    @Inject('FCM_TOKEN_SERVICE') private readonly fcmTokenService: ClientProxy,
    @Inject('FCM_SERVICE') private readonly fcmService: ClientProxy,
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async sendOtp(userIdThatRequested: string, phoneNumber: string, reportingCustomerWebhook?: string, reportingCustomerWebhookSecret?: string): Promise<{ tid: string }> {
    const tid = uuidv4();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // const transactionData = {
    //   userIdThatRequested,
    //   otp,
    //   phoneNumber,
    //   reportingCustomerWebhook,
    //   timestamp: Date.now(),
    // };
    
    // data that doesn't really change otpDetails
    // await this.redis.set(`otpDetails:${tid}`, JSON.stringify(transactionData));
    this.schedule(tid, otp, phoneNumber, reportingCustomerWebhook, reportingCustomerWebhookSecret);
    return { tid };
  }

  private async schedule(tid: string, otp: string, phoneNumber: string, reportingCustomerWebhook?: string, reportingCustomerWebhookSecret?: string) {
    const interval = setInterval(async () => {
      // a check and set that gets called when ttl is up
      // so now this atomic transaction will:
        // check if running the first time (both otp and depth keys don't exist)
          // should set the new device and return 1 (side effects are then trying to send, do your side effects yourself)
        // check if this acknowleedged or deleted (verified):
          // don't set and go away and clear this stuff (will return 0, do your side effects yourself)
        // if all this not done then yea set 
          // should set the new device and return 1 (side effects are then trying to send actually, do your side effects yourself)


      const { device: newDevice } = await this.fcmTokenService.send({ cmd: 'fcm.getToken' }, {}).toPromise() as { device: Device };

      // all three otp keys are supposed to be deleted/added in sync
      // stay in a consistent state
      // because they were json, but since lua doesn't like json
      // they are broken into structured keys now
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
      // keys (1):
      //  tid
      // args (4):
      //  otp
      //  assigned device id
      //  acknowledged or not (0/1)
      //  max otp depth
      const result = await this.redis.eval(luaScript, 1, tid, otp, newDevice.id, 0, this.maxOtpDepth);
  
      if (result === 0 || result === -1) {
        clearInterval(interval);
        this.intervals.delete(tid);

        if (reportingCustomerWebhook) {
          const payload = JSON.stringify({
            tid,
            status: result === 0 ? 'acknowledged' : 'failed',
          });
  
          const signature = reportingCustomerWebhookSecret
            ? crypto.createHmac('sha256', reportingCustomerWebhookSecret).update(payload).digest('hex')
            : undefined;
          
          // no need to await this
          this.notifyWebhook(reportingCustomerWebhook, payload, signature);
        }

        return;
      }

      // side effects of return 1, that is do again action, (send the otp already wrote the device above)
      // already got device let's just send now
      this.logger.warn(`No ack received for OTP ${tid}, retrying with a different device...`);

      let cnt=0;
      let success = false;
      // try atleast 3 times to get a device, i
      // ideally the retry time should be enough to exhaust the TTl
      while(!success && cnt<3){
        const response = await this.fcmService.send(
          { cmd: 'fcm.sendServiceMessage' }, 
          { fcmToken: newDevice.fcmToken, otp, phoneNumber, tid }
        ).toPromise();
        if(response.success) success = true;
        else await delay(5000);
        cnt++;
      }
    }, this.ttl * 1000);
  
    this.intervals.set(tid, interval);
  }

  async ack(userIdThatFullfilled: string, tid: string, sessionId: string): Promise<{ success: boolean; status: string }> {
    // Fetch deviceId from sessionId
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

    // reward this device is verified correctly!
    // console.log(`Device ID associated with VerifyOTP: ${deviceId}`);

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
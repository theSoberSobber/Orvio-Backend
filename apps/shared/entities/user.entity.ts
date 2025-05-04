import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne } from 'typeorm';
import { Session } from './session.entity';
import { Device } from './device.entity';
import { ApiKey } from './apiKey.entity';

export enum CreditMode {
  DIRECT = 'direct',
  MODERATE = 'moderate',
  STRICT = 'strict'
}

export enum CreditCost {
  DIRECT = 1,
  MODERATE = 1,
  STRICT = 2
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column({ default: 50 })
  credits: number;

  @Column({ default: 0 })
  cashbackPoints: number;

  @Column({
    type: 'enum',
    enum: CreditMode,
    default: CreditMode.MODERATE
  })
  creditMode: CreditMode;

  @OneToMany(() => Session, (session) => session.user, { cascade: true })
  sessions: Session[];

  @OneToOne(() => Device, (device) => device.user, { cascade: true })
  device: Device;

  @OneToMany(() => ApiKey, (apiKey) => apiKey.user, { eager: true, cascade: true })
  apiKeys: ApiKey[];
}
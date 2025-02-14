import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ unique: true })
  deviceHash: string;

  @Column({ unique: true })
  fcmToken: string;

  @ManyToOne(() => User, (user) => user.devices, { onDelete: 'CASCADE' })
  user: User;

  @Column({ default: 0 })
  failedToSendAck: number;

  @Column({ default: 0 })
  sentAckNotVerified: number;

  @Column({ default: 0 })
  sentAckVerified: number;

  @Column({ default: 0 })
  totalMessagesSent: number;
}
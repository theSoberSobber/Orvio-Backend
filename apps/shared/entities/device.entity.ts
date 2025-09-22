import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ unique: true, nullable: false })
  phoneNumber: string;

  @Column({ unique: true })
  fcmToken: string;

  @OneToOne(() => User, (user) => user.device, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column({ default: 0 })
  failedToSendAck: number;

  @Column({ default: 0 })
  sentAckNotVerified: number;

  @Column({ default: 0 })
  sentAckVerified: number;

  @Column({ default: 0 })
  totalMessagesSent: number;

  @Column({ default: 0 })
  messageSentSuccessfully: number;

  @Column({ default: 0 })
  messageTried: number;
}
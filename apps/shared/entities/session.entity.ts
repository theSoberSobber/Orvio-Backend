import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { User } from './user.entity';
import { Device } from './device.entity';
import { ApiKey } from './apiKey.entity';

@Entity()
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  refreshToken: string;

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Device, { nullable: true, onDelete: 'SET NULL' }) // Optional device link
  @JoinColumn({ name: 'deviceId' })
  device?: Device;

  @OneToOne(() => ApiKey, (apiKey) => apiKey.session, { nullable: true }) // Make it nullable
  apiKey?: ApiKey;
}
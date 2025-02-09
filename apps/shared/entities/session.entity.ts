import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Device } from './device.entity';

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
}
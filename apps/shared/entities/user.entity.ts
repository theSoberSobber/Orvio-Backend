import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne } from 'typeorm';
import { Session } from './session.entity';
import { Device } from './device.entity';
import { ApiKey } from './apiKey.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phoneNumber: string;

  @OneToMany(() => Session, (session) => session.user, { cascade: true })
  sessions: Session[];

  @OneToOne(() => Device, (device) => device.user, { cascade: true })
  device: Device;

  @OneToMany(() => ApiKey, (apiKey) => apiKey.user, { eager: true, cascade: true })
  apiKeys: ApiKey[];

}
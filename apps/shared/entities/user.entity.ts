import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
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

  @OneToMany(() => Device, (device) => device.user, { cascade: true })
  devices: Device[];

  @OneToMany(() => ApiKey, (apiKey) => apiKey.user, { eager: true, cascade: true })
  apiKeys: ApiKey[];

}
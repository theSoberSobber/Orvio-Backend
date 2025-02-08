import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';

// session is mostly tied to a device
// but should probably not tie
// cus it might be that a web dashboard is needed
// in the future
// it doesn't serve any purpose anyways
// so let's keep session and devices independent

@Entity()
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  refreshToken: string;

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  user: User;
}
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
import { Session } from "./session.entity";

@Entity()
export class ApiKey {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    name: string; // Friendly name for API key

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    lastUsed: Date;

    @ManyToOne(() => User, (user) => user.apiKeys, { onDelete: 'CASCADE' })
    user: User;

    @OneToOne(() => Session, { onDelete: 'CASCADE' })
    @JoinColumn()
    session: Session;
}
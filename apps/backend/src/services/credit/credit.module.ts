import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'apps/shared/entities/user.entity';
import { CreditService } from './credit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
  ],
  providers: [CreditService],
  exports: [CreditService],
})
export class CreditModule {} 
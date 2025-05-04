import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection } from 'typeorm';
import { User, CreditMode } from 'apps/shared/entities/user.entity';

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);
  private readonly cashbackRate = 0.1; // 10% cashback rate

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private connection: Connection,
  ) {}

  /**
   * Check if user has enough credits and deduct them atomically
   * @param userId User ID to check credits for
   * @param amount Amount of credits to deduct (default: 1)
   * @returns Boolean indicating if credits were successfully deducted
   */
  async checkAndDeductCredits(userId: string, amount: number = 1): Promise<boolean> {
    // Use a transaction to ensure atomicity
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get user with pessimistic lock to prevent race conditions
      const user = await queryRunner.manager
        .createQueryBuilder(User, 'user')
        .setLock('pessimistic_write')
        .where('user.id = :userId', { userId })
        .getOne();

      if (!user) {
        throw new Error('User not found');
      }

      if (user.credits < amount) {
        // Not enough credits
        this.logger.warn(`User ${userId} has insufficient credits: ${user.credits} < ${amount}`);
        await queryRunner.rollbackTransaction();
        return false;
      }

      // Deduct credits
      user.credits -= amount;
      await queryRunner.manager.save(user);
      await queryRunner.commitTransaction();
      
      this.logger.log(`Deducted ${amount} credits from user ${userId}. New balance: ${user.credits}`);
      return true;

    } catch (error) {
      this.logger.error(`Error in checkAndDeductCredits: ${error.message}`, error.stack);
      await queryRunner.rollbackTransaction();
      return false;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Refund credits to a user
   * @param userId User ID to refund credits to
   * @param amount Amount of credits to refund (default: 1)
   */
  async refundCredits(userId: string, amount: number = 1): Promise<boolean> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get user with pessimistic lock to prevent race conditions
      const user = await queryRunner.manager
        .createQueryBuilder(User, 'user')
        .setLock('pessimistic_write')
        .where('user.id = :userId', { userId })
        .getOne();

      if (!user) {
        throw new Error('User not found');
      }

      // Add credits
      user.credits += amount;
      await queryRunner.manager.save(user);
      await queryRunner.commitTransaction();
      
      this.logger.log(`Refunded ${amount} credits to user ${userId}. New balance: ${user.credits}`);
      return true;

    } catch (error) {
      this.logger.error(`Error in refundCredits: ${error.message}`, error.stack);
      await queryRunner.rollbackTransaction();
      return false;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Add cashback points to a user when they acknowledge an OTP
   * @param userId User ID to add cashback points to
   * @param creditCost The original cost in credits (default: 1)
   * @returns Boolean indicating if cashback points were successfully added
   */
  async addCashbackPoints(userId: string, creditCost: number = 1): Promise<boolean> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get user with pessimistic lock to prevent race conditions
      const user = await queryRunner.manager
        .createQueryBuilder(User, 'user')
        .setLock('pessimistic_write')
        .where('user.id = :userId', { userId })
        .getOne();

      if (!user) {
        throw new Error('User not found');
      }

      // Calculate cashback points (10% of credit cost)
      const cashbackToAdd = parseFloat((creditCost * this.cashbackRate).toFixed(2));
      
      // Add cashback points
      const currentPoints = parseFloat(user.cashbackPoints.toString() || '0');
      const newTotal = parseFloat((currentPoints + cashbackToAdd).toFixed(2));
      
      // Directly update with exact value to avoid addition issues
      await queryRunner.manager
        .createQueryBuilder()
        .update(User)
        .set({ cashbackPoints: newTotal })
        .where('id = :userId', { userId })
        .execute();
      
      await queryRunner.commitTransaction();
      
      this.logger.log(`Added ${cashbackToAdd} cashback points to user ${userId}. New balance: ${newTotal}`);
      return true;

    } catch (error) {
      this.logger.error(`Error in addCashbackPoints: ${error.message}`, error.stack);
      await queryRunner.rollbackTransaction();
      return false;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get user's current credit balance
   * @param userId User ID to get credits for
   * @returns Number of credits available
   */
  async getCredits(userId: string): Promise<number> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    return user.credits;
  }

  /**
   * Get user's current cashback points balance
   * @param userId User ID to get cashback points for
   * @returns Number of cashback points available
   */
  async getCashbackPoints(userId: string): Promise<number> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    return user.cashbackPoints;
  }

  /**
   * Get user's current credit mode
   * @param userId User ID to get credit mode for
   * @returns Current credit mode
   */
  async getCreditMode(userId: string): Promise<CreditMode> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    return user.creditMode;
  }

  /**
   * Set user's credit mode
   * @param userId User ID to update
   * @param mode New credit mode
   */
  async setCreditMode(userId: string, mode: CreditMode): Promise<void> {
    await this.userRepo.update({ id: userId }, { creditMode: mode });
    this.logger.log(`Updated credit mode for user ${userId} to ${mode}`);
  }
} 
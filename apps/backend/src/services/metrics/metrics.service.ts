import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from 'apps/shared/entities/device.entity';

/**
 * MetricsService - Handles updating metrics for devices
 * Currently updates the database directly, but can be modified to use Kafka in the future
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    @InjectRepository(Device) private readonly deviceRepo: Repository<Device>
  ) {}

  /**
   * Update a specific metric for a device
   * @param deviceId The ID of the device to update
   * @param metricName The name of the metric to update (must match a field in the Device entity)
   * @param change The change to apply (e.g., +1, -1)
   */
  async updateMetric(deviceId: string, metricName: string, change: number): Promise<void> {
    try {
      if (!deviceId) {
        this.logger.warn(`Cannot update metric ${metricName} - no device ID provided`);
        return;
      }

      // Get current device with existing metric values
      const device = await this.deviceRepo.findOne({ where: { id: deviceId } });
      if (!device) {
        this.logger.warn(`Device not found for ID: ${deviceId}`);
        return;
      }

      // Validate the metric name is a valid field in Device entity
      if (!(metricName in device)) {
        this.logger.warn(`Invalid metric name: ${metricName}`);
        return;
      }

      // Update the metric value
      const currentValue = device[metricName] || 0;
      const newValue = currentValue + change;
      
      // Ensure we don't go below zero for any metric
      device[metricName] = Math.max(0, newValue);
      
      this.logger.log(`Updating metric ${metricName} for device ${deviceId}: ${currentValue} => ${device[metricName]}`);
      
      // Save the updated device
      await this.deviceRepo.update(deviceId, { [metricName]: device[metricName] });
    } catch (error) {
      this.logger.error(`Error updating metric ${metricName} for device ${deviceId}: ${error.message}`);
    }
  }

  /**
   * Increment a metric for a device
   * @param deviceId The ID of the device to update
   * @param metricName The name of the metric to increment
   */
  async incrementMetric(deviceId: string, metricName: string): Promise<void> {
    return this.updateMetric(deviceId, metricName, 1);
  }

  /**
   * Decrement a metric for a device
   * @param deviceId The ID of the device to update
   * @param metricName The name of the metric to decrement
   */
  async decrementMetric(deviceId: string, metricName: string): Promise<void> {
    return this.updateMetric(deviceId, metricName, -1);
  }
} 
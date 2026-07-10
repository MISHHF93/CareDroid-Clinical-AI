import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { emergencyRoomsFixture, emergencyStaffFixture } from './emergency-os.fixtures';
import { Room } from './entities/room.entity';
import { Staff } from './entities/staff.entity';

/**
 * Rooms and staff are static reference data (never mutated after process
 * start — see `EmergencyPatientService`) sourced from `emergency-os.fixtures`.
 * This seeds them into the real `rooms`/`staff` tables once, idempotently,
 * so a future patient read-cutover has real DB rows to join against.
 */
@Injectable()
export class EmergencyReferenceDataSeedService implements OnModuleInit {
  private readonly logger = new Logger(EmergencyReferenceDataSeedService.name);

  constructor(
    @InjectRepository(Room) private readonly roomRepository: Repository<Room>,
    @InjectRepository(Staff) private readonly staffRepository: Repository<Staff>,
  ) {}

  async onModuleInit() {
    await this.seedIfEmpty();
  }

  async seedIfEmpty() {
    await this.seedRoomsIfEmpty();
    await this.seedStaffIfEmpty();
  }

  private async seedRoomsIfEmpty() {
    const count = await this.roomRepository.count();
    if (count > 0) return;
    for (const room of emergencyRoomsFixture) {
      await this.roomRepository.save(this.roomRepository.create({ ...room }));
    }
    this.logger.log(`Seeded ${emergencyRoomsFixture.length} rooms`);
  }

  private async seedStaffIfEmpty() {
    const count = await this.staffRepository.count();
    if (count > 0) return;
    for (const staff of emergencyStaffFixture) {
      await this.staffRepository.save(this.staffRepository.create({ ...staff }));
    }
    this.logger.log(`Seeded ${emergencyStaffFixture.length} staff`);
  }
}

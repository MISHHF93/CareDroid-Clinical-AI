import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Protocol } from './entities/protocol.entity';
import { CreateProtocolDto, UpdateProtocolDto, SearchProtocolDto } from './dto/protocol.dto';

@Injectable()
export class ProtocolService {
  constructor(
    @InjectRepository(Protocol)
    private readonly protocolRepository: Repository<Protocol>,
  ) {}

  async create(createProtocolDto: CreateProtocolDto) {
    const protocol = this.protocolRepository.create(createProtocolDto);
    return this.protocolRepository.save(protocol);
  }

  async findAll(searchDto: SearchProtocolDto) {
    const { search, category, page = 1, limit = 20 } = searchDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.protocolRepository.createQueryBuilder('protocol');

    if (search) {
      queryBuilder.where('(protocol.name ILIKE :search OR protocol.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (category) {
      queryBuilder.andWhere('protocol.category = :category', { category });
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('protocol.name', 'ASC')
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const protocol = await this.protocolRepository.findOne({ where: { id } });
    if (!protocol) {
      throw new Error('Protocol not found');
    }
    return protocol;
  }

  async update(id: string, updateProtocolDto: UpdateProtocolDto) {
    const protocol = await this.findOne(id);
    Object.assign(protocol, updateProtocolDto);
    return this.protocolRepository.save(protocol);
  }

  async remove(id: string) {
    const protocol = await this.findOne(id);
    await this.protocolRepository.remove(protocol);
    return { success: true, message: 'Protocol deleted successfully' };
  }

  async getCategories() {
    const result = await this.protocolRepository
      .createQueryBuilder('protocol')
      .select('DISTINCT protocol.category', 'category')
      .getRawMany();

    return result.map((r) => r.category);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Drug } from './entities/drug.entity';
import { CreateDrugDto, UpdateDrugDto, SearchDrugDto } from './dto/drug.dto';

@Injectable()
export class DrugService {
  constructor(
    @InjectRepository(Drug)
    private readonly drugRepository: Repository<Drug>,
  ) {}

  async create(createDrugDto: CreateDrugDto) {
    const drug = this.drugRepository.create(createDrugDto);
    return this.drugRepository.save(drug);
  }

  async findAll(searchDto: SearchDrugDto) {
    const { search, category, page = 1, limit = 20 } = searchDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.drugRepository.createQueryBuilder('drug');

    if (search) {
      queryBuilder.where('(drug.name ILIKE :search OR drug.genericName ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (category) {
      queryBuilder.andWhere('drug.category = :category', { category });
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('drug.name', 'ASC')
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
    const drug = await this.drugRepository.findOne({ where: { id } });
    if (!drug) {
      throw new Error('Drug not found');
    }
    return drug;
  }

  async update(id: string, updateDrugDto: UpdateDrugDto) {
    const drug = await this.findOne(id);
    Object.assign(drug, updateDrugDto);
    return this.drugRepository.save(drug);
  }

  async remove(id: string) {
    const drug = await this.findOne(id);
    await this.drugRepository.remove(drug);
    return { success: true, message: 'Drug deleted successfully' };
  }

  async getCategories() {
    const result = await this.drugRepository
      .createQueryBuilder('drug')
      .select('DISTINCT drug.category', 'category')
      .getRawMany();

    return result.map((r) => r.category);
  }
}

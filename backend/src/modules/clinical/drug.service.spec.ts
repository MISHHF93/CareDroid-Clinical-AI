import { Test, TestingModule } from '@nestjs/testing';
import { DrugService } from './drug.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Drug } from './entities/drug.entity';
import { Repository } from 'typeorm';

describe('DrugService', () => {
  let service: DrugService;
  let _repository: Repository<Drug>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrugService,
        {
          provide: getRepositoryToken(Drug),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DrugService>(DrugService);
    _repository = module.get<Repository<Drug>>(getRepositoryToken(Drug));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all drugs with pagination', async () => {
      const mockDrugs = [
        { id: '1', name: 'Aspirin', category: 'Pain Relief' },
        { id: '2', name: 'Ibuprofen', category: 'Pain Relief' },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockDrugs, 2]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toHaveProperty('items', mockDrugs);
      expect(result).toHaveProperty('total', 2);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
    });

    it('should filter drugs by search term', async () => {
      const mockDrugs = [{ id: '1', name: 'Aspirin', category: 'Pain Relief' }];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockDrugs, 1]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll({ search: 'aspirin', page: 1, limit: 10 });

      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(result.items).toEqual(mockDrugs);
    });
  });

  describe('findOne', () => {
    it('should return a drug by id', async () => {
      const mockDrug = { id: '1', name: 'Aspirin', category: 'Pain Relief' };

      mockRepository.findOne.mockResolvedValue(mockDrug);

      const result = await service.findOne('1');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual(mockDrug);
    });

    it('should throw error if drug not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow('Drug not found');
    });
  });

  describe('create', () => {
    it('should create a new drug', async () => {
      const createDto = {
        name: 'Aspirin',
        genericName: 'acetylsalicylic acid',
        category: 'Pain Relief',
        dosage: '81-325 mg',
        indications: 'Pain relief, fever reduction',
      };

      const mockDrug = { id: '1', ...createDto };

      mockRepository.create.mockReturnValue(mockDrug);
      mockRepository.save.mockResolvedValue(mockDrug);

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockDrug);
      expect(result).toEqual(mockDrug);
    });
  });

  describe('update', () => {
    it('should update an existing drug', async () => {
      const updateDto = { name: 'Updated Aspirin' };
      const existingDrug = { id: '1', name: 'Aspirin', category: 'Pain Relief' };
      const updatedDrug = { ...existingDrug, ...updateDto };

      mockRepository.findOne.mockResolvedValue(existingDrug);
      mockRepository.save.mockResolvedValue(updatedDrug);

      const result = await service.update('1', updateDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(mockRepository.save).toHaveBeenCalledWith(updatedDrug);
      expect(result).toEqual(updatedDrug);
    });

    it('should throw error if drug not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', {})).rejects.toThrow('Drug not found');
    });
  });

  describe('remove', () => {
    it('should delete a drug', async () => {
      const existingDrug = { id: '1', name: 'Aspirin' };

      mockRepository.findOne.mockResolvedValue(existingDrug);
      mockRepository.remove.mockResolvedValue(existingDrug);

      const result = await service.remove('1');

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(mockRepository.remove).toHaveBeenCalledWith(existingDrug);
      expect(result).toHaveProperty('success', true);
    });

    it('should throw error if drug not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow('Drug not found');
    });
  });
});

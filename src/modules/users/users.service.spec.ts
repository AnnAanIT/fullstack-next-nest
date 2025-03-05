import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  // Mock data
  const mockUser = {
    id: 1,
    username: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateUserDto = {
    username: 'Test User',
    email: 'test@example.com',
    password: 'Password123!',
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a new user', async () => {
      // Mock findByEmail to return null (no existing user)
      mockRepository.findOne.mockResolvedValue(null);

      // Mock bcrypt hash
      const hashedPassword = 'hashedPassword123';
      jest.spyOn(bcrypt, 'genSalt').mockResolvedValue('salt' as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword as never);

      // Mock create and save
      const savedUser = {
        id: 1,
        ...mockCreateUserDto,
        password: hashedPassword,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.create.mockReturnValue(savedUser);
      mockRepository.save.mockResolvedValue(savedUser);

      const result = await service.create(mockCreateUserDto);

      // Check result
      expect(result).toEqual({
        id: 1,
        username: mockCreateUserDto.username,
        email: mockCreateUserDto.email,
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      // Verify password is not in response
      expect(result).not.toHaveProperty('password');

      // Verify method calls
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockCreateUserDto.email },
      });
      expect(bcrypt.genSalt).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(
        mockCreateUserDto.password,
        'salt',
      );
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...mockCreateUserDto,
        password: hashedPassword,
      });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      // Mock findByEmail to return existing user
      mockRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.create(mockCreateUserDto)).rejects.toThrow(
        new ConflictException('Email đã tồn tại trong hệ thống'),
      );

      // Verify only findOne was called
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockCreateUserDto.email },
      });
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors during creation', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateUserDto)).rejects.toThrow();
    });

    it('should handle database errors during findByEmail', async () => {
      mockRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.findByEmail('test@example.com')).rejects.toThrow();
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });
});
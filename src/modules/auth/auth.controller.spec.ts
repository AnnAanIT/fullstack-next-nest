import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Connection } from 'typeorm';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  // Mock data
  const mockLoginDto = {
    email: 'test@example.com',
    password: 'Password123!',
  };

  const mockAuthResponse = {
    access_token: 'mock.jwt.token',
    user: {
      id: 1,
      email: 'test@example.com',
      username: 'Test User',
    },
  };

  // Mock services
  const mockAuthService = {
    login: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
  };

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  // Mock connection
  const mockConnection = {
    // Add any connection methods you're using
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: Connection,
          useValue: mockConnection,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return access token and user data', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(mockLoginDto);

      expect(result).toEqual(mockAuthResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(mockLoginDto);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(controller.login(mockLoginDto)).rejects.toThrow();
      expect(mockAuthService.login).toHaveBeenCalledWith(mockLoginDto);
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

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

  const mockLoginDto = {
    email: 'test@example.com',
    password: 'Password123!',
  };

  // Mock services
  const mockUsersService = {
    findByEmail: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login and return access token', async () => {
      // Mock successful user find
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      // Mock successful password comparison
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      // Mock JWT sign
      const mockToken = 'mock.jwt.token';
      mockJwtService.signAsync.mockResolvedValue(mockToken);

      const result = await service.login(mockLoginDto);

      // Check result structure
      expect(result).toEqual({
        access_token: mockToken,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
        },
      });

      // Verify method calls
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(mockLoginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        mockLoginDto.password,
        mockUser.password,
      );
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Mock user not found
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        new UnauthorizedException('Email hoặc mật khẩu không đúng'),
      );

      // Verify findByEmail was called but not bcrypt.compare
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(mockLoginDto.email);
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      // Mock user found but invalid password
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        new UnauthorizedException('Email hoặc mật khẩu không đúng'),
      );

      // Verify methods called
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(mockLoginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        mockLoginDto.password,
        mockUser.password,
      );
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should handle bcrypt compare errors', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => 
        Promise.reject(new Error('Bcrypt error'))
      );

      await expect(service.login(mockLoginDto)).rejects.toThrow();
    });

    it('should handle JWT sign errors', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
      mockJwtService.signAsync.mockRejectedValue(new Error('JWT error'));

      await expect(service.login(mockLoginDto)).rejects.toThrow();
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });
});
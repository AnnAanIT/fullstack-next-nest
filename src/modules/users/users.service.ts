import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll() {
    return await this.usersRepository.find({
      select: ['id', 'username', 'email', 'isActive', 'createdAt', 'updatedAt'] // không trả về password
    });
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'username', 'email', 'isActive', 'createdAt', 'updatedAt']
    });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Kiểm tra email đã tồn tại chưa
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email is existed');
    }

    // Hash password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    // Tạo user mới
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    // Lưu vào database
    const savedUser = await this.usersRepository.save(user);

    // Loại bỏ password trước khi trả về
    const { password, ...result } = savedUser;
    return result as User;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);
    
    // Nếu có cập nhật password thì hash password mới
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    
    Object.assign(user, updateUserDto);
    return await this.usersRepository.save(user);
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
    return { message: `User #${id} deleted successfully` };
  }
}

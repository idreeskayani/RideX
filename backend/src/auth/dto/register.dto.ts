import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsMobilePhone } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;
}
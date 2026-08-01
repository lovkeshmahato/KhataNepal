import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty()
  @IsString()
  fullName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ type: [String], description: "Role IDs to assign" })
  @IsArray()
  @ArrayMinSize(1)
  roleIds!: string[];

  @ApiProperty({ type: [String], description: "Branch IDs this user may operate in" })
  @IsArray()
  branchIds!: string[];
}

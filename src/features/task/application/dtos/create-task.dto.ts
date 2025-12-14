import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({
    description: 'The title of the task',
    example: 'Complete project documentation',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'The due date for the task',
    example: '2025-12-31T23:59:59.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  dueDate: string;
}

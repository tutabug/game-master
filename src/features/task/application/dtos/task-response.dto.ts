import { ApiProperty } from '@nestjs/swagger';

export class TaskResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the task',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'The title of the task',
    example: 'Complete project documentation',
  })
  title: string;

  @ApiProperty({
    description: 'The due date for the task',
    example: '2025-12-31T23:59:59.000Z',
  })
  dueDate: Date;

  @ApiProperty({
    description: 'The creation date of the task',
    example: '2025-12-07T10:00:00.000Z',
  })
  createdAt: Date;
}

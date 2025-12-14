import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CreateTaskUseCase } from '../../application/use-cases/create-task.use-case';
import { CreateTaskDto } from '../../application/dtos/create-task.dto';
import { TaskResponseDto } from '../../application/dtos/task-response.dto';

@ApiTags('tasks')
@Controller('tasks')
export class TaskController {
  constructor(private readonly createTaskUseCase: CreateTaskUseCase) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiBody({ type: CreateTaskDto })
  @ApiResponse({
    status: 201,
    description: 'The task has been successfully created.',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data.' })
  async create(@Body() createTaskDto: CreateTaskDto): Promise<TaskResponseDto> {
    const task = await this.createTaskUseCase.execute(createTaskDto);
    return {
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
    };
  }
}

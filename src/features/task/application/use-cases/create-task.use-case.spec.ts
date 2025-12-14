import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { CreateTaskUseCase } from './create-task.use-case';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { Task } from '../../domain/entities/task.entity';

describe('CreateTaskUseCase', () => {
  let useCase: CreateTaskUseCase;
  let mockTaskRepository: MockProxy<TaskRepository>;

  beforeEach(async () => {
    mockTaskRepository = mock<TaskRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTaskUseCase,
        {
          provide: TaskRepository,
          useValue: mockTaskRepository,
        },
      ],
    }).compile();

    useCase = module.get<CreateTaskUseCase>(CreateTaskUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should create a task successfully', async () => {
    const createTaskDto = {
      title: 'Test Task',
      dueDate: '2025-12-31T23:59:59.000Z',
    };

    const expectedTask = new Task('123', 'Test Task', new Date(createTaskDto.dueDate));

    mockTaskRepository.save.mockResolvedValue(expectedTask);

    const result = await useCase.execute(createTaskDto);

    expect(result).toEqual(expectedTask);
    expect(mockTaskRepository.save).toHaveBeenCalledTimes(1);
    expect(mockTaskRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: createTaskDto.title,
        dueDate: new Date(createTaskDto.dueDate),
      }),
    );
  });

  it('should propagate repository errors', async () => {
    const createTaskDto = {
      title: 'Test Task',
      dueDate: '2025-12-31T23:59:59.000Z',
    };

    const error = new Error('Database error');
    mockTaskRepository.save.mockRejectedValue(error);

    await expect(useCase.execute(createTaskDto)).rejects.toThrow('Database error');
  });
});

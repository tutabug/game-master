# Development Guide

## 🏗️ Clean Architecture Explained

This project follows clean architecture principles with strict dependency rules.

### Layers

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│      (Controllers, HTTP)                │
│  src/presentation/controllers/          │
└──────────────┬──────────────────────────┘
               │ depends on ↓
┌──────────────▼──────────────────────────┐
│        Application Layer                │
│     (Use Cases, DTOs)                   │
│  src/application/use-cases/             │
│  src/application/dtos/                  │
└──────────────┬──────────────────────────┘
               │ depends on ↓
┌──────────────▼──────────────────────────┐
│          Domain Layer                   │
│  (Entities, Repository Interfaces)      │
│  src/domain/entities/                   │
│  src/domain/repositories/               │
└──────────────▲──────────────────────────┘
               │ implements ↑
┌──────────────┴──────────────────────────┐
│      Infrastructure Layer               │
│    (Database, External Services)        │
│  src/infrastructure/persistence/        │
└─────────────────────────────────────────┘
```

### Key Rules

1. **Domain** has NO dependencies on other layers
2. **Application** depends only on Domain
3. **Infrastructure** implements Domain interfaces
4. **Presentation** depends on Application

## 📝 Adding a New Feature

Let's say you want to add a "Get All Tasks" feature.

### Step 1: Domain Layer (if needed)

The Task entity already exists, so skip this step. The repository interface also exists.

### Step 2: Application Layer

**Create DTO (if needed):**
```typescript
// src/application/dtos/get-all-tasks-response.dto.ts
export class GetAllTasksResponseDto {
  tasks: TaskResponseDto[];
  total: number;
}
```

**Create Use Case:**
```typescript
// src/application/use-cases/get-all-tasks.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { TASK_REPOSITORY, TaskRepository } from '@/domain/repositories/task.repository';

@Injectable()
export class GetAllTasksUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: TaskRepository,
  ) {}

  async execute() {
    return this.taskRepository.findAll();
  }
}
```

### Step 3: Controller

**Add endpoint:**
```typescript
// src/presentation/controllers/task.controller.ts
@Get()
@ApiOperation({ summary: 'Get all tasks' })
@ApiResponse({ status: 200, type: [TaskResponseDto] })
async findAll(): Promise<TaskResponseDto[]> {
  const tasks = await this.getAllTasksUseCase.execute();
  return tasks.map(task => ({
    id: task.id,
    title: task.title,
    dueDate: task.dueDate,
    createdAt: task.createdAt,
  }));
}
```

### Step 4: Wire it up

**Update TaskModule:**
```typescript
// src/task/task.module.ts
providers: [
  CreateTaskUseCase,
  GetAllTasksUseCase,  // Add this
],
```

**Update Controller constructor:**
```typescript
constructor(
  private readonly createTaskUseCase: CreateTaskUseCase,
  private readonly getAllTasksUseCase: GetAllTasksUseCase,  // Add this
) {}
```

### Step 5: Add Tests

**Unit test:**
```typescript
// src/application/use-cases/get-all-tasks.use-case.spec.ts
describe('GetAllTasksUseCase', () => {
  it('should return all tasks', async () => {
    // ... test implementation
  });
});
```

**Integration test:**
```typescript
// Add to task.controller.integration.spec.ts
describe('GET /tasks', () => {
  it('should return all tasks', async () => {
    // Create some tasks first
    await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: 'Task 1', dueDate: '2025-12-31' });
    
    // Get all tasks
    const response = await request(app.getHttpServer())
      .get('/tasks')
      .expect(200);
    
    expect(response.body).toHaveLength(1);
  });
});
```

## 🧪 Testing Best Practices

### Unit Tests

- Mock all dependencies using Jest
- Test one thing at a time
- Name: `*.spec.ts` (side-by-side with source)
- Fast execution (< 1 second)

**Example:**
```typescript
const mockRepository = {
  save: jest.fn(),
  findAll: jest.fn(),
};

const module = await Test.createTestingModule({
  providers: [
    UseCase,
    { provide: TASK_REPOSITORY, useValue: mockRepository },
  ],
}).compile();
```

### Integration Tests

- Use real MongoDB via Testcontainers
- Test full request/response cycle
- Name: `*.integration.spec.ts`
- Clean database between tests

**Example:**
```typescript
beforeAll(async () => {
  // Start MongoDB container
  mongoContainer = await new GenericContainer('mongo:7')
    .withExposedPorts(27017)
    .start();
});

afterEach(async () => {
  // Clean database for test isolation
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});
```

## 🔧 Dependency Injection

### Repository Pattern

**1. Define interface in domain:**
```typescript
// src/domain/repositories/task.repository.ts
export interface TaskRepository {
  save(task: Task): Promise<Task>;
}
export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');
```

**2. Implement in infrastructure:**
```typescript
// src/infrastructure/persistence/repositories/mongoose-task.repository.ts
@Injectable()
export class MongooseTaskRepository implements TaskRepository {
  async save(task: Task): Promise<Task> {
    // Implementation
  }
}
```

**3. Provide in module:**
```typescript
// src/infrastructure/persistence/persistence.module.ts
providers: [
  {
    provide: TASK_REPOSITORY,
    useClass: MongooseTaskRepository,
  },
],
```

**4. Inject in use case:**
```typescript
// src/application/use-cases/create-task.use-case.ts
constructor(
  @Inject(TASK_REPOSITORY)
  private readonly taskRepository: TaskRepository,
) {}
```

## 📦 Working with DTOs

### Request DTOs

Always include:
- `class-validator` decorators for validation
- `@ApiProperty` for Swagger documentation

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ 
    description: 'Task title',
    example: 'Complete documentation',
  })
  @IsString()
  @IsNotEmpty()
  title: string;
}
```

### Response DTOs

Include `@ApiProperty` for documentation:

```typescript
export class TaskResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;
  
  @ApiProperty({ example: 'Complete documentation' })
  title: string;
}
```

## 🔍 Common Patterns

### Mapping Domain to DTO

```typescript
// In controller
const task = await this.useCase.execute(dto);
return {
  id: task.id,
  title: task.title,
  dueDate: task.dueDate,
  createdAt: task.createdAt,
};
```

### Mapping Document to Domain

```typescript
// In repository
private toDomain(document: TaskDocument): Task {
  return new Task(
    document._id.toString(),
    document.title,
    document.dueDate,
    document.createdAt,
  );
}
```

## 🐳 Docker Tips

### Build and run
```bash
docker-compose up --build
```

### Run in background
```bash
docker-compose up -d
```

### View logs
```bash
docker-compose logs -f app
```

### Stop and remove
```bash
docker-compose down
```

### Remove volumes (clean database)
```bash
docker-compose down -v
```

## 🎯 Code Quality Checklist

Before committing:

- [ ] Run `pnpm run lint` - no errors
- [ ] Run `pnpm run format` - code formatted
- [ ] Run `pnpm test` - all unit tests pass
- [ ] Add unit tests for new code
- [ ] Add integration tests for new endpoints
- [ ] Update Swagger documentation
- [ ] Follow clean architecture principles
- [ ] Update README if adding major features

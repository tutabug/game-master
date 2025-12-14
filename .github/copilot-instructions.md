# Copilot Instructions - Task Management API

## Architecture Overview

This is a **Vertical Slice Architecture** with **Clean Architecture** within each slice:

```
src/
  features/
    task/
      domain/           # Pure business entities and repository interfaces
      application/      # Use cases and DTOs
      infrastructure/   # Mongoose schemas and repository implementations
      presentation/     # HTTP controllers
      task.module.ts    # Feature module (self-contained)
  
  shared/
    infrastructure/
      database/         # Shared MongoDB connection
```

### Key Principles
- **Vertical Slices**: Each feature is self-contained with its own Clean Architecture layers
- **Clean Architecture within Slices**: Dependency rules flow inward (Presentation → Application → Domain)
- **Shared Infrastructure**: Cross-cutting concerns (database connection) live in `shared/`
- **No Cross-Feature Dependencies**: Features cannot import from each other
- **Domain Independence**: Domain layer has no external dependencies

## Project Conventions

### Package Manager
- **Always use `pnpm`** for dependency management
- Commands: `pnpm install`, `pnpm add`, `pnpm remove`
- Never use `npm` or `yarn`

### File Organization
- **Vertical Slices**: Each feature in `src/features/<feature-name>/`
- **Clean Architecture Layers** within each feature:
  - `domain/` - Entities and repository interfaces
  - `application/` - Use cases and DTOs
  - `infrastructure/` - Schemas and repository implementations
  - `presentation/` - Controllers and API layer
- **Tests Side-by-Side** with source files:
  - Unit tests: `*.spec.ts` (e.g., `task.entity.spec.ts`)
  - Integration tests: `*.integration.spec.ts` (e.g., `task.controller.integration.spec.ts`)
- **Shared Concerns**: Cross-cutting infrastructure in `src/shared/`
  - `infrastructure/` - Database module, external services
  - `config/` - Environment validation schemas

### Environment Configuration
- **Environment Variables**: Loaded from `.env` file (gitignored)
- **Validation**: Using Joi schemas in `src/shared/config/env.validation.ts`
- **Type Safety**: Access via `ConfigService` throughout the app
- **Template**: `.env.example` shows required variables

```typescript
// src/shared/config/env.validation.ts
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  MONGODB_URI: Joi.string().required(),
});

// app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: '.env',
  validationSchema: envValidationSchema,
  validationOptions: {
    allowUnknown: true,
    abortEarly: false,
  },
})
```

### Dependency Injection Pattern
Use **abstract classes** instead of interfaces for types that need to be injected:
```typescript
// domain/repositories/task.repository.ts
export abstract class TaskRepository {
  abstract save(task: Task): Promise<Task>;
  abstract findById(id: string): Promise<Task | null>;
}

// Inject directly using the abstract class
constructor(private readonly taskRepository: TaskRepository) {}

// Provide in module
providers: [
  {
    provide: TaskRepository,
    useClass: MongooseTaskRepository,
  },
]
```

**Why abstract classes?** NestJS can use them as injection tokens directly, eliminating the need for Symbol tokens and reducing boilerplate.

### DTO Validation
All DTOs use `class-validator` decorators AND `@ApiProperty` for Swagger:
```typescript
@ApiProperty({ description: '...', example: '...' })
@IsString()
@IsNotEmpty()
title: string;
```

### Swagger Documentation
- Tag controllers with `@ApiTags('resource-name')`
- Document all endpoints with `@ApiOperation`, `@ApiResponse`, `@ApiBody`
- Include success (201/200) and error responses (400, 404, etc.)

## Development Workflows

### Adding a New Feature
1. Create feature directory in `src/features/<feature-name>/`
2. Create domain layer:
   - Entities in `domain/entities/`
   - Repository interfaces in `domain/repositories/` (use abstract classes)
3. Create application layer:
   - DTOs in `application/dtos/` with validation decorators
   - Use cases in `application/use-cases/`
4. Create infrastructure layer:
   - Mongoose schemas in `infrastructure/schemas/`
   - Repository implementations in `infrastructure/repositories/`
5. Create presentation layer:
   - Controllers in `presentation/controllers/`
6. Create feature module `<feature-name>.module.ts` that wires everything together
7. Import feature module in `app.module.ts`
8. Write unit tests (`.spec.ts`) and integration tests (`.integration.spec.ts`)

### Running Tests
- **Unit tests**: `pnpm test` - Fast, mocked dependencies
- **Integration tests**: `pnpm run test:integration` - Uses Testcontainers for real MongoDB

### Integration Test Pattern
Each integration test:
1. Spins up MongoDB via Testcontainers in `beforeAll`
2. Initializes clean NestJS app in `beforeEach`
3. **Cleans database** in `afterEach` - ensures test isolation
4. Stops container in `afterAll`

Example database cleanup:
```typescript
afterEach(async () => {
  const mongoose = require('mongoose');
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
  await app.close();
});
```

### Docker Commands
- Local dev with hot reload: `docker-compose up`
- MongoDB runs on port 27017
- App runs on port 3000, Swagger at http://localhost:3000/api

## MongoDB/Mongoose Patterns

### Schema Definition
Use `@nestjs/mongoose` decorators:
```typescript
@Schema()
export class TaskDocument extends Document {
  @Prop({ required: true })
  title: string;
}
```

### Repository Implementation
Map between Mongoose documents and domain entities:
```typescript
private toDomain(document: TaskDocument): Task {
  return new Task(document._id.toString(), document.title, ...);
}
```

## Code Quality

- **ESLint + Prettier** configured - run `pnpm run lint` and `pnpm run format`
- Use path alias `@/` for imports: `import { Task } from '@/domain/entities/task.entity'`
- TypeScript strict mode disabled for NestJS compatibility, but write type-safe code
- **pnpm** used instead of npm for faster, more efficient dependency management
- **No comments** - Code should be self-documenting. Do not add comments when generating code

## Common Patterns

### Global Validation Pipe
Already configured in `main.ts`:
- `whitelist: true` - strips unknown properties
- `forbidNonWhitelisted: true` - throws error on extra properties
- `transform: true` - auto-transforms payloads to DTO instances

### Module Wiring
Each feature module is self-contained and registers its own schemas:
```typescript
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TaskDocument.name, schema: TaskSchema }
    ])
  ],
  controllers: [TaskController],
  providers: [
    CreateTaskUseCase,
    {
      provide: TaskRepository,
      useClass: MongooseTaskRepository,
    },
  ],
})
export class TaskModule {}
```

Shared database connection is in `DatabaseModule` (imported in `AppModule`).

## When Adding New Dependencies
Always use `pnpm` to install packages and types if needed:
```bash
pnpm add <package>
pnpm add -D @types/<package>
```

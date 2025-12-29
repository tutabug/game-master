import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { OllamaEmbeddings, ChatOllama } from '@langchain/ollama';
import { QdrantClient } from '@qdrant/js-client-rest';
import { DocumentLoaderService } from './application/services/document-loader.service';
import { SimpleTextChunkerService } from './application/services/simple-text-chunker.service';
import { MarkdownHeaderChunkerService } from './application/services/markdown-header-chunker.service';
import { ChunkerStrategyRegistry } from './application/services/chunker-strategy-registry.service';
import { OllamaEmbeddingService } from './application/services/ollama-embedding.service';
import { IngestDocumentUseCase } from './application/use-cases/ingest-document.use-case';
import { ChunkDocumentUseCase } from './application/use-cases/chunk-document.use-case';
import { ProcessEmbeddingsUseCase } from './application/use-cases/process-embeddings.use-case';
import { QueryWithContextUseCase } from './application/use-cases/query-with-context.use-case';
import { QdrantVectorRepository } from './infrastructure/repositories/qdrant-vector.repository';
import { MongooseChunkingTaskRepository } from './infrastructure/repositories/mongoose-chunking-task.repository';
import { MongooseStoredChunkRepository } from './infrastructure/repositories/mongoose-stored-chunk.repository';
import { MongooseEmbeddingTaskRepository } from './infrastructure/repositories/mongoose-embedding-task.repository';
import { QdrantVectorStoreService } from './infrastructure/services/qdrant-vector-store.service';
import { TextChunkerService } from './domain/services/text-chunker.service';
import { EmbeddingService } from './domain/services/embedding.service';
import { VectorStoreService } from './domain/services/vector-store.service';
import { VectorRepository } from './domain/repositories/vector.repository';
import { ChunkingTaskRepository } from './domain/repositories/ingestion-task.repository';
import { StoredChunkRepository } from './domain/repositories/stored-chunk.repository';
import { EmbeddingTaskRepository } from './domain/repositories/embedding-task.repository';
import {
  ChunkingTaskDocument,
  ChunkingTaskSchema,
} from './infrastructure/schemas/ingestion-task.schema';
import {
  StoredChunkDocument,
  StoredChunkSchema,
} from './infrastructure/schemas/stored-chunk.schema';
import {
  EmbeddingTaskDocument,
  EmbeddingTaskSchema,
} from './infrastructure/schemas/embedding-task.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: ChunkingTaskDocument.name, schema: ChunkingTaskSchema },
      { name: StoredChunkDocument.name, schema: StoredChunkSchema },
      { name: EmbeddingTaskDocument.name, schema: EmbeddingTaskSchema },
    ]),
  ],
  providers: [
    DocumentLoaderService,
    SimpleTextChunkerService,
    MarkdownHeaderChunkerService,
    ChunkerStrategyRegistry,
    {
      provide: TextChunkerService,
      useFactory: (registry: ChunkerStrategyRegistry) => {
        return registry;
      },
      inject: [ChunkerStrategyRegistry],
    },
    {
      provide: OllamaEmbeddings,
      useFactory: (configService: ConfigService) => {
        const baseUrl = configService.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434');
        const model = configService.get<string>('OLLAMA_MODEL', 'nomic-embed-text');
        return new OllamaEmbeddings({ baseUrl, model });
      },
      inject: [ConfigService],
    },
    {
      provide: ChatOllama,
      useFactory: (configService: ConfigService) => {
        const baseUrl = configService.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434');
        const model = configService.get<string>('OLLAMA_CHAT_MODEL', 'llama3.2');
        return new ChatOllama({
          baseUrl,
          model,
          temperature: 0.3, // Lower temperature for more factual responses
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'CHUNKER_REGISTRY_INIT',
      useFactory: (
        registry: ChunkerStrategyRegistry,
        simpleChunker: SimpleTextChunkerService,
        markdownChunker: MarkdownHeaderChunkerService,
      ) => {
        registry.register(simpleChunker);
        registry.register(markdownChunker);
        return registry;
      },
      inject: [ChunkerStrategyRegistry, SimpleTextChunkerService, MarkdownHeaderChunkerService],
    },
    {
      provide: EmbeddingService,
      useClass: OllamaEmbeddingService,
    },
    {
      provide: QdrantClient,
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('QDRANT_URL', 'http://localhost:6333');
        return new QdrantClient({ url });
      },
      inject: [ConfigService],
    },
    {
      provide: VectorRepository,
      useClass: QdrantVectorRepository,
    },
    {
      provide: VectorStoreService,
      useClass: QdrantVectorStoreService,
    },
    {
      provide: ChunkingTaskRepository,
      useClass: MongooseChunkingTaskRepository,
    },
    {
      provide: StoredChunkRepository,
      useClass: MongooseStoredChunkRepository,
    },
    {
      provide: EmbeddingTaskRepository,
      useClass: MongooseEmbeddingTaskRepository,
    },
    IngestDocumentUseCase,
    ChunkDocumentUseCase,
    ProcessEmbeddingsUseCase,
    QueryWithContextUseCase,
  ],
  exports: [
    IngestDocumentUseCase,
    ChunkDocumentUseCase,
    ProcessEmbeddingsUseCase,
    QueryWithContextUseCase,
  ],
})
export class DocumentIngestionModule {}

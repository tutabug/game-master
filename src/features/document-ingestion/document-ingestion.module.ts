import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OllamaEmbeddings } from '@langchain/ollama';
import { DocumentLoaderService } from './application/services/document-loader.service';
import { SimpleTextChunkerService } from './application/services/simple-text-chunker.service';
import { OllamaEmbeddingService } from './application/services/ollama-embedding.service';
import { IngestDocumentUseCase } from './application/use-cases/ingest-document.use-case';
import { TextChunkerService } from './domain/services/text-chunker.service';
import { EmbeddingService } from './domain/services/embedding.service';

@Module({
  imports: [ConfigModule],
  providers: [
    DocumentLoaderService,
    {
      provide: TextChunkerService,
      useClass: SimpleTextChunkerService,
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
      provide: EmbeddingService,
      useClass: OllamaEmbeddingService,
    },
    IngestDocumentUseCase,
  ],
  exports: [IngestDocumentUseCase],
})
export class DocumentIngestionModule {}

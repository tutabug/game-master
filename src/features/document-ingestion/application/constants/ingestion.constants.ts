import { ChunkingConfig } from '../../domain/entities/ingestion-task.entity';

export const EMBEDDING_DEFAULTS = {
  MODEL: 'nomic-embed-text',
  DIMENSION: 768,
} as const;

export const RECURSIVE_CHUNKING_STRATEGY: ChunkingConfig = {
  strategy: 'recursive-1000-200',
  size: 1000,
  overlap: 200,
};

export const DOCUMENT_DEFAULTS = {
  ID: 'dnd-srd-5.2.1',
  VERSION: 'v1',
} as const;

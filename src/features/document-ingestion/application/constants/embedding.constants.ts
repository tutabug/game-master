import { EmbeddingConfig } from '../../domain/entities/embedding-task.entity';

export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  model: 'nomic-embed-text',
  dimension: 768,
  collectionName: 'documents',
};

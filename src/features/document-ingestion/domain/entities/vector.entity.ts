export interface VectorPayload {
  documentId: string;
  source: string;
  chunkId: string;
  chunkIndex: number;
  pageNumber?: number;
  content: string;
  chunkStrategy: string;
  chunkSize: number;
  chunkOverlap: number;
  embeddingModel: string;
  embeddingDimension: number;
  contentType?: string;
  tags?: string[];
  createdAt: string;
  version: string;
}

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: VectorPayload;
}

export interface SearchQuery {
  vector: number[];
  limit?: number;
  filter?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  score: number;
  payload: VectorPayload;
}

export interface CollectionConfig {
  name: string;
  dimension: number;
  distance: 'Cosine' | 'Euclid' | 'Dot';
}

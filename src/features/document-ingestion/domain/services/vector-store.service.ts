export interface EmbeddingVector {
  id: string;
  vector: number[];
  payload: {
    chunkId: string;
    chunkIndex: number;
    content: string;
    documentId: string;
    chunkingTaskId: string;
    embeddingTaskId: string;
    pageNumber?: number;
    contentType?: string;
    tags?: string[];
    createdAt: string;
    version: string;
  };
}

export interface SearchResult {
  id: string;
  score: number;
  payload: {
    chunkId: string;
    chunkIndex: number;
    content: string;
    documentId: string;
    chunkingTaskId: string;
    embeddingTaskId: string;
    pageNumber?: number;
    contentType?: string;
    tags?: string[];
    createdAt: string;
    version: string;
  };
}

export abstract class VectorStoreService {
  abstract storeVectors(collectionName: string, vectors: EmbeddingVector[]): Promise<void>;
  abstract ensureCollection(collectionName: string, dimension: number): Promise<void>;
  abstract vectorExists(collectionName: string, vectorId: string): Promise<boolean>;
  abstract searchVectors(
    collectionName: string,
    queryVector: number[],
    limit: number,
    documentId?: string,
  ): Promise<SearchResult[]>;
}

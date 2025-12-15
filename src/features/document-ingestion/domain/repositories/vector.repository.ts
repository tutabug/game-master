import {
  CollectionConfig,
  SearchQuery,
  SearchResult,
  VectorPoint,
} from '../entities/vector.entity';

export abstract class VectorRepository {
  abstract createCollection(config: CollectionConfig): Promise<void>;
  abstract collectionExists(name: string): Promise<boolean>;
  abstract ensureCollection(config: CollectionConfig): Promise<void>;
  abstract upsertPoints(
    collectionName: string,
    points: VectorPoint[],
    dimension?: number,
  ): Promise<void>;
  abstract search(collectionName: string, query: SearchQuery): Promise<SearchResult[]>;
  abstract deleteCollection(collectionName: string): Promise<void>;
  abstract getCollectionInfo(collectionName: string): Promise<{ points_count: number }>;
}

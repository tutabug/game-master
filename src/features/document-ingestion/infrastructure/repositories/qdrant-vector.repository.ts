import { Injectable } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { VectorRepository } from '../../domain/repositories/vector.repository';
import {
  CollectionConfig,
  SearchQuery,
  SearchResult,
  VectorPayload,
  VectorPoint,
} from '../../domain/entities/vector.entity';
import { EMBEDDING_DEFAULTS } from '../../application/constants/ingestion.constants';

export interface QdrantPayload {
  document_id: string;
  source: string;
  chunk_id: string;
  chunk_index: number;
  page_number?: number;
  content: string;
  chunk_strategy: string;
  chunk_size: number;
  chunk_overlap: number;
  embedding_model: string;
  embedding_dimension: number;
  content_type?: string;
  tags?: string[];
  created_at: string;
  version: string;
}

@Injectable()
export class QdrantVectorRepository extends VectorRepository {
  constructor(private readonly client: QdrantClient) {
    super();
  }

  private toSnakeCase(payload: VectorPayload): QdrantPayload {
    return {
      document_id: payload.documentId,
      source: payload.source,
      chunk_id: payload.chunkId,
      chunk_index: payload.chunkIndex,
      page_number: payload.pageNumber,
      content: payload.content,
      chunk_strategy: payload.chunkStrategy,
      chunk_size: payload.chunkSize,
      chunk_overlap: payload.chunkOverlap,
      embedding_model: payload.embeddingModel,
      embedding_dimension: payload.embeddingDimension,
      content_type: payload.contentType,
      tags: payload.tags,
      created_at: payload.createdAt,
      version: payload.version,
    };
  }

  private toCamelCase(payload: QdrantPayload): VectorPayload {
    return {
      documentId: payload.document_id,
      source: payload.source,
      chunkId: payload.chunk_id,
      chunkIndex: payload.chunk_index,
      pageNumber: payload.page_number,
      content: payload.content,
      chunkStrategy: payload.chunk_strategy,
      chunkSize: payload.chunk_size,
      chunkOverlap: payload.chunk_overlap,
      embeddingModel: payload.embedding_model,
      embeddingDimension: payload.embedding_dimension,
      contentType: payload.content_type,
      tags: payload.tags,
      createdAt: payload.created_at,
      version: payload.version,
    };
  }

  async createCollection(config: CollectionConfig): Promise<void> {
    await this.client.createCollection(config.name, {
      vectors: {
        size: config.dimension,
        distance: config.distance,
      },
    });
  }

  async collectionExists(name: string): Promise<boolean> {
    try {
      await this.client.getCollection(name);
      return true;
    } catch {
      return false;
    }
  }

  async ensureCollection(config: CollectionConfig): Promise<void> {
    const exists = await this.collectionExists(config.name);
    if (!exists) {
      await this.createCollection(config);
    }
  }

  async upsertPoints(
    collectionName: string,
    points: VectorPoint[],
    dimension: number = EMBEDDING_DEFAULTS.DIMENSION,
  ): Promise<void> {
    const collectionConfig: CollectionConfig = {
      name: collectionName,
      dimension,
      distance: 'Cosine',
    };

    await this.ensureCollection(collectionConfig);

    await this.client.upsert(collectionName, {
      wait: true,
      points: points.map((p) => ({
        id: p.id,
        vector: p.vector,
        payload: this.toSnakeCase(p.payload) as unknown as Record<string, unknown>,
      })),
    });
  }

  async search(collectionName: string, query: SearchQuery): Promise<SearchResult[]> {
    const results = await this.client.search(collectionName, {
      vector: query.vector,
      limit: query.limit || 10,
      filter: query.filter,
      with_payload: true,
    });

    return results.map((r) => ({
      id: String(r.id),
      score: r.score,
      payload: this.toCamelCase(r.payload as unknown as QdrantPayload),
    }));
  }

  async deleteCollection(collectionName: string): Promise<void> {
    await this.client.deleteCollection(collectionName);
  }

  async getCollectionInfo(collectionName: string): Promise<{ points_count: number }> {
    const info = await this.client.getCollection(collectionName);
    return { points_count: info.points_count || 0 };
  }
}

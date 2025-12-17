import { Injectable } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { ConfigService } from '@nestjs/config';
import {
  EmbeddingVector,
  VectorStoreService,
  SearchResult,
} from '../../domain/services/vector-store.service';

@Injectable()
export class QdrantVectorStoreService implements VectorStoreService {
  private client: QdrantClient;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('QDRANT_URL') || 'http://localhost:6333';
    this.client = new QdrantClient({ url });
  }

  async ensureCollection(collectionName: string, dimension: number): Promise<void> {
    try {
      await this.client.getCollection(collectionName);
    } catch (error) {
      await this.client.createCollection(collectionName, {
        vectors: {
          size: dimension,
          distance: 'Cosine',
        },
      });
    }
  }

  async storeVectors(collectionName: string, vectors: EmbeddingVector[]): Promise<void> {
    if (vectors.length === 0) return;

    const points = vectors.map((v) => ({
      id: v.id,
      vector: v.vector,
      payload: v.payload,
    }));

    await this.client.upsert(collectionName, {
      wait: true,
      points,
    });
  }

  async vectorExists(collectionName: string, vectorId: string): Promise<boolean> {
    try {
      const result = await this.client.retrieve(collectionName, {
        ids: [vectorId],
      });
      return result.length > 0;
    } catch (error) {
      return false;
    }
  }

  async searchVectors(
    collectionName: string,
    queryVector: number[],
    limit: number,
    documentId?: string,
  ): Promise<SearchResult[]> {
    const filter = documentId
      ? {
          must: [
            {
              key: 'documentId',
              match: {
                value: documentId,
              },
            },
          ],
        }
      : undefined;

    const searchResult = await this.client.search(collectionName, {
      vector: queryVector,
      limit,
      filter,
      with_payload: true,
    });

    return searchResult.map((result) => ({
      id: result.id as string,
      score: result.score,
      payload: result.payload as SearchResult['payload'],
    }));
  }
}

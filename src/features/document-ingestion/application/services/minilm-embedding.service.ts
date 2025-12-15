import { Injectable } from '@nestjs/common';
import {
  EmbeddingService,
  FeatureExtractionPipeline,
} from '../../domain/services/embedding.service';

@Injectable()
export class MiniLmEmbeddingService extends EmbeddingService {
  constructor(private readonly extractor: FeatureExtractionPipeline) {
    super();
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const output = await this.extractor.call([text], { pooling: 'mean', normalize: true });
    const data = output.data;

    if (data instanceof Float32Array) {
      return Array.from(data);
    }

    if (Array.isArray(data)) {
      if (data.length > 0 && Array.isArray(data[0])) {
        return data[0] as number[];
      }
      return data as number[];
    }

    throw new Error('Unexpected embedding output format');
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }
}

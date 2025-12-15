import { Injectable } from '@nestjs/common';
import { OllamaEmbeddings } from '@langchain/ollama';
import { EmbeddingService } from '../../domain/services/embedding.service';

@Injectable()
export class OllamaEmbeddingService extends EmbeddingService {
  private embeddings: OllamaEmbeddings;

  constructor(baseUrl: string, model: string = 'nomic-embed-text') {
    super();
    this.embeddings = new OllamaEmbeddings({
      baseUrl,
      model,
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const result = await this.embeddings.embedQuery(text);
    return result;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const result = await this.embeddings.embedDocuments(texts);
    return result;
  }
}

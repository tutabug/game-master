import { Injectable, Logger } from '@nestjs/common';
import { OllamaEmbeddings } from '@langchain/ollama';
import { EmbeddingService } from '../../domain/services/embedding.service';

@Injectable()
export class OllamaEmbeddingService extends EmbeddingService {
  private readonly logger = new Logger(OllamaEmbeddingService.name);
  private readonly MAX_CHARS = 8000;

  constructor(private readonly embeddings: OllamaEmbeddings) {
    super();
  }

  private truncateText(text: string): string {
    if (text.length <= this.MAX_CHARS) {
      return text;
    }

    this.logger.warn(
      `Text exceeds ${this.MAX_CHARS} characters (${text.length}). Truncating to prevent context length errors.`,
    );

    return text.substring(0, this.MAX_CHARS);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const truncatedText = this.truncateText(text);

    try {
      const result = await this.embeddings.embedQuery(truncatedText);
      return result;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      this.logger.debug(`Text length: ${truncatedText.length} characters`);
      this.logger.debug(`Text preview: ${truncatedText.substring(0, 200)}...`);
      throw error;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const truncatedTexts = texts.map((text) => this.truncateText(text));

    try {
      const result = await this.embeddings.embedDocuments(truncatedTexts);
      return result;
    } catch (error) {
      this.logger.error(`Failed to generate embeddings: ${error.message}`);
      throw error;
    }
  }
}

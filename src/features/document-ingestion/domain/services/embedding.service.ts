export abstract class FeatureExtractionPipeline {
  abstract call(
    inputs: string | string[],
    options?: Record<string, unknown>,
  ): Promise<{ data: Float32Array | number[] | number[][] }>;
}

export abstract class EmbeddingService {
  abstract generateEmbedding(text: string): Promise<number[]>;
  abstract generateEmbeddings(texts: string[]): Promise<number[][]>;
}

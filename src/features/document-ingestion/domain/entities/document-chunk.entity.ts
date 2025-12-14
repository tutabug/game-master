export interface DocumentMetadata {
  source: string;
  pageNumber?: number;
  chunkIndex: number;
  type?: string;
  [key: string]: any;
}

export class DocumentChunk {
  constructor(
    public readonly id: string,
    public readonly content: string,
    public readonly metadata: DocumentMetadata,
  ) {}
}

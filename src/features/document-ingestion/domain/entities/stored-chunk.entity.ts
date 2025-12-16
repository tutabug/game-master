export class StoredChunk {
  constructor(
    public readonly id: string,
    public readonly taskId: string,
    public readonly chunkIndex: number,
    public readonly content: string,
    public readonly pageNumber: number | undefined,
    public readonly createdAt: Date,
  ) {}
}

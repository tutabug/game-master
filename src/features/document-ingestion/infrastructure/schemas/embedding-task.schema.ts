import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { EmbeddingTaskStatus } from '../../domain/entities/embedding-task.entity';
import { ChunkingTaskDocument } from './ingestion-task.schema';

@Schema({ collection: 'embedding_tasks', timestamps: true })
export class EmbeddingTaskDocument extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: ChunkingTaskDocument.name, required: true })
  chunkingTaskId: string;

  @Prop({ required: true })
  documentId: string;

  @Prop({
    required: true,
    enum: Object.values(EmbeddingTaskStatus),
    default: EmbeddingTaskStatus.PENDING,
  })
  status: EmbeddingTaskStatus;

  @Prop({ required: true, default: 0 })
  totalChunks: number;

  @Prop({ required: true, default: 0 })
  processedChunks: number;

  @Prop({ type: Object, required: true })
  embeddingConfig: {
    model: string;
    dimension: number;
    collectionName: string;
  };

  @Prop()
  completedAt?: Date;

  @Prop()
  errorMessage?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const EmbeddingTaskSchema = SchemaFactory.createForClass(EmbeddingTaskDocument);

EmbeddingTaskSchema.index({ chunkingTaskId: 1 }, { unique: true });
EmbeddingTaskSchema.index({ documentId: 1 });
EmbeddingTaskSchema.index({ status: 1, createdAt: -1 });

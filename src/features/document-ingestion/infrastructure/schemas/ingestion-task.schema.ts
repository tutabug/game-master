import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ChunkingTaskStatus } from '../../domain/entities/ingestion-task.entity';

@Schema({ collection: 'chunking_tasks', timestamps: true })
export class ChunkingTaskDocument extends Document {
  @Prop({ required: true })
  documentId: string;

  @Prop({ required: true })
  filePath: string;

  @Prop({
    required: true,
    enum: Object.values(ChunkingTaskStatus),
    default: ChunkingTaskStatus.PENDING,
  })
  status: ChunkingTaskStatus;

  @Prop({ required: true, default: 0 })
  totalChunks: number;

  @Prop({ type: Object, required: true })
  chunkingConfig: {
    strategy: string;
    size: number;
    overlap: number;
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

export const ChunkingTaskSchema = SchemaFactory.createForClass(ChunkingTaskDocument);

ChunkingTaskSchema.index({ documentId: 1 });
ChunkingTaskSchema.index({ status: 1, createdAt: -1 });

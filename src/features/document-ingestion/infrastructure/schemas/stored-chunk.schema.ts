import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'stored_chunks', timestamps: { createdAt: true, updatedAt: false } })
export class StoredChunkDocument extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'ChunkingTaskDocument', index: true })
  taskId: string;

  @Prop({ required: true, index: true })
  chunkIndex: number;

  @Prop({ required: true, type: String })
  content: string;

  @Prop()
  pageNumber?: number;

  @Prop()
  createdAt: Date;
}

export const StoredChunkSchema = SchemaFactory.createForClass(StoredChunkDocument);

StoredChunkSchema.index({ taskId: 1, chunkIndex: 1 }, { unique: true });

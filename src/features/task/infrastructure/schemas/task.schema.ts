import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class TaskDocument extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  dueDate: Date;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const TaskSchema = SchemaFactory.createForClass(TaskDocument);

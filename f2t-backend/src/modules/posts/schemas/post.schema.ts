import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({ _id: false })
class MediaItem {
  @Prop({ required: true })
  url!: string;

  @Prop({ required: true, enum: ['image', 'video'] })
  type!: string;

  @Prop()
  thumbnailUrl?: string;
}

const MediaItemSchema = SchemaFactory.createForClass(MediaItem);

@Schema({ _id: false })
class Tag {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true, enum: ['consumer', 'farm'] })
  type!: string;

  @Prop({ required: true })
  name!: string;
}

const TagSchema = SchemaFactory.createForClass(Tag);

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret: Record<string, any>) => {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    },
  },
})
class Comment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  authorId!: Types.ObjectId;

  @Prop({ required: true })
  authorName!: string;

  @Prop()
  authorAvatarUrl?: string;

  @Prop({ required: true, minlength: 1, maxlength: 500 })
  content!: string;
}

const CommentSchema = SchemaFactory.createForClass(Comment);

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret: Record<string, any>) => {
      if (ret._id && typeof ret._id.toString === 'function') {
        ret.id = ret._id.toString();
      }
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Post {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  authorId!: Types.ObjectId;

  @Prop({ required: true, enum: ['consumer', 'farm'] })
  authorRole!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Farm' })
  farmId?: Types.ObjectId;

  @Prop({ required: true, minlength: 1, maxlength: 200 })
  title!: string;

  @Prop({ required: true, minlength: 1, maxlength: 2000 })
  body!: string;

  @Prop({ type: [MediaItemSchema], default: [] })
  media!: MediaItem[];

  @Prop({ type: [TagSchema], default: [] })
  tags!: Tag[];

  @Prop({ type: [String], default: [] })
  hashtags!: string[];

  @Prop({ type: [CommentSchema], default: [] })
  comments!: Comment[];

  @Prop({ default: 0 })
  likesCount!: number;

  @Prop({ default: 0 })
  commentsCount!: number;

  @Prop({ default: false, select: false })
  _seeded?: boolean;
}

export const PostSchema = SchemaFactory.createForClass(Post);

PostSchema.index({ createdAt: -1 });
PostSchema.index({ title: 'text', body: 'text', hashtags: 'text' });
PostSchema.index({ authorId: 1 });
PostSchema.index({ farmId: 1 });
PostSchema.index({ hashtags: 1 });

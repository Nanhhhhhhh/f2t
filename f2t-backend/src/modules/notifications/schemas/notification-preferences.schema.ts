import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type NotificationPreferencesDocument = NotificationPreferences &
  Document;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret: Record<string, unknown>) => {
      ret.id = (ret._id as { toString(): string }).toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class NotificationPreferences {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  userId!: MongooseSchema.Types.ObjectId;

  @Prop({ default: true }) emailNotifications!: boolean;
  @Prop({ default: true }) smsNotifications!: boolean;
  @Prop({ default: true }) pushNotifications!: boolean;
  @Prop({ default: true }) orderUpdates!: boolean;
  @Prop({ default: false }) promotions!: boolean;
  @Prop({ default: false }) newsletter!: boolean;

  @Prop({ default: false, select: false })
  _seeded?: boolean;
}

export const NotificationPreferencesSchema = SchemaFactory.createForClass(
  NotificationPreferences,
);

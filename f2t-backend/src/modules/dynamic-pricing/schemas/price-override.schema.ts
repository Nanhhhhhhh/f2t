import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PriceOverrideDocument = PriceOverride & Document;

@Schema({
  collection: 'price_overrides',
  timestamps: true,
  toJSON: {
    transform: (_: unknown, ret: Record<string, unknown>) => {
      ret.id = (ret._id as { toString(): string }).toString();
      delete ret._id;
      delete ret.__v;
    },
  },
})
export class PriceOverride {
  @Prop({ type: Types.ObjectId, required: true })
  productId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  farmId!: Types.ObjectId;

  @Prop({ required: true })
  basePrice!: number;

  @Prop({ required: true })
  targetPrice!: number;

  @Prop({ required: true })
  deltaPct!: number;

  @Prop({ required: true })
  freshnessScore!: number;

  @Prop({ required: true, enum: ['fresh', 'aging', 'critical'] })
  freshnessTag!: string;

  @Prop({ required: true, default: false })
  safetyClipped!: boolean;

  @Prop({ required: true, enum: ['shadow', 'advisory'] })
  mode!: string;

  @Prop({
    required: true,
    enum: ['shadow', 'pending_review', 'accepted', 'rejected', 'expired'],
    default: 'shadow',
  })
  status!: string;

  @Prop()
  reviewedAt?: Date;

  @Prop({ type: Types.ObjectId })
  reviewedBy?: Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  computedAt!: Date;

  @Prop({ required: true })
  expiresAt!: Date;
}

export const PriceOverrideSchema = SchemaFactory.createForClass(PriceOverride);

PriceOverrideSchema.index({ productId: 1, status: 1 });
PriceOverrideSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FreshnessCacheDocument = FreshnessCache & Document;

export class FreshnessReading {
  @Prop({ required: true })
  score!: number;

  @Prop({ required: true })
  scannedAt!: Date;
}

@Schema({
  collection: 'freshness_cache',
  timestamps: false,
  toJSON: {
    transform: (_: unknown, ret: Record<string, unknown>) => {
      ret.id = (ret._id as { toString(): string }).toString();
      delete ret._id;
      delete ret.__v;
    },
  },
})
export class FreshnessCache {
  @Prop({ type: Types.ObjectId, required: true, unique: true })
  productId!: Types.ObjectId;

  @Prop({ type: [FreshnessReading], default: [] })
  readings!: FreshnessReading[];

  @Prop({ required: true, default: 0.7 })
  medianScore!: number;

  @Prop({ required: true, default: Date.now })
  updatedAt!: Date;

  @Prop({ required: true })
  expiresAt!: Date;
}

export const FreshnessCacheSchema = SchemaFactory.createForClass(FreshnessCache);

FreshnessCacheSchema.index({ productId: 1 }, { unique: true });
FreshnessCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

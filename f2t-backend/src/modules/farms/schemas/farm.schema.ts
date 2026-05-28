import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type FarmDocument = Farm & Document;

@Schema({ _id: false })
class Point {
  @Prop({ type: String, enum: ['Point'], default: 'Point' })
  type!: string;

  @Prop({ type: [Number], default: [0, 0] })
  coordinates!: number[];
}

const PointSchema = SchemaFactory.createForClass(Point);

@Schema({ _id: false })
class Address {
  @Prop({ required: true }) street!: string;
  @Prop({ required: true }) city!: string;
  @Prop({ required: true }) state!: string;
  @Prop({ required: true }) zipCode!: string;
  @Prop({ required: true }) country!: string;
}

const AddressSchema = SchemaFactory.createForClass(Address);

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
export class Farm {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ type: PointSchema, required: true })
  location!: Point;

  @Prop({ type: AddressSchema, required: true })
  address!: Address;

  @Prop({ required: true })
  contactEmail!: string;

  @Prop({ required: true })
  contactPhone!: string;

  @Prop({
    type: [String],
    enum: ['pickup', 'farm_delivery', 'both'],
    default: ['pickup'],
  })
  deliveryMethods!: string[];

  @Prop({ type: [MongooseSchema.Types.Mixed] })
  deliveryZones!: Record<string, unknown>[];

  @Prop({ type: MongooseSchema.Types.Mixed })
  businessHours!: Record<string, unknown>;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop()
  profileImageUrl?: string;

  @Prop()
  bannerImageUrl?: string;

  @Prop({ default: '' })
  logoUrl!: string;

  @Prop({ default: '' })
  coverImageUrl!: string;

  @Prop({ default: false, select: false })
  _seeded?: boolean;

  @Prop({ required: true, enum: ['pending', 'verified', 'rejected'], default: 'pending' })
  verificationStatus!: string;
}

export const FarmSchema = SchemaFactory.createForClass(Farm);

// Add geospatial index for location-based search
FarmSchema.index({ location: '2dsphere' });

// Add text index for searching
FarmSchema.index({ name: 'text', description: 'text' });

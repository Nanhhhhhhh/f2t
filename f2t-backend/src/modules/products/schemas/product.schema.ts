import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ _id: false })
class NutritionalInfo {
  @Prop() calories?: number;
  @Prop() protein?: number;
  @Prop() carbs?: number;
  @Prop() fat?: number;
  @Prop() fiber?: number;
  @Prop({ type: [String] }) vitamins?: string[];
}

@Schema({ _id: false })
class ProductCertification {
  @Prop({ required: true }) type!: string;
  @Prop({ required: true }) certifyingBody!: string;
  @Prop() certificateNumber?: string;
  @Prop() validUntil?: string;
  @Prop() verificationUrl?: string;
}

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
export class Product {
  @Prop({ type: Types.ObjectId, ref: 'Farm', required: true })
  farmId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({
    required: true,
    enum: [
      'vegetables',
      'fruits',
      'herbs',
      'mushrooms',
      'grains',
      'dairy',
      'eggs',
      'honey',
      'other',
    ],
  })
  category!: string;

  @Prop()
  subcategory?: string;

  @Prop({ required: true })
  pricePerUnit!: number;

  @Prop({
    required: true,
    enum: ['kg', 'g', 'piece', 'bunch', 'box', 'bag', 'liter'],
  })
  unit!: string;

  @Prop({ required: true, default: 0 })
  availableQuantity!: number;

  @Prop({ required: true, default: 1 })
  minimumOrder!: number;

  @Prop({
    required: true,
    enum: ['available', 'sold_out', 'unavailable', 'seasonal'],
    default: 'available',
  })
  status!: string;

  @Prop({ type: [String] })
  images!: string[];

  @Prop()
  harvestDate!: string;

  @Prop()
  deliveryDate!: string;

  @Prop()
  estimatedShelfLife!: number; // in days

  @Prop({ default: false })
  isOrganic!: boolean;

  @Prop({ type: [String] })
  farmingMethods!: string[];

  @Prop()
  qualityGrade?: string;

  @Prop()
  freshnessLevel?: string;

  @Prop({ type: [String] })
  seasonalAvailability!: string[];

  @Prop({ type: [String] })
  tags!: string[];

  @Prop({ type: NutritionalInfo })
  nutritionalInfo?: NutritionalInfo;

  @Prop()
  storageRequirements?: string;

  @Prop()
  storageInstructions?: string;

  @Prop()
  packagingType?: string;

  @Prop({ type: [String] })
  allergenInfo?: string[];

  @Prop({ type: [ProductCertification] })
  certifications?: ProductCertification[];

  @Prop()
  lastRestockedAt?: Date;

  @Prop({ default: false, select: false })
  _seeded?: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Indexes for searching and filtering
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ farmId: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ pricePerUnit: 1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ _id: false })
class OrderItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  productId!: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  productName!: string;

  @Prop()
  productImage!: string;

  @Prop({ required: true })
  quantity!: number;

  @Prop({ required: true })
  pricePerUnit!: number;

  @Prop({ required: true })
  unit!: string;

  @Prop({ required: true })
  totalPrice!: number;

  @Prop({ type: Types.ObjectId, ref: 'Farm', required: true })
  farmId!: Types.ObjectId;

  @Prop({ required: true })
  farmName!: string;
}

@Schema({ _id: false })
export class OrderTrackingStep {
  @Prop({ required: true })
  status!: string;

  @Prop({ required: true, default: Date.now })
  timestamp!: Date;

  @Prop({ required: true })
  message!: string;

  @Prop({ required: true })
  updatedBy!: string; // userId
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret: Record<string, unknown>) => {
      ret.id = (ret._id as { toString(): string }).toString();

      // Map populated customer info if present
      if (
        ret.customerId &&
        typeof ret.customerId === 'object' &&
        'firstName' in ret.customerId
      ) {
        const customer = ret.customerId as Record<string, unknown>;
        const firstName = typeof customer.firstName === 'string' ? customer.firstName : '';
        const lastName = typeof customer.lastName === 'string' ? customer.lastName : '';
        ret.customerName = `${firstName} ${lastName}`.trim();
        ret.customerEmail = typeof customer.email === 'string' ? customer.email : '';
        ret.customerPhone = typeof customer.phoneNumber === 'string' ? customer.phoneNumber : '';
        const custId = customer.id || customer._id;
        ret.customerId = typeof custId === 'string' ? custId : (custId && typeof custId === 'object' && 'toString' in custId ? (custId as {toString(): string}).toString() : '');
      } else if (ret.customerId) {
        ret.customerId = typeof ret.customerId === 'string' ? ret.customerId : (ret.customerId as {toString(): string}).toString();
        ret.customerName = '';
        ret.customerEmail = '';
        ret.customerPhone = '';
      }

      // Map populated farm info if present
      if (ret.farmId && typeof ret.farmId === 'object' && 'name' in ret.farmId) {
        const farm = ret.farmId as Record<string, unknown>;
        ret.farmName = typeof farm.name === 'string' ? farm.name : '';
        const farmId = farm.id || farm._id;
        ret.farmId = typeof farmId === 'string' ? farmId : (farmId && typeof farmId === 'object' && 'toString' in farmId ? (farmId as {toString(): string}).toString() : '');
      } else if (ret.farmId) {
        ret.farmId = typeof ret.farmId === 'string' ? ret.farmId : (ret.farmId as {toString(): string}).toString();
      }

      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Order {
  @Prop({ required: true, unique: true })
  orderNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Farm', required: true })
  farmId!: Types.ObjectId;

  @Prop({ type: [OrderItem], required: true })
  items!: OrderItem[];

  @Prop({ required: true })
  totalItems!: number;

  @Prop({ required: true })
  subtotal!: number;

  @Prop({ required: true, default: 0 })
  deliveryFee!: number;

  @Prop({ required: true, default: 0 })
  tax!: number;

  @Prop({ required: true })
  total!: number;

  @Prop({ required: true, default: 'VND' })
  currency!: string;

  @Prop({
    required: true,
    enum: [
      'pending',
      'confirmed',
      'preparing',
      'ready_for_pickup',
      'shipped',
      'delivered',
      'cancelled',
    ],
    default: 'pending',
  })
  status!: string;

  @Prop({
    required: true,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  })
  paymentStatus!: string;

  @Prop({enum:['cash','stripe'], required: true })
  paymentMethod!: string;

  @Prop()
  stripeSessionId? : string;

  @Prop()
  stripePaymentIntentId?: string;

  @Prop()
  paymentTransactionId?: string;

  @Prop()
  paymentUrl?: string;

  @Prop()
  paidAt?: Date;

  @Prop({ required: true })
  deliveryMethod!: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  shippingAddress?: Record<string, unknown>;

  @Prop()
  deliveryDate?: string;

  @Prop()
  deliveryTimeSlot?: string;

  @Prop()
  deliveryInstructions?: string;

  @Prop()
  specialInstructions?: string;

  @Prop()
  discountCode?: string;

  @Prop()
  ghnOrderCode?: string;

  @Prop()
  trackingCode?: string;

  @Prop()
  estimatedDeliveryDate?: Date;

  @Prop({
    type: {
      latitude: Number,
      longitude: Number,
      updatedAt: { type: Date, default: Date.now },
    },
    _id: false,
  })
  driverLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: Date;
  };

  @Prop({
    type: [{
      status: String,
      description: String,
      timestamp: Date,
      location: String,
      _id: false,
    }],
    default: [],
  })
  trackingSteps!: Array<{
    status: string;
    description: string;
    timestamp: Date;
    location?: string;
  }>;

  @Prop({ type: [OrderTrackingStep], default: [] })
  timeline!: OrderTrackingStep[];

  @Prop()
  notes?: string;

  @Prop({ default: false, select: false })
  _seeded?: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ customerId: 1 });
OrderSchema.index({ farmId: 1 });
OrderSchema.index({ status: 1 });

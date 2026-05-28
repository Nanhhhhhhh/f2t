import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret: Record<string, unknown>) => {
      ret.id = (ret._id as { toString(): string }).toString();
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      return ret;
    },
  },
})
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, select: false })
  password!: string;

  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  @Prop({ required: true })
  phoneNumber!: string;

  @Prop({ default: '' })
  avatarUrl!: string;

  @Prop({
    required: true,
    enum: ['consumer', 'farm', 'admin'],
    default: 'consumer',
  })
  role!: string;

  @Prop({
    required: true,
    enum: ['active', 'suspended', 'pending'],
    default: 'active',
  })
  status!: string;

  @Prop({
    type: {
      coordinates: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
      },
      address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, required: true },
      },
    },
    _id: false,
  })
  location!: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };

  @Prop({ select: false })
  refreshToken?: string;

  @Prop({ select: false })
  pushToken?: string;

  @Prop({ default: false })
  emailVerified!: boolean;

  @Prop({ default: false })
  phoneVerified!: boolean;

  @Prop({ default: false, select: false })
  _seeded?: boolean;

  @Prop({ default: false })
  isBanned!: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

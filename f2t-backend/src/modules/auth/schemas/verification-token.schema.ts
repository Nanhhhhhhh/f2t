import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type VerificationTokenDocument = VerificationToken & Document;

@Schema({ timestamps: true })
export class VerificationToken {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId!: MongooseSchema.Types.ObjectId | User;

  @Prop({ required: true })
  token!: string;

  @Prop({ required: true, enum: ['email', 'phone'] })
  type!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ default: false })
  used!: boolean;

  @Prop({ default: false, select: false })
  _seeded?: boolean;
}

export const VerificationTokenSchema =
  SchemaFactory.createForClass(VerificationToken);

VerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
VerificationTokenSchema.index({ userId: 1, type: 1 });

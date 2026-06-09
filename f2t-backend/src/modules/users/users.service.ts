import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async create(userData: Partial<User>): Promise<UserDocument> {
    const password = userData.password || '';
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = new this.userModel({
      ...userData,
      password: hashedPassword,
    });
    return createdUser.save();
  }

  async remove(id: string): Promise<void> {
    await this.userModel.deleteOne({ _id: id }).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  async findByPhoneNumber(phoneNumber: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phoneNumber }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) return null;
    return this.userModel.findById(id).exec();
  }

  async update(
    id: string,
    updateData: Partial<User> & { isActive?: boolean },
  ): Promise<UserDocument | null> {
    const safeUpdate: Partial<User> = {};
    if (updateData.firstName !== undefined) safeUpdate.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) safeUpdate.lastName = updateData.lastName;
    if (updateData.phoneNumber !== undefined) safeUpdate.phoneNumber = updateData.phoneNumber;
    if (updateData.location !== undefined) safeUpdate.location = updateData.location;
    if (updateData.avatarUrl !== undefined) safeUpdate.avatarUrl = updateData.avatarUrl;
    if (updateData.isActive !== undefined) {
      safeUpdate.status = updateData.isActive ? 'active' : 'suspended';
    }

    return this.userModel
      .findByIdAndUpdate(id, { $set: safeUpdate }, { new: true })
      .exec();
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    const hashedToken = refreshToken ? this.hashToken(refreshToken) : null;
    await this.userModel.findByIdAndUpdate(userId, {
      refreshToken: hashedToken,
    });
  }

  async getUserIfRefreshTokenMatches(refreshToken: string, userId: string): Promise<UserDocument | null> {
    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) return null;
    
    const user = await this.userModel
      .findById(userId)
      .select('+refreshToken')
      .exec();
    
    if (!user || !user.refreshToken) return null;

    const hashedToken = this.hashToken(refreshToken);
    if (hashedToken === user.refreshToken) return user;
    return null;
  }

  async updatePushToken(userId: string, pushToken: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { pushToken }).exec();
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.userModel.updateOne({ _id: id }, { password: hashedPassword }).exec();
  }

  async searchUsers(query: string): Promise<{ id: string; name: string; avatarUrl?: string }[]> {
    if (!query || query.trim().length < 2) return [];
    const regex = new RegExp(query.trim(), 'i');
    const users = await this.userModel
      .find({
        $or: [
          { firstName: regex },
          { lastName: regex },
          { email: regex },
        ],
      })
      .select('firstName lastName avatarUrl')
      .limit(10)
      .exec();
    return users.map((u) => ({
      id: (u._id as { toHexString(): string }).toHexString(),
      name: `${u.firstName} ${u.lastName}`.trim(),
      avatarUrl: u.avatarUrl,
    }));
  }

  findFarmOwner(_farmId: string): UserDocument | null {
    // This is tricky because we don't have Farm model here.
    // However, we can use the injected model if we add it, or use FarmsService.
    // But UsersService shouldn't ideally depend on FarmsService (circular).
    // Let's assume the farm's ownerId is passed or we find it another way.
    // Actually, in OrdersService we already have the farm object.
    return null; // Placeholder, used by farmId lookup if needed
  }
}

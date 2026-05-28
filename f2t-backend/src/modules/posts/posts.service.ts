import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery as MongoFilterQuery } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import { CreatePostDto, GetPostsQueryDto, AddCommentDto } from './dto/post.dto';
import { UsersService } from '../users/users.service';
import { FarmsService } from '../farms/farms.service';
import { PaginationResponseDto } from '../../common/dto/pagination-response.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    private readonly usersService: UsersService,
    private readonly farmsService: FarmsService,
  ) {}

  async create(userId: string, postData: CreatePostDto): Promise<PostDocument> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let farmId: Types.ObjectId | undefined;
    if (user.role === 'farm') {
      const farm = await this.farmsService.findOneByOwner(userId);
      if (farm) {
        farmId = farm._id as Types.ObjectId;
      }
    }

    const createdPost = new this.postModel({
      title: postData.title,
      body: postData.body,
      authorId: new Types.ObjectId(userId),
      authorRole: user.role,
      farmId,
      media: postData.media ?? [],
      tags: postData.tags ?? [],
      hashtags: postData.hashtags ?? [],
    });
    return createdPost.save();
  }

  async findAll(
    query: GetPostsQueryDto,
  ): Promise<PaginationResponseDto<PostDocument>> {
    const {
      page = 1,
      limit = 10,
      search,
      farmId,
      authorId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const filter: MongoFilterQuery<PostDocument> = {};

    if (search && search.trim()) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { body: { $regex: escaped, $options: 'i' } },
      ];
    }

    if (farmId && Types.ObjectId.isValid(farmId)) {
      filter.farmId = new Types.ObjectId(farmId);
    }

    if (authorId && Types.ObjectId.isValid(authorId)) {
      filter.authorId = new Types.ObjectId(authorId);
    }

    const sortDir = sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.postModel
        .find(filter)
        .sort({ [sortBy]: sortDir })
        .skip(skip)
        .limit(limit)
        .populate('authorId', 'firstName lastName avatarUrl role')
        .populate('farmId', 'name logoUrl')
        .exec(),
      this.postModel.countDocuments(filter),
    ]);

    return new PaginationResponseDto(items, total, page, limit);
  }

  async findForYou(
    query: GetPostsQueryDto,
  ): Promise<PaginationResponseDto<PostDocument>> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const items = await this.postModel.aggregate([
      {
        $addFields: {
          score: {
            $divide: [
              { $add: ['$likesCount', { $multiply: ['$commentsCount', 2] }, 1] },
              {
                $pow: [
                  {
                    $add: [
                      {
                        $divide: [
                          { $subtract: [new Date(), '$createdAt'] },
                          3600000,
                        ],
                      },
                      2,
                    ],
                  },
                  1.5,
                ],
              },
            ],
          },
        },
      },
      { $sort: { score: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'authorId',
          foreignField: '_id',
          as: 'authorId',
        },
      },
      { $unwind: '$authorId' },
      {
        $lookup: {
          from: 'farms',
          localField: 'farmId',
          foreignField: '_id',
          as: 'farmId',
        },
      },
      { $unwind: { path: '$farmId', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          id: { $toString: '$_id' },
          'authorId.id': { $toString: '$authorId._id' },
          'farmId.id': { $toString: '$farmId._id' },
        },
      },
      {
        $project: {
          _id: 0,
          __v: 0,
          'authorId.password': 0,
          'authorId.__v': 0,
          'authorId._id': 0,
          'farmId.__v': 0,
          'farmId._id': 0,
        },
      },
    ]);

    const total = await this.postModel.countDocuments();

    return new PaginationResponseDto(items, total, page, limit);
  }

  async findOne(id: string): Promise<PostDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    const post = await this.postModel
      .findById(id)
      .populate('authorId', 'firstName lastName avatarUrl role')
      .populate('farmId', 'name logoUrl')
      .exec();
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    return post;
  }

  async like(id: string): Promise<PostDocument> {
    const post = await this.postModel.findByIdAndUpdate(
      id,
      { $inc: { likesCount: 1 } },
      { new: true },
    );
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    return post;
  }

  async unlike(id: string): Promise<PostDocument> {
    const post = await this.postModel.findByIdAndUpdate(
      id,
      { $inc: { likesCount: -1 } },
      { new: true },
    );
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    if (post.likesCount < 0) {
      post.likesCount = 0;
      await post.save();
    }
    return post;
  }

  async addComment(
    userId: string,
    postId: string,
    addCommentDto: AddCommentDto,
  ): Promise<PostDocument> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const comment = {
      authorId: new Types.ObjectId(userId),
      authorName: `${user.firstName} ${user.lastName}`,
      authorAvatarUrl: user.avatarUrl,
      content: addCommentDto.content,
      createdAt: new Date(),
    };

    const post = await this.postModel.findByIdAndUpdate(
      postId,
      {
        $push: { comments: comment },
        $inc: { commentsCount: 1 },
      },
      { new: true },
    );

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }
    return post;
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePostDto, GetPostsQueryDto, AddCommentDto } from './dto/post.dto';
import { PostDocument } from './schemas/post.schema';
import { PaginationResponseDto } from '../../common/dto/pagination-response.dto';

interface RequestUser {
  userId: string;
  role: string;
  email: string;
}

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all posts' })
  async findAll(
    @Query() query: GetPostsQueryDto,
  ): Promise<PaginationResponseDto<PostDocument>> {
    return this.postsService.findAll(query);
  }

  @Get('foryou')
  @ApiOperation({ summary: 'Get for-you feed' })
  async getForYou(
    @Query() query: GetPostsQueryDto,
  ): Promise<PaginationResponseDto<PostDocument>> {
    return this.postsService.findForYou(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post by id' })
  async findOne(@Param('id') id: string): Promise<PostDocument> {
    return this.postsService.findOne(id);
  }

  @Post('add')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new post' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() createPostDto: CreatePostDto,
  ): Promise<PostDocument> {
    return this.postsService.create(user.userId, createPostDto);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a post' })
  async like(@Param('id') id: string): Promise<PostDocument> {
    return this.postsService.like(id);
  }

  @Post(':id/unlike')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlike a post' })
  async unlike(@Param('id') id: string): Promise<PostDocument> {
    return this.postsService.unlike(id);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a comment to a post' })
  async addComment(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() addCommentDto: AddCommentDto,
  ): Promise<PostDocument> {
    return this.postsService.addComment(user.userId, id, addCommentDto);
  }
}

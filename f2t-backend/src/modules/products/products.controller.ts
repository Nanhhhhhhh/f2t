import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  GetProductsFilterDto,
} from './dto/product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProductDocument } from "./schemas/product.schema";

interface RequestUser {
  userId: string;
  role: string;
  email: string;
}

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'farmId', required: false, type: String })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'organicOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'inSeason', required: false, type: Boolean })
  @ApiQuery({ name: 'inStock', required: false, type: Boolean })
  @ApiQuery({ name: 'sortBy', required: false, type: String, enum: ['name', 'pricePerUnit', 'createdAt', 'availableQuantity'] })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'latitude', required: false, type: Number })
  @ApiQuery({ name: 'longitude', required: false, type: Number })
  @ApiQuery({ name: 'radius', required: false, type: Number })
  async findAll(@Query() filterDto: GetProductsFilterDto): Promise<{ items: ProductDocument[]; total: number; page: number; limit: number; hasMore: boolean; }> {
    const result = await this.productsService.findAll(filterDto);
    return {
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by id' })
  async findOne(@Param('id') id: string): Promise<ProductDocument> {
    return this.productsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('farm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new product' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() createProductDto: CreateProductDto,
  ): Promise<ProductDocument> {
    return this.productsService.create(user.userId, createProductDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('farm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductDocument> {
    return this.productsService.update(id, user.userId, updateProductDto);
  }

  @Patch(':id/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('farm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product stock' })
  async updateStock(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body('availableQuantity') quantity: number,
  ): Promise<ProductDocument> {
    return this.productsService.updateStock(id, user.userId, quantity);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('farm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product' })
  async delete(@Param('id') id: string, @CurrentUser() user: RequestUser): Promise<{ message: string; }> {
    await this.productsService.delete(id, user.userId);
    return { message: 'Product deleted successfully' };
  }
}

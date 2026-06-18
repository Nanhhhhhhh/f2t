import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery, UpdateQuery } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { Farm, FarmDocument } from '../farms/schemas/farm.schema';
import { FarmsService } from '../farms/farms.service';
import { PaginationResponseDto } from '../../common/dto/pagination-response.dto';
import {
  CreateProductDto,
  UpdateProductDto,
  GetProductsFilterDto,
} from './dto/product.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

const LOW_STOCK_THRESHOLD = 10;

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Farm.name) private farmModel: Model<FarmDocument>,
    private farmsService: FarmsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(
    ownerId: string,
    productData: CreateProductDto,
  ): Promise<ProductDocument> {
    const farm = await this.farmsService.findOne(productData.farmId);
    if (farm.ownerId.toHexString() !== ownerId) {
      throw new ForbiddenException('You do not own this farm');
    }

    const pricePerUnit = productData.pricePerUnit ?? productData.price;
    const availableQuantity =
      productData.availableQuantity ?? productData.stockQuantity;
    const isOrganic = productData.isOrganic ?? productData.organicCertified;

    const createdProduct = new this.productModel({
      farmId: new Types.ObjectId(productData.farmId),
      name: productData.name,
      description: productData.description,
      category: productData.category,
      subcategory: productData.subcategory,
      price: productData.price,
      unit: productData.unit,
      stockQuantity: productData.stockQuantity,
      minimumOrder: productData.minimumOrder,
      images: productData.images ?? [],
      harvestDate: productData.harvestDate,
      deliveryDate: productData.deliveryDate,
      estimatedShelfLife: productData.estimatedShelfLife,
      organicCertified: productData.organicCertified,
      farmingMethods: productData.farmingMethods,
      qualityGrade: productData.qualityGrade,
      freshnessLevel: productData.freshnessLevel,
      seasonalAvailability: productData.seasonalAvailability,
      storageRequirements: productData.storageRequirements,
      storageInstructions: productData.storageInstructions,
      packagingType: productData.packagingType,
      allergenInfo: productData.allergenInfo,
      tags: productData.tags,
      isActive: productData.isActive,
      nutritionalInfo: productData.nutritionalInfo,
      pricePerUnit,
      availableQuantity,
      isOrganic,
    });
    return createdProduct.save();
  }

  async findAll(
    query: GetProductsFilterDto,
  ): Promise<PaginationResponseDto<ProductDocument>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const {
      search,
      category,
      farmId,
      minPrice,
      maxPrice,
      organicOnly,
      inStock,
      inSeason,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      latitude,
      longitude,
      radius,
    } = query;

    const filter: FilterQuery<ProductDocument> = { isActive: { $ne: false } };

    // 2. Search filter
    if (search && search.trim() !== '') {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
      ];
    }

    // 3. Category filter
    if (category && category !== 'all') {
      filter.category = category;
    }

    // 4. Farm filter
    if (farmId) {
      try {
        filter.farmId = new Types.ObjectId(farmId);
      } catch (e) {
        // Skip invalid farmId
      }
    }

    // 5. Organic filter
    if (organicOnly === true) {
      filter.isOrganic = true;
    }

    // 6. Stock filter — "còn hàng" = còn số lượng và status mua được.
    // 'available' VÀ 'seasonal' đều mua được (seasonal chỉ là nhãn mùa vụ);
    // chỉ loại 'sold_out' / 'unavailable'.
    if (inStock === true) {
      filter.availableQuantity = { $gt: 0 };
      filter.status = { $in: ['available', 'seasonal'] };
    }

    // 7. Season filter
    if (inSeason === true) {
      const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
      filter.seasonalAvailability = { $in: [currentMonth, 'year_round', 'cả năm', 'Xuân', 'Hè', 'Thu', 'Đông'] };
    }

    // 8. Price filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: { $gte?: number; $lte?: number } = {};
      if (minPrice !== undefined && Number(minPrice) > 0) priceFilter.$gte = Number(minPrice);
      if (maxPrice !== undefined && Number(maxPrice) < 500000) priceFilter.$lte = Number(maxPrice);
      
      if (Object.keys(priceFilter).length > 0) {
        filter.pricePerUnit = priceFilter;
      }
    }

    // 9. Geospatial filter
    if (latitude !== undefined && longitude !== undefined && radius !== undefined) {
      const nearbyFarms = await this.farmModel
        .find({
          'location.coordinates': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [Number(longitude), Number(latitude)],
              },
              $maxDistance: Number(radius) * 1000,
            },
          },
        })
        .select('_id')
        .exec();

      const farmIds = nearbyFarms.map((f) => f._id as Types.ObjectId);

      if (farmIds.length === 0) {
        return new PaginationResponseDto([], 0, page, limit);
      }

      if (filter.farmId) {
        filter.$and = [
          { farmId: filter.farmId },
          { farmId: { $in: farmIds } },
        ];
        delete filter.farmId;
      } else {
        filter.farmId = { $in: farmIds };
      }
    }

    // 9b. Loại product "orphan": chỉ giữ product có farm CÒN TỒN TẠI VÀ ĐÃ ĐƯỢC DUYỆT. 
    // Khi một farm bị rejected hoặc inactive, product của nó không được hiển thị.
    const validFarms = await this.farmModel
      .find({ verificationStatus: 'verified', isActive: true })
      .select('_id')
      .exec();
    const validFarmIds = validFarms.map((f) => f._id as Types.ObjectId);
    const validFarmClause = { farmId: { $in: validFarmIds } };

    if (filter.$and) {
      filter.$and.push(validFarmClause);
    } else if (filter.farmId) {
      filter.$and = [{ farmId: filter.farmId }, validFarmClause];
      delete filter.farmId;
    } else {
      filter.farmId = { $in: validFarmIds };
    }

    // 10. Sorting
    const sortField = sortBy === 'price' ? 'pricePerUnit' : sortBy;
    const sort: Record<string, 1 | -1> = {
      [sortField]: sortOrder === 'asc' ? 1 : -1,
      // Tie-breaker theo _id để sort ổn định giữa các trang (sản phẩm seed cùng
      // createdAt sẽ không bị xáo trộn ở ranh giới trang → tránh trùng/lặp item).
      _id: 1,
    };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    const itemsWithId = items.map((item) => ({
      ...item,
      id: String(item._id),
    }));

    return new PaginationResponseDto(
      itemsWithId as any,
      total,
      page,
      limit,
    );
  }

  async findOne(id: string): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid Product ID: ${id}`);
    }
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(
    id: string,
    ownerId: string,
    updateData: UpdateProductDto,
  ): Promise<ProductDocument> {
    const product = await this.findOne(id);
    const farm = await this.farmsService.findOne(
      product.farmId.toHexString(),
    );
    if (farm.ownerId.toHexString() !== ownerId) {
      throw new ForbiddenException('You do not own the farm for this product');
    }

    const pricePerUnit = updateData.pricePerUnit ?? updateData.price;
    const availableQuantity =
      updateData.availableQuantity ?? updateData.stockQuantity;
    const isOrganic = updateData.isOrganic ?? updateData.organicCertified;

    const dataToUpdate: UpdateQuery<ProductDocument> = {
      ...(updateData.name !== undefined && { name: updateData.name }),
      ...(updateData.description !== undefined && { description: updateData.description }),
      ...(updateData.category !== undefined && { category: updateData.category }),
      ...(updateData.subcategory !== undefined && { subcategory: updateData.subcategory }),
      ...(updateData.price !== undefined && { price: updateData.price }),
      ...(updateData.unit !== undefined && { unit: updateData.unit }),
      ...(updateData.stockQuantity !== undefined && { stockQuantity: updateData.stockQuantity }),
      ...(updateData.minimumOrder !== undefined && { minimumOrder: updateData.minimumOrder }),
      ...(updateData.images !== undefined && { images: updateData.images }),
      ...(updateData.harvestDate !== undefined && { harvestDate: updateData.harvestDate }),
      ...(updateData.deliveryDate !== undefined && { deliveryDate: updateData.deliveryDate }),
      ...(updateData.estimatedShelfLife !== undefined && { estimatedShelfLife: updateData.estimatedShelfLife }),
      ...(updateData.organicCertified !== undefined && { organicCertified: updateData.organicCertified }),
      ...(updateData.farmingMethods !== undefined && { farmingMethods: updateData.farmingMethods }),
      ...(updateData.qualityGrade !== undefined && { qualityGrade: updateData.qualityGrade }),
      ...(updateData.freshnessLevel !== undefined && { freshnessLevel: updateData.freshnessLevel }),
      ...(updateData.seasonalAvailability !== undefined && { seasonalAvailability: updateData.seasonalAvailability }),
      ...(updateData.storageRequirements !== undefined && { storageRequirements: updateData.storageRequirements }),
      ...(updateData.storageInstructions !== undefined && { storageInstructions: updateData.storageInstructions }),
      ...(updateData.packagingType !== undefined && { packagingType: updateData.packagingType }),
      ...(updateData.allergenInfo !== undefined && { allergenInfo: updateData.allergenInfo }),
      ...(updateData.tags !== undefined && { tags: updateData.tags }),
      ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
      ...(updateData.nutritionalInfo !== undefined && { nutritionalInfo: updateData.nutritionalInfo }),
      ...(updateData.status !== undefined && { status: updateData.status }),
      ...(pricePerUnit !== undefined && { pricePerUnit }),
      ...(availableQuantity !== undefined && { availableQuantity }),
      ...(isOrganic !== undefined && { isOrganic }),
    };

    if (updateData.farmId) {
      dataToUpdate.farmId = new Types.ObjectId(updateData.farmId);
    }

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, dataToUpdate, { new: true })
      .exec();
    if (!updatedProduct) {
      throw new NotFoundException('Product not found after update');
    }

    // Trigger low stock notification
    if (updatedProduct.availableQuantity < LOW_STOCK_THRESHOLD) {
      void this.notificationsService.createAndPush({
        userId: farm.ownerId.toHexString(),
        type: NotificationType.LowStock,
        title: 'Sắp hết hàng',
        message: `${updatedProduct.name} chỉ còn ${updatedProduct.availableQuantity} ${updatedProduct.unit}.`,
        referenceId: (updatedProduct._id as Types.ObjectId).toHexString(),
        referenceType: 'product',
        data: {
          productId: (updatedProduct._id as Types.ObjectId).toHexString(),
          availableQuantity: updatedProduct.availableQuantity,
        },
      });
    }

    return updatedProduct;
  }

  async updateStock(
    id: string,
    ownerId: string,
    quantity: number,
  ): Promise<ProductDocument> {
    const product = await this.findOne(id);
    const farm = await this.farmsService.findOne(
      product.farmId.toHexString(),
    );
    if (farm.ownerId.toHexString() !== ownerId) {
      throw new ForbiddenException('You do not own the farm for this product');
    }

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, { availableQuantity: quantity }, { new: true })
      .exec();
    if (!updatedProduct) {
      throw new NotFoundException('Product not found after stock update');
    }

    // Trigger low stock notification
    if (updatedProduct.availableQuantity < LOW_STOCK_THRESHOLD) {
      void this.notificationsService.createAndPush({
        userId: farm.ownerId.toHexString(),
        type: NotificationType.LowStock,
        title: 'Sắp hết hàng',
        message: `${updatedProduct.name} chỉ còn ${updatedProduct.availableQuantity} ${updatedProduct.unit}.`,
        referenceId: (updatedProduct._id as Types.ObjectId).toHexString(),
        referenceType: 'product',
        data: {
          productId: (updatedProduct._id as Types.ObjectId).toHexString(),
          availableQuantity: updatedProduct.availableQuantity,
        },
      });
    }

    return updatedProduct;
  }

  async delete(id: string, ownerId: string): Promise<void> {
    const product = await this.findOne(id);
    const farm = await this.farmsService.findOne(
      product.farmId.toHexString(),
    );
    if (farm.ownerId.toHexString() !== ownerId) {
      throw new ForbiddenException('You do not own the farm for this product');
    }
    await this.productModel.findByIdAndDelete(id).exec();
  }
}

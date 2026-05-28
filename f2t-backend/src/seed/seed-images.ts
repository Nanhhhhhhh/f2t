/**
 * seed-images.ts
 * Gán ảnh thực từ folder uploads/ vào toàn bộ document _seeded: true
 * trong các collection có field ảnh.
 *
 * Chạy: ts-node -r tsconfig-paths/register src/seed/seed-images.ts
 */

import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { AppModule } from '../app.module';
import { User } from '../modules/users/schemas/user.schema';
import { Farm } from '../modules/farms/schemas/farm.schema';
import { Product } from '../modules/products/schemas/product.schema';
import { Post } from '../modules/posts/schemas/post.schema';
import { Order } from '../modules/orders/schemas/order.schema';

// Load env trước khi AppModule khởi động
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.JPG', '.JPEG', '.PNG']);

function readImagesFromDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE_EXTS.has(path.extname(f)))
    .map((f) => path.join(dir, f));
}

function buildUrl(baseUrl: string, absolutePath: string): string {
  // absolutePath: /Users/…/f2t-backend/uploads/f2t/misc/xxx.jpg
  // → baseUrl + /uploads/f2t/misc/xxx.jpg
  const uploadsRoot = path.join(process.cwd(), 'uploads');
  const relative = path.relative(uploadsRoot, absolutePath).replace(/\\/g, '/');
  return `${baseUrl}/uploads/${relative}`;
}

function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

async function bootstrap() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌  Không chạy seed trong production');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const baseUrl =
      process.env.UPLOAD_BASE_URL ||
      `http://localhost:${process.env.PORT || 3000}`;

    const uploadsRoot = path.join(process.cwd(), 'uploads');
    const miscDir = path.join(uploadsRoot, 'f2t', 'misc');
    const postsDir = path.join(uploadsRoot, 'f2t', 'posts');

    const miscImages = readImagesFromDir(miscDir);
    const postImages = readImagesFromDir(postsDir);

    if (miscImages.length === 0 && postImages.length === 0) {
      console.warn('⚠️  Không tìm thấy ảnh nào trong uploads/. Thoát.');
      return;
    }

    const miscUrls = miscImages.map((p) => buildUrl(baseUrl, p));
    const postUrls = postImages.map((p) => buildUrl(baseUrl, p));
    // Khi thư mục posts trống, dùng misc làm fallback
    const postUrlsFinal = postUrls.length > 0 ? postUrls : miscUrls;

    console.log(`📂  misc: ${miscUrls.length} ảnh | posts: ${postUrlsFinal.length} ảnh`);
    console.log(`🔗  Base URL: ${baseUrl}`);

    const userModel = app.get<Model<User>>(getModelToken(User.name));
    const farmModel = app.get<Model<Farm>>(getModelToken(Farm.name));
    const productModel = app.get<Model<Product>>(getModelToken(Product.name));
    const postModel = app.get<Model<Post>>(getModelToken(Post.name));
    const orderModel = app.get<Model<Order>>(getModelToken(Order.name));

    // ── 1. Users → avatarUrl ─────────────────────────────────────────────────
    const users = await userModel.find({ _seeded: true }).lean();
    let updatedUsers = 0;
    for (let i = 0; i < users.length; i++) {
      await userModel.updateOne(
        { _id: users[i]._id },
        { $set: { avatarUrl: pick(miscUrls, i) } },
      );
      updatedUsers++;
    }
    console.log(`✅  users.avatarUrl         → ${updatedUsers} bản ghi`);

    // ── 2. Farms → profileImageUrl, bannerImageUrl, coverImageUrl, logoUrl ───
    const farms = await farmModel.find({ _seeded: true }).lean();
    let updatedFarms = 0;
    for (let i = 0; i < farms.length; i++) {
      await farmModel.updateOne(
        { _id: farms[i]._id },
        {
          $set: {
            profileImageUrl: pick(miscUrls, i),
            bannerImageUrl: pick(miscUrls, i + 1),
            coverImageUrl: pick(miscUrls, i + 2),
            logoUrl: pick(miscUrls, i + 3),
          },
        },
      );
      updatedFarms++;
    }
    console.log(`✅  farms.(profile/banner/cover/logo) → ${updatedFarms} bản ghi`);

    // ── 3. Products → images[] ───────────────────────────────────────────────
    const products = await productModel.find({ _seeded: true }).lean();
    let updatedProducts = 0;
    for (let i = 0; i < products.length; i++) {
      // 2-3 ảnh mỗi sản phẩm (round-robin)
      const imgs = [
        pick(miscUrls, i),
        pick(miscUrls, i + 1),
        pick(miscUrls, i + 2),
      ];
      await productModel.updateOne(
        { _id: products[i]._id },
        { $set: { images: imgs } },
      );
      updatedProducts++;
    }
    console.log(`✅  products.images         → ${updatedProducts} bản ghi`);

    // ── 4. Posts → media[].url ───────────────────────────────────────────────
    const posts = await postModel.find({ _seeded: true }).lean();
    let updatedPosts = 0;
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i] as any;
      const existingMedia: any[] = Array.isArray(post.media) ? post.media : [];

      // Thay thế từng media item bằng ảnh local, giữ nguyên type & thumbnailUrl
      const updatedMedia = existingMedia.map((item: any, j: number) => ({
        ...item,
        url: pick(postUrlsFinal, i + j),
        type: 'image',
      }));

      // Nếu post chưa có media thì tạo 1 item mới
      const finalMedia =
        updatedMedia.length > 0
          ? updatedMedia
          : [{ url: pick(postUrlsFinal, i), type: 'image' }];

      await postModel.updateOne(
        { _id: post._id },
        { $set: { media: finalMedia } },
      );
      updatedPosts++;
    }
    console.log(`✅  posts.media[].url       → ${updatedPosts} bản ghi`);

    // ── 5. Orders → items[].productImage ─────────────────────────────────────
    // Lấy map productId → images[0] từ các product đã update
    const productMap = new Map<string, string>();
    const allProducts = await productModel
      .find({ _seeded: true })
      .select('images')
      .lean();
    for (const p of allProducts) {
      const imgs = (p as any).images as string[];
      if (imgs && imgs.length > 0) {
        productMap.set((p._id as any).toString(), imgs[0]);
      }
    }

    const orders = await orderModel.find({ _seeded: true }).lean();
    let updatedOrders = 0;
    for (const order of orders) {
      const items: any[] = (order as any).items || [];
      let changed = false;

      const newItems = items.map((item: any) => {
        const pid = item.productId?.toString();
        const imgUrl = pid ? productMap.get(pid) : undefined;
        if (imgUrl && item.productImage !== imgUrl) {
          changed = true;
          return { ...item, productImage: imgUrl };
        }
        return item;
      });

      if (changed) {
        await orderModel.updateOne(
          { _id: (order as any)._id },
          { $set: { items: newItems } },
        );
        updatedOrders++;
      }
    }
    console.log(`✅  orders.items[].productImage → ${updatedOrders}/${orders.length} đơn hàng`);

    console.log('\n🎉  Seed ảnh hoàn tất!');
  } catch (err) {
    console.error('❌  Lỗi:', err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();

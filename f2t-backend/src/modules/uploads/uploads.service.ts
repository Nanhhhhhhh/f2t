import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface UploadResult {
  url: string;
  publicId: string;
  type: 'image' | 'video';
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private useLocalFallback = false;

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn(
        '[WARN] Cloudinary not configured — using local storage',
      );
      this.useLocalFallback = true;
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
    } else {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadResult> {
    const isVideo = file.mimetype.startsWith('video/');
    const type = isVideo ? 'video' : 'image';

    if (this.useLocalFallback) {
      const ext =
        path.extname(file.originalname) || (isVideo ? '.mp4' : '.jpg');
      const filename = `${crypto.randomUUID()}${ext}`;
      const folderPath = path.join(process.cwd(), 'uploads', folder);

      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const filePath = path.join(folderPath, filename);
      fs.writeFileSync(filePath, file.buffer);

      const baseUrl = this.configService.get<string>('UPLOAD_BASE_URL') || `http://localhost:${this.configService.get<string>('PORT', '3000')}`;
      const url = `${baseUrl}/uploads/${folder}/${filename}`;

      return {
        url,
        publicId: `local/${folder}/${filename}`,
        type,
      };
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: isVideo ? 'video' : 'image',
        },
        (error, result) => {
          if (error)
            { reject(new Error(error.message || 'Cloudinary error')); return; }
          if (!result) { reject(new Error('Upload failed')); return; }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            type,
          });
        },
      );

      uploadStream.end(file.buffer);
    });
  }
}

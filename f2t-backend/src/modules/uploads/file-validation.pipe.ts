import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private expectedType: 'image' | 'video' | 'media') {}

  transform(file: Express.Multer.File | undefined): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const isImage = !!file.mimetype.match(/^image\/(jpeg|png|webp|gif)$/);
    const isVideo = !!file.mimetype.match(/^video\/(mp4|quicktime)$/);

    if (this.expectedType === 'image' && !isImage) {
      throw new BadRequestException('Invalid file type');
    }
    if (this.expectedType === 'video' && !isVideo) {
      throw new BadRequestException('Invalid file type');
    }
    if (this.expectedType === 'media' && !isImage && !isVideo) {
      throw new BadRequestException('Invalid file type');
    }

    const isVideoFile =
      isVideo ||
      (this.expectedType === 'media' && file.mimetype.startsWith('video/'));
    const maxSize = isVideoFile ? 50 * 1024 * 1024 : 5 * 1024 * 1024;

    if (file.size > maxSize) {
      throw new BadRequestException('File too large');
    }

    return file;
  }
}

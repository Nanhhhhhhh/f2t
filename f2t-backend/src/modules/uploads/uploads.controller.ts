import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadResult, UploadsService } from './uploads.service';
import { FileValidationPipe } from './file-validation.pipe';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadImage(
    @UploadedFile(new FileValidationPipe('image')) file: Express.Multer.File,
    @Body('folder') folder: string = 'f2t/misc',
  ): Promise<UploadResult> {
    return this.uploadsService.uploadFile(file, folder);
  }

  @Post('video')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadVideo(
    @UploadedFile(new FileValidationPipe('video')) file: Express.Multer.File,
    @Body('folder') folder: string = 'f2t/misc',
  ): Promise<UploadResult> {
    return this.uploadsService.uploadFile(file, folder);
  }

  @Post('media')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadMedia(
    @UploadedFile(new FileValidationPipe('media')) file: Express.Multer.File,
    @Body('folder') folder: string = 'f2t/misc',
  ): Promise<UploadResult> {
    return this.uploadsService.uploadFile(file, folder);
  }
}

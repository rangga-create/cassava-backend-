import {
  Injectable,
  BadRequestException,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  configureCloudinary,
  getCloudinary,
  isCloudinaryReady,
} from "../config/cloudinary.config";

@Injectable()
export class UploadService implements OnModuleInit {
  private configured = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.configured = configureCloudinary(this.configService);
  }

  isReady(): boolean {
    return this.configured && isCloudinaryReady();
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = "cassava/products",
  ): Promise<{ url: string; publicId: string }> {
    if (!this.isReady()) {
      throw new BadRequestException(
        "Image upload is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.",
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException("File size must be less than 5MB.");
    }

    try {
      const cloudinary = getCloudinary();

      const result = await new Promise<{
        secure_url: string;
        public_id: string;
      }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: "image",
            transformation: [
              { width: 800, height: 800, crop: "limit", quality: "auto" },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as any);
          },
        );

        uploadStream.end(file.buffer);
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload image: ${error.message || "Unknown error"}`,
      );
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    if (!this.isReady()) {
      return; // Silently skip if not configured
    }

    try {
      const cloudinary = getCloudinary();
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.warn(`Failed to delete image ${publicId}:`, error.message);
    }
  }

  async replaceImage(
    file: Express.Multer.File,
    oldPublicId: string | undefined,
    folder: string = "cassava/products",
  ): Promise<{ url: string; publicId: string }> {
    // Upload new image first
    const newImage = await this.uploadImage(file, folder);

    // Delete old image if it exists
    if (oldPublicId) {
      await this.deleteImage(oldPublicId);
    }

    return newImage;
  }
}

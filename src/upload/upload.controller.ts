import {
  Controller,
  Post,
  Delete,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from "@nestjs/swagger";
import { UploadService } from "./upload.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard, Roles } from "../common/guards/roles.guard";
import { UserRole } from "../common/guards/roles.guard";

@ApiTags("upload")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post("image")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
  )
  @ApiOperation({ summary: "Upload an image to Cloudinary" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        folder: { type: "string", default: "cassava/products" },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body("folder") folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    const result = await this.uploadService.uploadImage(
      file,
      folder || "cassava/products",
    );

    return {
      success: true,
      data: result,
      message: "Image uploaded successfully",
    };
  }

  @Post("replace")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
  )
  @ApiOperation({ summary: "Replace an image on Cloudinary" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        oldPublicId: { type: "string" },
        folder: { type: "string", default: "cassava/products" },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async replaceImage(
    @UploadedFile() file: Express.Multer.File,
    @Body("oldPublicId") oldPublicId?: string,
    @Body("folder") folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    const result = await this.uploadService.replaceImage(
      file,
      oldPublicId,
      folder || "cassava/products",
    );

    return {
      success: true,
      data: result,
      message: "Image replaced successfully",
    };
  }

  @Delete("image")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
  )
  @ApiOperation({ summary: "Delete an image from Cloudinary" })
  async deleteImage(@Body("publicId") publicId: string) {
    if (!publicId) {
      throw new BadRequestException("publicId is required");
    }

    await this.uploadService.deleteImage(publicId);

    return {
      success: true,
      data: null,
      message: "Image deleted successfully",
    };
  }
}

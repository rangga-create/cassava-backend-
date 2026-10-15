import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";

let cloudinaryConfigured = false;

export const configureCloudinary = (
  configService: ConfigService,
): boolean => {
  if (cloudinaryConfigured) return true;

  const cloudName = configService.get<string>("CLOUDINARY_CLOUD_NAME");
  const apiKey = configService.get<string>("CLOUDINARY_API_KEY");
  const apiSecret = configService.get<string>("CLOUDINARY_API_SECRET");

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    cloudinaryConfigured = true;
    console.log("✅ Cloudinary configured successfully");
    return true;
  }

  console.warn("⚠️ Cloudinary credentials not configured. Image upload will be disabled.");
  return false;
};

export const getCloudinary = () => {
  return cloudinary;
};

export const isCloudinaryReady = (): boolean => {
  return cloudinaryConfigured;
};

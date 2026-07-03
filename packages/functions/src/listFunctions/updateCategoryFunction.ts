import { promises as fs } from "fs";
import fsSync from "fs";

import path from "path";
import sharp from "sharp";
import { prisma } from "@repo/database";
import { AppError } from "../error.js"; 
import { categorySchema } from "@repo/validators";
import { Upload } from "./createCateogryFunction.js";

const IMAGE_DIR = "/var/www/ekPratisatMonorepo/images/categoryImage";

export async function updateCategoryFunction({
  body,
  file,
  categoryId,
}: {
  body: any;
  file: Upload;
  categoryId: string;
}) {
  const finalBody = {
    name: body.name,
    isAgeOfThePropertyNeeded: body.isAgeOfThePropertyNeeded === "true",
    isFacingDirectionNeeded: body.isFacingDirectionNeeded === "true",
    isFloorAreaNeeded: body.isFloorAreaNeeded === "true",
    isFloorLevelNeeded: body.isFloorLevelNeeded === "true",
    isLandAreaNeeded: body.isLandAreaNeeded === "true",
    isNoOfFloorsNeeded: body.isNoOfFloorsNeeded === "true",
    isNoOfRestRoomsNeeded: body.isNoOfRestRoomsNeeded === "true",
    isNoOfRoomsNeeded: body.isNoOfRoomsNeeded === "true",
    isRoadSizeNeeded: body.isRoadSizeNeeded === "true",
  };

  const parsed = categorySchema.safeParse(finalBody);
  if (!parsed.success) {
    throw new AppError(422, "Validation Failed!!!");
  }

  // 🛡️ Guard Clause: Check if category exists BEFORE handling files
  const findCategory = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!findCategory) {
    throw new AppError(404, "Target Category not found!");
  }

  let imageUrl = "";
  let absoluteUploadedPath = ""; // Explicitly track disk path for the error rollback

  try {
    if (file) {
      const filename = `${Date.now()}-${file.originalname}`;
      const outputFormat = "webp";
      const cleanFilename = filename.replace(path.extname(filename), `.${outputFormat}`);
      
      absoluteUploadedPath = path.join(IMAGE_DIR, cleanFilename);

      const optimizedBuffer = await sharp(file.buffer)
        .resize(1200)
        .toFormat(outputFormat, { quality: 100 })
        .toBuffer();

      // Non-blocking async file system write
      await fs.writeFile(absoluteUploadedPath, optimizedBuffer);
      imageUrl = `/image/categoryImage/${cleanFilename}`;
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: parsed.data.name,
        imageUrl: imageUrl || findCategory.imageUrl, // Safe fallback guaranteed by your DB schema
        isAgeOfThePropertyNeeded: parsed.data.isAgeOfThePropertyNeeded,
        isFacingDirectionNeeded: parsed.data.isFacingDirectionNeeded,
        isFloorAreaNeeded: parsed.data.isFloorAreaNeeded,
        isFloorLevelNeeded: parsed.data.isFloorLevelNeeded,
        isLandAreaNeeded: parsed.data.isLandAreaNeeded,
        isNoOfFloorsNeeded: parsed.data.isNoOfFloorsNeeded,
        isNoOfRestRoomsNeeded: parsed.data.isNoOfRestRoomsNeeded,
        isNoOfRoomsNeeded: parsed.data.isNoOfRoomsNeeded,
        isRoadSizeNeeded: parsed.data.isRoadSizeNeeded,
      },
    });

    // 🧹 Clean up old image only after successful DB update execution
    if (imageUrl && findCategory.imageUrl) {
      const oldAbsoluteFilePath = path.join(IMAGE_DIR, path.basename(findCategory.imageUrl));
      if (fsSync.existsSync(oldAbsoluteFilePath)) {
        await fs.unlink(oldAbsoluteFilePath).catch((err) => 
          console.error("Failed to delete legacy file:", err)
        );
      }
    }

    return {
      status: 200,
      message: "Category Updated Successfully!!!",
      category,
    };

  } catch (error) {
    // 🛑 Rollback: Delete the newly written file if DB step exploded
    if (absoluteUploadedPath && fsSync.existsSync(absoluteUploadedPath)) {
      try {
        fsSync.unlinkSync(absoluteUploadedPath);
      } catch (e) {
        console.error("Failed to remove orphaned file in rollback step:", e);
      }
    }

    if (error instanceof AppError) throw error;
    throw new AppError(500, "Internal Server Error");
  }
}
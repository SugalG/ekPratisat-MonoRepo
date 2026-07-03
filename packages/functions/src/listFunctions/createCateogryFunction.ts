import { CategorySchema, categorySchema } from "@repo/validators";
import { AppError } from "../error.js";
import path, { parse } from "path";
import sharp from "sharp";
import fs from "fs";
import { prisma } from "@repo/database";
import { UploadedFile } from "../authFunctions/addUserFunction.js";

export type Upload = UploadedFile | null;
const IMAGE_DIR = "/var/www/ekPratisatMonorepo/images/categoryImage";

// adding category
export async function addCategory({ body, file }: { body: any; file: Upload }) {
  const finalBody = {
    name: body.name,
    addedById: body.createdById,
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

  try {
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: parsed.data.name,
      },
    });

    if (existingCategory) {
      throw new AppError(409, "Category Already Exist");
    }

    let imageUrl = "";
    if (file) {
      const imageFile = file;
      const filename = Date.now() + "-" + imageFile.originalname;
      const outputFormat = "webp";
      const filePath = path.join(
        "/var/www/ekPratisatMonorepo/images/categoryImage",
        filename.replace(path.extname(filename), `.${outputFormat}`),
      );

      const optimizedBuffer = await sharp(imageFile.buffer)
        .resize(1200)
        .toFormat(outputFormat, { quality: 100 })
        .toBuffer();

      await fs.promises.writeFile(filePath, optimizedBuffer);

      imageUrl = `/image/categoryImage/${path.basename(filePath)}`;
    }

    if (!imageUrl) {
      throw new AppError(400, "Image is required for category");
    }

    const category = await prisma.category.create({
      data: {
        name: parsed.data.name,
        imageUrl: imageUrl,
        addedById: parsed.data.addedById!,
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

    return {
      status: 200,
      message: "Category Created Successfully",
      category,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error(error);
    throw new AppError(500, "Internal Server Error");
  }
}



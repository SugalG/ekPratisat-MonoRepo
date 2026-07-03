import { z } from "zod";

export const createPropertySchema = z.object({
  title: z.string().min(4, "Atleast 4 letter word is needed!!!"),
  description: z.string(),
  price: z.number().positive("Price must be a positive number"),
  type: z.enum(["rent", "sale"]),
  negotiable: z.boolean().default(false),
  categoryId: z.string(),
  noOfBedRooms: z.number().int().nullable(),
  noOfRestRooms: z.number().int().nullable(),
  landArea: z.number().nullable(),
  noOfFloors: z.number().int().nullable(),
  propertyAge: z.number().int().nullable(),
  facingDirection: z
    .enum([
      "east",
      "west",
      "north",
      "south",
      "northeast",
      "northwest",
      "southeast",
      "southwest",
    ])
    .nullable(),
 floorArea: z.number().nullable(),
  roadSize: z.number().nullable(),
  floorLevel: z.number().int().nullable(),
  verified: z.boolean().default(false),
  features: z.any().nullable().optional(),
  locationId: z.string(),
  tole: z.string(),
  images: z
    .array(z.instanceof(File))
    .min(1, "At least one image is required")
    .optional(),
  lat: z.coerce.number().refine((v) => v >= -90 && v <= 90, "Invalid latitude"),
  lng: z.coerce
    .number()
    .refine((v) => v >= -180 && v <= 180, "Invalid longitude"),
  amenities: z.array(z.string()).nullable(),
});

export type CreatePropertySchema = z.infer<typeof createPropertySchema>;

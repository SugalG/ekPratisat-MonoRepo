import { prisma } from "@repo/database";
import { AppError } from "../error.js";

export async function fetchPropertyDetal(id: string) {
  try {
    const result = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        type: true,
        tole: true,
        verified: true,
        createdAt: true,
        noOfBedRooms: true,
        noOfRestRooms: true,
        negotiable: true,
        features: true,
        landArea: true,
        noOfFloors: true,
        propertyAge: true,
        facingDirection: true,
        isActive: true,
        floorArea: true,
        roadSize: true,
        propertyCode: true,
        floorLevel: true,
        amenities: true,
        isFeatured: true,
        leadNotes: true,
        images: {
          select: {
            id: true,
            url: true,
          },
        },
        coverImage: {
          select: {
            id: true,
            url: true,
          },
        },

        category: {
          select: {
            id: true,
            name: true,
          },
        },

        location: {
          select: {
            id: true,
            name: true,
            municipality: {
              select: {
                id: true,
                name: true,
                district: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },

        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!result) {
      throw new AppError(404, "The property doesn't exist");
    }

    // Fetch lat/lng from PostGIS (don't return geoPoint itself)
    const coords = await prisma.$queryRaw<Array<{ lat: number; lng: number }>>`
    SELECT
      ST_Y("geoPoint")::float8 AS lat,
      ST_X("geoPoint")::float8 AS lng
    FROM "public"."Property"
    WHERE "id" = ${id}
    LIMIT 1
  `;

    const { lat, lng } = coords?.[0] ?? { lat: null, lng: null };

    return {
      status: 200,
      result: {
        ...result,
        lat,
        lng,
      },
    };
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(500, "Bad Response from Server!!!");
  }
}

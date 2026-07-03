import { Prisma, prisma } from "@repo/database"
import { unstable_cache } from "next/cache";

type Input = {
    page?: number;
    pageSize?: number;
    q?: string;
    c_id?: string;
    type?: string;
    isFeatured?: boolean;
}

export const _getProperties = async (input: Input) => {
    const page = Math.max(1, Number(input.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(input.pageSize || 21)));
    const q = input.q?.trim();
    const c_id = input.c_id?.trim();

    const type = input.type?.trim().toLowerCase() || "";
    const validTypes = ['rent', 'sale'];
    const filterType = validTypes.includes(type) ? (type as 'rent' | 'sale') : undefined;

    const where: Prisma.PropertyWhereInput = {
        isActive: true, verified: true,
        ...(input.isFeatured && { isFeatured: true }),
        ...(q && {
            OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
            ],
        }),
        ...(c_id && { categoryId: c_id }),
        ...(filterType && { type: filterType }),
    };

    const [items, total] = await Promise.all([
        prisma.property.findMany({
            where,
            select: {
                id: true,
                propertyCode: true,
                title: true,
                price: true,
                type: true,
                noOfBedRooms: true,
                noOfFloors: true,
                noOfRestRooms: true,
                isFeatured: true,
                landArea: true,
                floorArea: true,
                tole: true,
                category: {
                    select: {
                        name: true,
                    }
                },
                images: {
                    select: {
                        url: true,
                    },
                    take: 1,
                },
                createdAt: true,
            },
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: "desc" },
        }),
        prisma.property.count({ where }),
    ]);

    const serializedItems = items.map((item) => ({
        ...item,
        price: item.price.toString(),
        landArea: item.landArea?.toString() ?? null,
        floorArea: item.floorArea?.toString() ?? null,

    }));

    return {
        items: serializedItems,
        meta: {
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
    };
}

export const getPropertiesQuery = async (input: Input) => {
    const normalizedInput = {
        page: Math.max(1, Number(input.page || 1)),
        pageSize: Math.min(100, Math.max(1, Number(input.pageSize || 21))),
        q: input.q || "",
        c_id: input.c_id || "",
        type: input.type || "",
        isFeatured: input.isFeatured || false
    };
    return unstable_cache(
        () => _getProperties(normalizedInput),
        ['properties', String(normalizedInput.page), String(normalizedInput.pageSize), String(normalizedInput.q), String(normalizedInput.c_id), String(normalizedInput.type), String(normalizedInput.isFeatured)],
        { tags: ['properties'], revalidate: 86400 }
    )();
}

//Featured Properties

export const _getFeaturedProperties = async (input: Input) => {
    console.log("Fetching feature properties");
    const page = Math.max(1, Number(input.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(input.pageSize || 21)));
    const q = input.q?.trim();
    const c_id = input.c_id?.trim();

    const type = input.type?.trim().toLowerCase() || "";
    const validTypes = ['rent', 'sale'];
    const filterType = validTypes.includes(type) ? (type as 'rent' | 'sale') : undefined;

    const where: Prisma.PropertyWhereInput = {
        isActive: true, verified: true, isFeatured: true,
        ...(q && {
            OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
            ],
        }),
        ...(c_id && { categoryId: c_id }),
        ...(filterType && { type: filterType }),
    };

    //     const where: Prisma.PropertyWhereInput = {
    //     AND: [
    //         { isActive: true },
    //         { verified: true },
    //         { isFeatured: true },
    //         q ? {
    //             OR: [
    //                 { title: { contains: q, mode: "insensitive" } },
    //                 { description: { contains: q, mode: "insensitive" } },
    //             ]
    //         } : {},
    //         c_id ? { categoryId: c_id } : {},
    //         filterType ? { type: filterType } : {},
    //     ]
    // };

    const [items, total] = await Promise.all([
        prisma.property.findMany({
            where,
            select: {
                id: true,
                propertyCode: true,
                title: true,
                price: true,
                type: true,
                noOfBedRooms: true,
                noOfFloors: true,
                noOfRestRooms: true,
                isFeatured: true,
                landArea: true,
                floorArea: true,
                tole: true,
                category: {
                    select: {
                        name: true,
                    }
                },
                images: {
                    select: {
                        url: true,
                    },
                    take: 1,
                },
                createdAt: true,
            },
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: "desc" },
        }),
        prisma.property.count({ where }),
    ]);

    return {
        items,
        meta: {
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
    };

}

export const getFeaturedPropertiesQuery = async (input: Input) => {
    const normalizedInput = {
        page: Math.max(1, Number(input.page || 1)),
        pageSize: Math.min(100, Math.max(1, Number(input.pageSize || 21))),
        q: input.q || "",
        c_id: input.c_id || "",
        type: input.type || "",
    };
    return unstable_cache(
        () => _getFeaturedProperties(normalizedInput),
        ['feature-properties', String(normalizedInput.page), String(normalizedInput.pageSize), String(normalizedInput.q), String(normalizedInput.c_id), String(normalizedInput.type)],
        { tags: ['feature-properties'], revalidate: 86400 }
    )();
}

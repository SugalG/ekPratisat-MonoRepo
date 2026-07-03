import { prisma } from "@repo/database";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ListingCard from "./ListingCard"; // Your existing reusable card

type PropertyType = "sale" | "rent"

interface RelatedPropertiesProps {
    currentPropertyId: string;
    categoryId: string;
    categoryName: string;
    type: PropertyType;
}

export default async function RelatedProperties({
    currentPropertyId,
    categoryId,
    categoryName,
    type
}: RelatedPropertiesProps) {

    // Fetch related listings based on category
    const relatedItems = await prisma.property.findMany({
        where: {
            categoryId: categoryId,
            id: { not: currentPropertyId },
            isActive: true,
            type: type,
            verified: true,
        },
        select: {
            id: true,
            propertyCode: true,
            title: true,
            price: true,
            type: true,
            noOfBedRooms: true,
            isFeatured:true,
            noOfFloors: true,
            noOfRestRooms: true,
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

        take: 4,
        orderBy: { createdAt: "desc" },
    });

    if (relatedItems.length === 0) return null;

     const serializedItems = relatedItems.map((item) => ({
        ...item,
        price: item.price.toString(),
        landArea: item.landArea?.toString() ?? null,
        floorArea: item.floorArea?.toString() ?? null,

    }));

    return (
        <section className="max-w-7xl mx-auto px-4 pt-16 sm:pt-24 border-t border-secondary-100 dark:border-secondary-900">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                <div className="space-y-2">
                    <p className="text-gold font-bold uppercase tracking-[0.2em] text-[10px] sm:text-xs">
                        Handpicked for you
                    </p>
                    <h2 className="text-2xl sm:text-4xl font-black text-secondary-950 dark:text-white tracking-tight">
                        Similar {categoryName}s
                    </h2>
                </div>

                <Link
                    href={`/properties?c_id=${categoryId}&type=${type}`}
                    className="group flex items-center gap-2 text-sm font-bold text-secondary-500 hover:text-gold transition-all"
                >
                    Explore All <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            {/* Grid Layout using your reusable ListingCard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                {serializedItems.map((property) => (
                    <Link href={`/properties/${property.id}`} key={property.id}>
                        <ListingCard
                            listing={property}
                        />
                    </Link>
                ))}
            </div>
        </section>
    );
}

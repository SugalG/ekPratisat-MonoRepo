import { prisma } from "@repo/database";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PropertyDetailClient } from "../../../../components/properties/PropertyDetailClient";
import PropertyInfo from "../../../../components/properties/PropertyInfo";
import RelatedProperties from "../../../../components/properties/RelatedProperties";


export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const param = await params;

    const property = await prisma.property.findUnique({
        where: { id: param.id, isActive: true, verified: true },
        select: {
            title: true,
            description: true,
            price: true,
            images: { take: 1, select: { url: true } },
            location: {
                select: {
                    name: true,
                    municipality: { select: { name: true } }
                }
            }
        }
    });

    if (!property) return { title: "Property Not Found" };

    const price = new Intl.NumberFormat("en-NP", {
        style: "currency",
        currency: "NPR",
        maximumFractionDigits: 0,
    }).format(Number(property.price));

    const location = `${property.location?.municipality.name}, ${property.location?.name}`;
    const imageUrl = property.images[0]
        ? `${process.env.NEXT_PUBLIC_BASE_URL}${property.images[0].url}`
        : "/ogMedia.png";

    return {
        title: `${property.title} - ${location}`,
        description: `Explore this property in ${location} for ${price}. ${property.description.slice(0, 150)}...`,
        openGraph: {
            title: property.title,
            description: `Rs. ${price} | ${location} | Real Estate Nepal`,
            url: `https://ekpratishat.com/properties/${param.id}`,
            siteName: "Ek Pratishat",
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: property.title,
                },
            ],
            locale: "en_NP",
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: property.title,
            description: `Check out this listing in ${location} for ${price}`,
            images: [imageUrl],
        },
    };
}

export async function generateStaticParams() {
    const properties = await prisma.property.findMany({
        where: {
            isActive: true,
            verified: true
        },
        select: {
            id: true
        },
        take: 100,
        orderBy: {
            createdAt: 'desc'
        }
    });

    return properties.map((property) => ({
        id: property.id,
    }));
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const param = await params;

    const result = await prisma.property.findUnique({
        where: {
            id: param.id,
            isActive: true,
            verified: true
        },
        select: {
            id: true,
            propertyCode: true,
            title: true,
            description: true,
            price: true,
            negotiable: true,
            type: true,
            category: {
                select: {
                    id: true,
                    name: true
                }
            },
            isFeatured: true,
            noOfBedRooms: true,
            noOfRestRooms: true,
            landArea: true,
            noOfFloors: true,
            propertyAge: true,
            facingDirection: true,
            floorArea: true,
            roadSize: true,
            floorLevel: true,
            tole: true,
            amenities: {
                select: {
                    id: true,
                    name: true,
                    icon: true,
                },
            },
            features: true,
            createdAt: true,
            images: {
                select: {
                    url: true
                }
            },
            location: {
                select: {
                    name: true,
                    municipality: {
                        select: {
                            name: true,
                            district: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    }
                }
            }

        }

    })
    if (!result) return notFound();

    const serializedProperty = {
        ...result,
        price: result.price.toString(),
        landArea: result.landArea?.toString() ?? null,
        floorArea: result.floorArea?.toString() ?? null,
        roadSize: result.roadSize?.toString() ?? null,
    };

    return (
        <div className="pb-16 sm:pb-24">
            <PropertyDetailClient property={serializedProperty} />
            <PropertyInfo property={serializedProperty} />
            <RelatedProperties categoryId={result.category.id} categoryName={result.category.name} currentPropertyId={result.id} type={result.type} />
        </div>
    )

}

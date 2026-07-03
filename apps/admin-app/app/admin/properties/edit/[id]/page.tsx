"use client";

import { AddPropertyForm } from "@repo/components/addPropertyForm";
import { useEditProperty, useFetchPropertyDetail, useUser } from "@repo/query-hook";
import PageLoading from "@repo/ui/pageloading";
import { PropertyFormdata } from "@repo/validators";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

interface Amenity {
    id: string;
    icon: string;
    name: string;
    createdAt: string;
}
export default function EditPropertyPage() {
    const params = useParams();
    const queryClient = useQueryClient();
    const router = useRouter();
    const { mutate, isPending } = useEditProperty(params.id as string);
    const {
        data: property,
        isLoading,
        isError,
        error,
    } = useFetchPropertyDetail(params.id as string);

    const { data: user, isLoading: userLoading } = useUser();

    if (isLoading || userLoading) return <PageLoading />;

    if (isError || !property) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-red-500">
                <AlertCircle size={48} className="mb-4" />
                <p className="text-lg font-bold">{error?.message || "Couldn't fetch property data"}</p>
            </div>
        );
    }

    const amenities = property.amenities ? property.amenities.map((amenity: Amenity) => amenity.id) : [];


    const initialData: PropertyFormdata = {
        title: property.title,
        description: property.description,
        type: property.type,
        categoryId: property.category.id,
        districtId: property.location.municipality.district.id,
        municipalityId: property.location.municipality.id,
        locationId: property.location.id,
        negotiable: property.negotiable,
        features: property.features,
        price: property.price,
        tole: property.tole,
        lat: property.lat,
        lng: property.lng,
        noOfBedRooms:
            property.noOfBedRooms != null
                ? property.noOfBedRooms.toString()
                : "",
        noOfRestRooms:
            property.noOfRestRooms != null
                ? property.noOfRestRooms.toString()
                : "",

        landArea: property.landArea ?? "",
        noOfFloors:
            property.noOfFloors != null
                ? property.noOfFloors.toString()
                : "",
        propertyAge: property.propertyAge != null ? property.propertyAge.toString() : "",
        facingDirection: property.facingDirection ? property.facingDirection : "",
        floorArea: property.floorArea ?? "",
        roadSize: property.roadSize ?? "",
        floorLevel:
            property.floorLevel != null
                ? property.floorLevel.toString()
                : "",
        verified: property.verified,
        images: property.images,
        amenities: amenities
    }

    const userRole = user.role;

    return (
        <AddPropertyForm initialData={initialData} onSubmit={(data: FormData) => mutate(data, {
            onSuccess: (data) => {
                toast.success(data.message || "Update successful");
                queryClient.invalidateQueries({
                    queryKey: ["property-detail", params.id]
                });
                queryClient.invalidateQueries({
                    queryKey: ["all-properties"]
                })
                router.replace(`/admin/properties/${params.id}`)

            }
        })} isEditing={true} isLoading={isPending} user={userRole} />
    )
}
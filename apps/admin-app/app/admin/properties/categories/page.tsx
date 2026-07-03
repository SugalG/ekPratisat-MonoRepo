"use client";

import { CategoryModal } from "@repo/components/categoryModal";
import { useGetCategories } from "@repo/query-hook";
import AnimateLoader from "@repo/ui/animateLoader";
import { CategorySchema } from "@repo/validators";
import Image from "next/image";
import { useState } from "react";
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";

const requirements = [
    { key: "isLandAreaNeeded", label: "Land Area" },
    { key: "isNoOfFloorsNeeded", label: "Number of Floors" },
    { key: "isNoOfRoomsNeeded", label: "Number of Rooms" },
    { key: "isAgeOfThePropertyNeeded", label: "Age of Property" },
    { key: "isNoOfRestRoomsNeeded", label: "Number of Rest Rooms" },
    { key: "isFacingDirectionNeeded", label: "Facing Direction" },
    { key: "isFloorAreaNeeded", label: "Floor Area" },
    { key: "isFloorLevelNeeded", label: "Floor Level" },
    { key: "isRoadSizeNeeded", label: "Road Size" },
];

interface FinalCategorySchema extends CategorySchema {
  imageUrl?: string;
}

export default function AllCategories() {
    const { data, isLoading, isError, error } = useGetCategories();
    
    const [initialData, setInitialData] = useState<FinalCategorySchema>({
        isAgeOfThePropertyNeeded: false,
        isFacingDirectionNeeded: false,
        isFloorAreaNeeded: false,
        isFloorLevelNeeded: false,
        isLandAreaNeeded: false,
        isNoOfFloorsNeeded: false,
        isNoOfRestRoomsNeeded: false,
        isNoOfRoomsNeeded: false,
        isRoadSizeNeeded: false,
        name: "",
        imageUrl: ""
    });

    const [openId, setOpenId] = useState<string | null>(null);
    const [showCategoryModal, setShowCategoryModal] = useState("");
    const [createCategoryModal, setCreateCategoryMdoal] = useState(false);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <AnimateLoader />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="min-h-screen flex items-center justify-center text-red-500 font-medium">
                {error.message || "Try again later!!!"}
            </div>
        );
    }

    const categories = data?.result || [];

    return (
        <div className="max-w-7xl p-4 sm:p-6 lg:p-8 antialiased ">
            
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Property Categories</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage structural parameters and application form conditions.</p>
                </div>
                
                <button
                    onClick={() => {
                        setShowCategoryModal("");
                        setCreateCategoryMdoal(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-medium px-4 py-2.5 rounded-lg shadow-sm transition active:scale-[0.98] text-sm self-start sm:self-auto"
                >
                    <Plus className="h-4 w-4" />
                    Add Category
                </button>
            </div>

            {/* Grid Display Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((category) => {
                    const isOpen = openId === category.id;

                    return (
                        /* 🌟 Removed overflow-hidden from the card wrapper so elements can float outside of it */
                        <div 
                            key={category.id} 
                            className={`group flex flex-col border border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition duration-200 ${
                                isOpen ? "relative z-30 border-gray-300" : "relative z-10"
                            }`}
                        >
                            
                            {/* Graphic Container Frame (Added rounded-t-2xl here instead) */}
                            <div className="relative h-48 w-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-t-2xl overflow-hidden">
                                <Image
                                    src={`${process.env.NEXT_PUBLIC_BASE_URL}${category.imageUrl}`}
                                    alt={category.name}
                                    fill
                                    className="object-cover transition duration-300 group-hover:scale-[1.01]"
                                />
                            </div>

                            {/* Text / Interaction fields */}
                            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <h2 className="text-lg font-bold text-gray-900 capitalize tracking-tight mt-0.5">
                                        {category.name}
                                    </h2>

                                    {/* Control Operations Cluster */}
                                    <div className="flex gap-1.5 shrink-0">
                                        <button
                                            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition"
                                            onClick={() => {
                                                setInitialData({
                                                    name: category.name,
                                                    imageUrl: category.imageUrl,
                                                    image: undefined as any, 
                                                    isAgeOfThePropertyNeeded: category.isAgeOfThePropertyNeeded,
                                                    isFacingDirectionNeeded: category.isFacingDirectionNeeded,
                                                    isFloorAreaNeeded: category.isFloorAreaNeeded,
                                                    isFloorLevelNeeded: category.isFloorLevelNeeded,
                                                    isLandAreaNeeded: category.isLandAreaNeeded,
                                                    isNoOfFloorsNeeded: category.isNoOfFloorsNeeded,
                                                    isNoOfRestRoomsNeeded: category.isNoOfRestRoomsNeeded,
                                                    isNoOfRoomsNeeded: category.isNoOfRoomsNeeded,
                                                    isRoadSizeNeeded: category.isRoadSizeNeeded,
                                                });
                                                setShowCategoryModal(category.id);
                                                setCreateCategoryMdoal(false);
                                            }}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>

                                        <button
                                            className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition"
                                            onClick={() => console.log("delete", category.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Form Dropdown Selection Panels */}
                                <div className="relative pt-1">
                                    <button
                                        className={`w-full flex items-center justify-between text-xs font-semibold px-3 py-2 rounded-lg border transition ${
                                            isOpen 
                                                ? 'bg-gray-50 border-gray-300 text-gray-900' 
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                        onClick={() => setOpenId(isOpen ? null : category.id)}
                                    >
                                        <span>PROPERTY REQUIREMENTS</span>
                                        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                    </button>

                                    {isOpen && (
                                        /* 🌟 Overlaps everything beautifully beneath it with absolute positioning, a solid bg, z-50 stack, and shadow-xl drop */
                                        <div className="absolute top-full left-0 w-full mt-1 border border-gray-200 rounded-xl p-3 space-y-2 bg-white shadow-xl z-50">
                                            {requirements
                                                .filter((item) => category[item.key as keyof typeof category])
                                                .map((item) => (
                                                    <div key={item.key} className="flex items-center justify-between text-xs py-0.5">
                                                        <span className="text-gray-600 font-medium">{item.label}</span>
                                                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-100">
                                                            <CheckCircle className="h-2.5 w-2.5" />
                                                            Required
                                                        </span>
                                                    </div>
                                                ))}

                                            {!requirements.some((item) => category[item.key as keyof typeof category]) && (
                                                <p className="text-gray-400 text-xs text-center py-2 italic">
                                                    No special parameters demanded.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Overlay Elements mounting */}
            {showCategoryModal && (
                <CategoryModal 
                    onClose={() => setShowCategoryModal("")} 
                    categoryId={showCategoryModal}
                    initialData={initialData}
                />
            )}
            {createCategoryModal && (
                <CategoryModal onClose={() => setCreateCategoryMdoal(false)}/>
            )}
        </div>
    );
}
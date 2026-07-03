"use client";

import { useCreateCategory, useUpdateCategory } from "@repo/query-hook";
import ButtonLoader from "@repo/ui/buttonLoader";
import { CategorySchema } from "@repo/validators";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { toast } from "sonner";

interface FinalCategorySchema extends CategorySchema {
  imageUrl?: string;
}

type Props = {
  onClose: () => void;
  initialData?: FinalCategorySchema;
  categoryId?: string;
};


const booleanFields: { key: keyof CategorySchema; label: string }[] = [
  { key: "isLandAreaNeeded", label: "Land Area" },
  { key: "isNoOfFloorsNeeded", label: "Number of Floors" },
  { key: "isNoOfRoomsNeeded", label: "Number of Rooms" },
  { key: "isAgeOfThePropertyNeeded", label: "Age of Property" },
  { key: "isNoOfRestRoomsNeeded", label: "Number of Restrooms" },
  { key: "isFacingDirectionNeeded", label: "Facing Direction" },
  { key: "isFloorAreaNeeded", label: "Floor Area" },
  { key: "isFloorLevelNeeded", label: "Floor Level" },
  { key: "isRoadSizeNeeded", label: "Road Size" },
];

export const CategoryModal: React.FC<Props> = ({ onClose, initialData, categoryId }) => {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const [formData, setFormData] = useState<CategorySchema>({
    name: initialData?.name || "", // 👈 Added '?' to safely handle undefined
    image: undefined as unknown as File,

    // 🛡️ Always provide default false fallbacks for booleans too!
    isLandAreaNeeded: initialData?.isLandAreaNeeded ?? false,
    isNoOfFloorsNeeded: initialData?.isNoOfFloorsNeeded ?? false,
    isNoOfRoomsNeeded: initialData?.isNoOfRoomsNeeded ?? false,
    isAgeOfThePropertyNeeded: initialData?.isAgeOfThePropertyNeeded ?? false,
    isNoOfRestRoomsNeeded: initialData?.isNoOfRestRoomsNeeded ?? false,
    isFacingDirectionNeeded: initialData?.isFacingDirectionNeeded ?? false,
    isFloorAreaNeeded: initialData?.isFloorAreaNeeded ?? false,
    isFloorLevelNeeded: initialData?.isFloorLevelNeeded ?? false,
    isRoadSizeNeeded: initialData?.isRoadSizeNeeded ?? false,
  });
  const [imageUrl, setImageUrl] = useState<string>(initialData?.imageUrl || "");

  const queryClient = useQueryClient();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const handleTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    }
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData, name: formData.name.replace(/\s+/g, " ").trim()
    }
    const form = new FormData();
    form.append("name", payload.name);
    form.append("isLandAreaNeeded", String(payload.isLandAreaNeeded));
    form.append("isNoOfFloorsNeeded", String(payload.isNoOfFloorsNeeded));
    form.append("isNoOfRoomsNeeded", String(payload.isNoOfRoomsNeeded));
    form.append("isAgeOfThePropertyNeeded", String(payload.isAgeOfThePropertyNeeded));
    form.append("isNoOfRestRoomsNeeded", String(payload.isNoOfRestRoomsNeeded));
    form.append("isFacingDirectionNeeded", String(payload.isFacingDirectionNeeded));
    form.append("isFloorAreaNeeded", String(payload.isFloorAreaNeeded));
    form.append("isFloorLevelNeeded", String(payload.isFloorLevelNeeded));
    form.append("isRoadSizeNeeded", String(payload.isRoadSizeNeeded));
    if (payload.image) {
      form.append("image", payload.image);
    }

    if (categoryId) {
      updateCategory.mutate({ id: categoryId, formData: form }, {
        onSuccess: (data) => {
          toast.success(data.message || "Completed Successfully!!!");
          queryClient.invalidateQueries({
            queryKey: ["categories"]
          })
          setTimeout(() => {
            onClose();
          }, 1000);
        }
      })
    } else {
      createCategory.mutate(form, {
        onSuccess: () => {
          toast.success("Category Created Successfully!!!");
          queryClient.invalidateQueries({
            queryKey: ["categories"]
          })
          setTimeout(() => {
            onClose();
          }, 1000);
        }
      })

    }

  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/45 p-2 backdrop-blur-[2px] dark:bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="ek-form-shell m-auto w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl"
      >
        <h2 className="text-xl sm:text-2xl font-bold mb-4 text-secondary-900 dark:text-secondary-50">
          {categoryId ? "Update Category" : "Add Category"}
        </h2>

        {/* Name */}
        <div className="mb-4">
          <label className="block font-medium mb-1 text-secondary-700 dark:text-secondary-200">
            Category Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleTextChange}
            className="w-full border border-secondary-300 dark:border-secondary-600 px-3 py-2 rounded bg-secondary-50 dark:bg-secondary-900 text-secondary-900 dark:text-secondary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600"
            required
          />
        </div>
        {
          imageUrl && (
            <div className="space-y-1">
              <label className="block font-medium text-secondary-700 dark:text-secondary-200">
                Current Image <span className="text-xs text-gray-400">*This is current image for the category*</span>
              </label>

              {/* Container Wrapper */}
              <div className="h-20 w-20 sm:h-40 sm:w-52 border rounded-md overflow-hidden bg-gray-50">
                <img
                  src={`${process.env.NEXT_PUBLIC_BASE_URL}${imageUrl}`}
                  loading="lazy"
                  alt="Category Preview"
                  // 🚀 Fixed: Force full size and crop nicely
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          )
        }

        {/* Image */}
        <div className="mb-4">
          <label className="block font-medium mb-1 text-secondary-700 dark:text-secondary-200">
            Category Image {categoryId && <span className="text-xs text-gray-400">*Only use to change category Image*</span>}
          </label>
          <input
            type="file"
            name="image"
            accept="image/*"
            onChange={handleFileChange}
            className="text-secondary-900 dark:text-secondary-50"
            required={!categoryId}
          />
        </div>

        {/* Boolean Fields */}
        <div className="mb-4">
          <p className="font-medium mb-2 text-secondary-800 dark:text-secondary-200">
            Property Fields
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {booleanFields.map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-2 text-secondary-700 dark:text-secondary-200"
              >
                <input
                  type="checkbox"
                  name={key}
                  checked={formData[key] as boolean}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      [key]: e.target.checked,
                    }))
                  }
                  className="accent-primary-500 dark:accent-primary-600"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="ek-secondary-button"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ek-primary-button"
          >
            {categoryId ? updateCategory.isPending ? "Updating" : "Update" : createCategory.isPending ? "Adding" : "Add"}
      
          </button>
        </div>
      </form>
    </div>

  );
};

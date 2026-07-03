"use client";

import React, { useState, ChangeEvent, FormEvent, useEffect, useRef } from "react";
import { CategoryModal } from "./categoryModal";
import { LocationModal } from "./locationModal";
import { useCreateProperty, useGetAmenities, useGetCategories, useGetLocationTree } from "@repo/query-hook";
import { toast } from "sonner";
import { CreatePropertySchema, PropertyFormdata } from "@repo/validators";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

// Mapbox
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import { compressImage } from "./utils/image-compression";
import { Button } from "@repo/ui/button";
import AddAmenity from "./CreateAmenityModal";
import DynamicIcon from "./DynamicIcon";

type Amenity = {
  id: string;
  name: string;
  icon: string;
}
type Props = {
  user: string;
  initialData: PropertyFormdata;
  onSubmit: (data: FormData) => void;
  isEditing?: boolean;
  isLoading?: boolean;
};

interface KeyValueRow {
  id: string;
  key: string;
  value: string;
}

interface FormSchema extends CreatePropertySchema {
  districtId: string;
  municipalityId: string;
}

type SaleType = "sale" | "rent";
type DirectionType =
  | "east"
  | "west"
  | "north"
  | "south"
  | "northeast"
  | "northwest"
  | "southeast"
  | "southwest";

interface ExistingImageType {
  url: string;
}


const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Nepal bbox: [minLng, minLat, maxLng, maxLat]
const NEPAL_BBOX: [number, number, number, number] = [80.058, 26.347, 88.201, 30.447];

// Kathmandu fallback
const KATHMANDU: [number, number] = [85.324, 27.7172];

function MapPicker({
  value,
  onChange,
}: {
  value: { lat: number | null; lng: number | null };
  onChange: (v: { lat: number; lng: number }) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const geocoderContainerRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!MAPBOX_TOKEN) return;
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    (mapboxgl as any).accessToken = MAPBOX_TOKEN;

    const startCenter: [number, number] =
      value.lng != null && value.lat != null ? [value.lng, value.lat] : KATHMANDU;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: startCenter,
      zoom: value.lng != null && value.lat != null ? 15 : 11,
      maxBounds: NEPAL_BBOX,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // ✅ Current location button
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      trackUserLocation: false,
      showUserHeading: true,
    });
    map.addControl(geolocate, "top-right");

    geolocate.on("geolocate", (e: any) => {
      const lat = e.coords.latitude as number;
      const lng = e.coords.longitude as number;
      const accuracy = e.coords.accuracy as number; // meters

      placeOrMoveMarker(lng, lat);
      onChange({ lat, lng });
      map.flyTo({ center: [lng, lat], zoom: accuracy <= 50 ? 17 : 15 });

      if (accuracy > 150) {
        // big warning for user
        toast.warning(`Low GPS accuracy (~${Math.round(accuracy)}m). Please drag marker to correct.`);
      } else {
        toast.success(`Location detected (~${Math.round(accuracy)}m accuracy)`);
      }

      // IMPORTANT: stop continuous tracking after first result
      geolocate._watchState = "OFF";
    });

    // ✅ Nepal-biased search
    if (geocoderContainerRef.current) {
      const geocoder = new MapboxGeocoder({
        accessToken: MAPBOX_TOKEN,
        mapboxgl: mapboxgl as any,
        marker: false,
        placeholder: "Search in Nepal (place / area / address)",
        countries: "np",
        bbox: NEPAL_BBOX,
        proximity: { longitude: startCenter[0], latitude: startCenter[1] },
        types: "country,region,place,locality,neighborhood,address,poi",
        limit: 6,
        localGeocoder: (query: string) => {
          const cleaned = query.trim();

          // supports:
          // 27.7172, 85.3240
          // 27.7172 85.3240
          const match = cleaned.match(
            /^(-?\d+(\.\d+)?)\s*,?\s*(-?\d+(\.\d+)?)$/
          );

          if (!match) return [];

          const first = parseFloat(match[1]!);
          const second = parseFloat(match[3]!);

          // assume input = lat, lng
          const lat = first;
          const lng = second;

          // Nepal sanity check
          if (
            lat < 26 ||
            lat > 31 ||
            lng < 80 ||
            lng > 89
          ) {
            return [];
          }

          return [
            {
              type: "Feature",
              place_name: `Coordinates: ${lat}, ${lng}`,
              center: [lng, lat],
              geometry: {
                type: "Point",
                coordinates: [lng, lat],
              },
              properties: {},
              place_type: ["coordinate"],
              text: `${lat}, ${lng}`,
            } as any,
          ];
        },
      });

      geocoderContainerRef.current.innerHTML = "";
      geocoderContainerRef.current.appendChild(geocoder.onAdd(map));

      geocoder.on("result", (ev: any) => {
        const coords = ev?.result?.center as [number, number] | undefined;
        if (!coords) return;

        const [lng, lat] = coords;
        placeOrMoveMarker(lng, lat);
        onChange({ lat, lng });
        map.flyTo({ center: [lng, lat], zoom: 16 });

        geocoder.setProximity({ longitude: lng, latitude: lat });
      });

      map.on("moveend", () => {
        const c = map.getCenter();
        geocoder.setProximity({ longitude: c.lng, latitude: c.lat });
      });
    }

    // Click-to-place
    map.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      placeOrMoveMarker(lng, lat);
      onChange({ lat, lng });
    });

    mapRef.current = map;

    if (value.lng != null && value.lat != null) {
      placeOrMoveMarker(value.lng, value.lat);
    }

    function placeOrMoveMarker(lng: number, lat: number) {
      if (!markerRef.current) {
        markerRef.current = new mapboxgl.Marker({ draggable: true })
          .setLngLat([lng, lat])
          .addTo(map);

        markerRef.current.on("dragend", () => {
          const pos = markerRef.current?.getLngLat();
          if (!pos) return;
          onChange({ lat: pos.lat, lng: pos.lng });
        });
      } else {
        markerRef.current.setLngLat([lng, lat]);
      }
    }

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // When form resets, remove marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (value.lat == null || value.lng == null) {
      markerRef.current?.remove();
      markerRef.current = null;
    }
  }, [value.lat, value.lng]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100">
        Map is not configured. Set <code className="font-semibold">NEXT_PUBLIC_MAPBOX_TOKEN</code>.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block font-medium">Pin Location on Map</label>

      <div ref={geocoderContainerRef} />

      <div
        ref={mapContainerRef}
        className="h-[320px] w-full overflow-hidden rounded-2xl border border-[var(--ek-border-soft)] shadow-sm dark:border-[var(--ek-dark-border)]"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-sm text-[var(--ek-text-secondary)] dark:text-[var(--ek-dark-muted)]">Latitude</label>
          <input
            value={value.lat ?? ""}
            readOnly
            className="w-full px-3 py-2 border rounded bg-secondary-50 dark:bg-secondary-800 dark:border-transparent"
            placeholder="Select on map"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--ek-text-secondary)] dark:text-[var(--ek-dark-muted)]">Longitude</label>
          <input
            value={value.lng ?? ""}
            readOnly
            className="w-full px-3 py-2 border rounded bg-secondary-50 dark:bg-secondary-800 dark:border-transparent"
            placeholder="Select on map"
          />
        </div>
      </div>

      <p className="text-xs text-[var(--ek-text-muted)] dark:text-[var(--ek-dark-soft)]">
        Use search (Nepal-biased), click the map, drag the marker, or use the current-location button.
      </p>
    </div>
  );
}


export const AddPropertyForm: React.FC<Props> = ({ initialData,
  onSubmit,
  isEditing = false,
  isLoading = false,
  user }) => {
  const [formData, setFormData] = useState<PropertyFormdata>(initialData)

  const [existingImages, setExistingImages] = useState<ExistingImageType[]>(
    (initialData as any)?.images || []
  )
  const [deleteImageIds, setDeleteImageIds] = useState<string[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [rows, setRows] = useState<KeyValueRow[]>([
    { id: "1", key: "", value: "" }
  ]);


  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const allBlobUrls = useRef<string[]>([]);


  useEffect(() => {
    if (initialData.features) {
      const populatedRows = Object.entries(initialData.features).map(([key, value]) => ({
        id: Math.random().toString(),
        key: key,
        value: typeof value === "string" ? value : JSON.stringify(value)
      }));
      setRows(populatedRows);
    }
    return () => {
      allBlobUrls.current.forEach(URL.revokeObjectURL);
      allBlobUrls.current = [];
    };
  }, []);

  // const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState<{
    type: "district" | "municipality" | "ward";
    parentId?: string;
  } | null>(null);

  const { data: categories, isLoading: categoryLoading } = useGetCategories();
  const { data: locations, isLoading: locationLoading } = useGetLocationTree();
  const { data: amenities, isLoading: amnetiesLaoding } = useGetAmenities();




  const selectedCategory = categories?.result.find((c) => c.id === formData.categoryId);

  const numericFields = [
    "price",
    "noOfBedRooms",
    "noOfRestRooms",
    "landArea",
    "noOfFloors",
    "propertyAge",
    "floorArea",
    "roadSize",
    "floorLevel",
  ];

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    let newValue = value;

    if (numericFields.includes(name)) {
      newValue = newValue.replace(/\D/g, "");
    }

    if (name === "categoryId") {
      setFormData((prev: any) => ({
        ...prev,
        [name]: newValue,
        noOfBedRooms: "",
        noOfRestRooms: "",
        landArea: "",
        noOfFloors: "",
        propertyAge: "",
        facingDirection: "",
        floorArea: "",
        roadSize: "",
        floorLevel: "",
      }));
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: newValue }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === "description") {
      setFormData((prev: any) => ({
        ...prev,
        [name]: value.trim()

      }));
      return;
    }

    setFormData((prev: any) => ({
      ...prev,
      [name]: value.trim().replace(/\s+/g, " "),
    }));
  };

  const handleAddImages = (imageFiles: File[]) => {
    setImages((prev) => {
      const existing = prev;

      const newFiles = imageFiles.filter((file) => {
        if (file.size > 1024 * 1024 * 10) {
          toast.error(`${file.name} > 10MB skipped`);
          return false;
        }

        // 🔥 dedup check (name + size)
        const alreadyExists = existing.some(
          (img) => img.file.name === file.name && img.file.size === file.size
        );

        if (alreadyExists) {
          toast.warning(`${file.name} already added`);
          return false;
        }

        return true;
      });

      if (
        existing.length +
        newFiles.length +
        existingImages.length -
        deleteImageIds.length >
        5
      ) {
        toast.error("Max 5 images allowed");
        return prev;
      }

      const newImages = newFiles.map((file) => {
        const preview = URL.createObjectURL(file);
        allBlobUrls.current.push(preview);
        return { file, preview };
      });

      return [...existing, ...newImages];
    });
  };

  const handleToggleAmenity = (amenityId: string) => {
    setFormData((prev) => {
      const isAlreadySelected = prev.amenities.includes(amenityId);

      return {
        ...prev,
        amenities: isAlreadySelected
          ? prev.amenities.filter((id) => id !== amenityId) // Remove if clicked again
          : [...prev.amenities, amenityId], // Add if not present
      };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log(formData);
    if (images.length + existingImages.length - deleteImageIds.length === 0) {
      toast.error("Please add atleast 1 image");
      return;
    }

    if (formData.lat == null || formData.lng == null) {
      toast.error("Please select the property location on the map");
      return;
    }

    const cleanedData = Object.fromEntries(
      Object.entries(formData)
        .filter(([key]) => !["districtId", "municipalityId", "features", "amenities"].includes(key))
        .map(([key, value]) => [key, value === "" ? null : value])
    ) as CreatePropertySchema;

    const cleanedImages = images.map((img) => img.file);
    setCompressing(true);
    const compressedImages = await Promise.all(
      images.map((img) => compressImage(img.file))
    );
    setCompressing(false);

    const form = new FormData();

    if (deleteImageIds.length > 0) {
      form.append("deleteImageIds", JSON.stringify(deleteImageIds));
    }

    if (formData.amenities.length > 0) {
      form.append("amenities", JSON.stringify(formData.amenities));
    }

    Object.entries(cleanedData).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        form.append(key, "");
        return;
      };

      if (typeof value === "boolean" || typeof value === "number") {
        form.append(key, String(value));
      } else if (typeof value === "string") {
        form.append(key, value);
      }
    });

    compressedImages.forEach((file) => form.append("images", file));

    const finalNoteObject: Record<string, string> = {};
    let emptyKeyFound = false;
    let emptyValueFound = false;

    rows.forEach(row => {
      const trimmedKey = row.key.trim();
      const trimmedValue = row.value.trim();

      if (trimmedKey === "" && trimmedValue !== "") {
        emptyKeyFound = true;
      } else if (trimmedKey !== "" && trimmedValue === "") {
        emptyValueFound = true;
      } else if (trimmedKey !== "" && trimmedValue !== "") {
        finalNoteObject[trimmedKey] = trimmedValue;
      }
    });

    if (emptyKeyFound) {
      toast.error("A value is missing its Label/Key name.");
      return;
    }

    if (emptyValueFound) {
      toast.error("A Label/Key is missing its corresponding value.");
      return;
    }

    if (Object.keys(finalNoteObject).length > 0) {
      form.append("features", JSON.stringify(finalNoteObject));
    }

    onSubmit(form);
  };

  const handleAddRow = () => {
    setRows([...rows, { id: Math.random().toString(), key: "", value: "" }]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length === 1) {
      setRows([{ id: Math.random().toString(), key: "", value: "" }]);
      return;
    }
    setRows(rows.filter(row => row.id !== id));
  };

  const handleFieldChange = (id: string, field: "key" | "value", newValue: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: newValue } : row));
  };

  return (
    <div className="ek-form-shell">
      <div className="mb-6 border-b border-[var(--ek-border-soft)] pb-5 dark:border-[var(--ek-dark-border)]">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--ek-gold-text)] dark:text-[var(--ek-dark-gold)]">
          Property listing
        </p>
        <h2 className="mt-2 text-2xl font-black text-[var(--ek-text-primary)] dark:text-[var(--ek-dark-text)]">
          {isEditing ? "Update Property" : "Add Property"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block font-medium mb-1">Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 rounded-md 
              bg-secondary-50 dark:bg-secondary-800 
              text-secondary-900 dark:text-secondary-50
              border border-secondary-300 dark:border-transparent 
              focus:ring-2 focus:ring-primary-500 focus:outline-none
              placeholder-secondary-400 transition`}
            placeholder="Enter title"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block font-medium mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 rounded-md 
              bg-secondary-50 dark:bg-secondary-800 
              text-secondary-900 dark:text-secondary-50
              border border-secondary-300 dark:border-transparent 
              focus:ring-2 focus:ring-primary-500 focus:outline-none
              placeholder-secondary-400 transition`}
            placeholder="Enter Description"
            required
          />
        </div>

        {/* Type */}
        <div>
          <label className="block font-medium mb-1">Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className={`w-full px-3 py-2 rounded-md 
              bg-secondary-50 dark:bg-secondary-800 
              text-secondary-900 dark:text-secondary-50
              border border-secondary-300 dark:border-transparent 
              focus:ring-2 focus:ring-primary-500 focus:outline-none
              placeholder-secondary-400 transition`}
            required
          >
            <option value="sale">Sale</option>
            <option value="rent">Rent</option>
          </select>
        </div>



        {/* Category */}
        <div>
          <label className="block font-medium mb-1">Category</label>
          <div className="flex gap-2">
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              disabled={isEditing}
              className="w-full px-3 py-2 rounded-md bg-secondary-50 dark:bg-secondary-800 text-secondary-900 dark:text-secondary-50 focus:ring-2 focus:ring-primary-500 focus:outline-none placeholder-secondary-400 transition dark:border-transparent"
              required
            >
              <option value="" hidden disabled>
                Select Category
              </option>
              {categoryLoading ? (
                <option disabled>Loading categories...</option>
              ) : (
                categories?.result.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))
              )}
            </select>
            {/* {user === "admin" && (
              <button
                type="button"
                className="ek-primary-button shrink-0 px-4 py-2"
                onClick={() => setShowCategoryModal(true)}
              >
                Add
              </button>
            )} */}
          </div>
        </div>

        {/* price */}
        <div>
          <label className="block font-medium mb-1">Price</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500">Rs</span>
            <input
              type="text"
              name="price"
              value={formData.price}
              inputMode="numeric"
              onChange={handleChange}
              className="ek-price-input w-full border rounded bg-secondary-50 py-2 pl-11 pr-3 text-secondary-900 dark:bg-secondary-800 dark:text-secondary-50 dark:border-transparent"
              required
            />
          </div>
        </div>

        {/* Negotiation */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="negotiable"
            id="negotiable"
            checked={formData.negotiable}
            onChange={() => setFormData((prev: any) => ({ ...prev, negotiable: !prev.negotiable }))}
            className="h-4 w-4 accent-primary-600 cursor-pointer"
          />
          <label htmlFor="verified" className="font-medium text-secondary-900 dark:text-secondary-50">
            Is the pricing negotiable?
          </label>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">
              Additional Features
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRow}
              className="flex items-center gap-1.5 h-8 text-xs border-dashed"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </Button>
          </div>

          <div className="space-y-4 sm:space-y-2.5">
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] items-center gap-3 p-3 sm:p-0 bg-secondary-50/50 dark:bg-secondary-800/20 sm:bg-transparent rounded-xl border border-secondary-200 dark:border-secondary-700 sm:border-none"
              >
                {/* Key Input */}
                <input
                  type="text"
                  value={row.key}
                  onChange={(e) => handleFieldChange(row.id, "key", e.target.value)}
                  placeholder="Label (e.g., Furnishing)"
                  className="w-full px-3 py-1.5 text-sm border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />

                {/* Value Input */}
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) => handleFieldChange(row.id, "value", e.target.value)}
                  placeholder="Value (e.g., Semi-Furnished)"
                  className="w-full px-3 py-1.5 text-sm border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />

                {/* Delete Button Container */}
                <div className="flex justify-end mt-2 sm:mt-0">
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(row.id)}
                    className="p-2 text-secondary-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Location (District/Municipality/Ward) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* District */}
          <div className="flex flex-col">
            <label className="font-medium mb-1">District</label>
            <div className="flex gap-2">
              <select
                name="districtId"
                value={formData.districtId}
                onChange={(e) => {
                  handleChange(e);
                  setFormData((prev: any) => ({ ...prev, municipalityId: "", locationId: "" }));
                }}
                className="flex-1 px-2 py-1 border rounded dark:border-transparent"
                required
              >
                <option value="" disabled hidden>
                  Select District
                </option>
                {locationLoading ? (
                  <option disabled>Loading districts...</option>
                ) : (
                  locations?.result.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))
                )}
              </select>

              {(user === "admin" || user === "staff") && (
                <button
                  type="button"
                  className="ek-primary-button shrink-0 px-4 py-2"
                  onClick={() => setShowLocationModal({ type: "district" })}
                >
                  Add
                </button>
              )}
            </div>
          </div>

          {/* Municipality */}
          <div className="flex flex-col">
            <label className="font-medium mb-1">Municipality</label>
            <div className="flex gap-2">
              <select
                name="municipalityId"
                value={formData.municipalityId}
                onChange={(e) => {
                  handleChange(e);
                  setFormData((prev: any) => ({ ...prev, locationId: "" }));
                }}
                className="flex-1 px-2 py-1 border rounded dark:border-transparent"
                required
                disabled={!formData.districtId}
              >
                <option value="" disabled hidden>
                  Select Municipality
                </option>
                {formData.districtId &&
                  locations?.result
                    .find((d) => d.id === formData.districtId)
                    ?.municipalities.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
              </select>

              {(user === "admin" || user === "staff") && formData.districtId && (
                <button
                  type="button"
                  className="ek-primary-button shrink-0 px-4 py-2"
                  onClick={() => setShowLocationModal({ type: "municipality", parentId: formData.districtId })}
                >
                  Add
                </button>
              )}
            </div>
          </div>

          {/* Ward */}
          <div className="flex flex-col">
            <label className="font-medium mb-1">Ward</label>
            <div className="flex gap-2">
              <select
                name="locationId"
                value={formData.locationId}
                onChange={handleChange}
                className="flex-1 px-2 py-1 border rounded dark:border-transparent"
                required
                disabled={!formData.municipalityId}
              >
                <option value="" disabled hidden>
                  Select Ward
                </option>
                {formData.municipalityId &&
                  locations?.result
                    .flatMap((d) => d.municipalities)
                    .find((m) => m.id === formData.municipalityId)
                    ?.wards.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
              </select>

              {(user === "admin" || user === "staff") && formData.municipalityId && (
                <button
                  type="button"
                  className="ek-primary-button shrink-0 px-4 py-2"
                  onClick={() => setShowLocationModal({ type: "ward", parentId: formData.municipalityId })}
                >
                  Add
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block font-medium mb-1">Tole/Street</label>
          <input
            type="text"
            name="tole"
            value={formData.tole}
            onChange={handleChange}
            onBlur={handleBlur}
            className="w-full px-3 py-2 border rounded bg-secondary-50 dark:bg-secondary-800 text-secondary-900 dark:text-secondary-50 focus:ring-2 focus:ring-primary-500 focus:outline-none placeholder-secondary-400 transition dark:border-transparent"
            placeholder="Enter tole/street"
            required
          />
        </div>

        <div className="flex flex-col space-y-3 p-4 border border-secondary-100 dark:border-secondary-800 rounded-2xl bg-secondary-50/50 dark:bg-secondary-900/20">
          {/* Header section with your working modal */}
          <div className="flex justify-between items-center">
            <div>
              <label className="block font-semibold text-sm text-secondary-900 dark:text-secondary-100">
                Property Amenities
              </label>
              <p className="text-xs text-secondary-500">Select all amenities available at this location</p>
            </div>
            {
              user === "admin" && (
                <AddAmenity />
              )
            }
          </div>

          <hr className="border-secondary-100 dark:border-secondary-800/60" />

          {/* 🔄 Loading State */}
          {amnetiesLaoding ? (
            <div className="flex items-center gap-2 py-4 text-xs text-secondary-500">
              <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
              <span>Loading dynamic amenities system...</span>
            </div>
          ) : amenities.result.length === 0 ? (
            /* 📭 Empty State */
            <div className="text-center py-6 border border-dashed border-secondary-200 dark:border-secondary-800 rounded-xl">
              <p className="text-xs text-secondary-500">No amenities created yet.</p>
              <p className="text-[11px] text-secondary-400 mt-0.5">Click "Add" above to create your first one.</p>
            </div>
          ) : (
            /* 🎛️ Selectable Box Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {amenities.result.map((amenity: Amenity) => {
                const isSelected = formData.amenities?.includes(amenity.id);

                return (
                  <button
                    key={amenity.id}
                    type="button" // 🛡️ Crucial: Prevents parent form submission!
                    onClick={() => handleToggleAmenity(amenity.id)}
                    className={`group flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${isSelected
                      ? "border-primary-500 bg-primary-50/40 dark:bg-primary-950/20 ring-1 ring-primary-500"
                      : "border-secondary-200 dark:border-secondary-800 bg-white dark:bg-secondary-900 hover:border-secondary-300 dark:hover:border-secondary-700"
                      }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {/* Dynamic icon string render fallback */}
                      <DynamicIcon
                        name={amenity.icon}
                        className="w-5 h-5 text-primary-600 dark:text-primary-400"
                      />
                      <span className={`text-xs font-medium truncate ${isSelected
                        ? "text-primary-900 dark:text-primary-300 font-semibold"
                        : "text-secondary-700 dark:text-secondary-300"
                        }`}>
                        {amenity.name}
                      </span>
                    </div>

                    {/* Visual indicator checkbox */}
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all border ${isSelected
                      ? "bg-primary-500 border-primary-500 text-white animate-scaleIn"
                      : "border-secondary-300 dark:border-secondary-700 bg-transparent"
                      }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* NEW: Map Picker */}
        <MapPicker
          value={{ lat: formData.lat, lng: formData.lng }}
          onChange={({ lat, lng }) => setFormData((prev: any) => ({ ...prev, lat, lng }))}
        />

        {/* Dynamic fields */}
        {selectedCategory && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {selectedCategory.isLandAreaNeeded && (
              <div>
                <label className="block font-medium mb-1">Land Area (sq mtr)</label>
                <input
                  type="text"
                  name="landArea"
                  value={formData.landArea}
                  inputMode="numeric"
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded bg-secondary-50 dark:bg-secondary-800 text-secondary-900 dark:text-secondary-50 focus:ring-2 focus:ring-primary-500 focus:outline-none
              placeholder-secondary-400 transition dark:border-transparent"
                  required
                />
              </div>
            )}

            {selectedCategory.isNoOfFloorsNeeded && (
              <div>
                <label className="block font-medium mb-1">No. of Floors</label>
                <input
                  type="text"
                  name="noOfFloors"
                  value={formData.noOfFloors}
                  inputMode="numeric"
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded bg-secondary-50 dark:bg-secondary-800 text-secondary-900 dark:text-secondary-50 focus:ring-2 focus:ring-primary-500 focus:outline-none
              placeholder-secondary-400 transition dark:border-transparent"
                  required
                />
              </div>
            )}

            {selectedCategory.isNoOfRoomsNeeded && (
              <div>
                <label className="block font-medium mb-1">No. of Rooms</label>
                <input
                  type="text"
                  name="noOfBedRooms"
                  value={formData.noOfBedRooms}
                  inputMode="numeric"
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded bg-secondary-50 dark:bg-secondary-800 text-secondary-900 dark:text-secondary-50 focus:ring-2 focus:ring-primary-500 focus:outline-none
              placeholder-secondary-400 transition dark:border-transparent"
                  required
                />
              </div>
            )}

            {selectedCategory.isNoOfRestRoomsNeeded && (
              <div>
                <label className="block font-medium mb-1">No. of Rest Rooms</label>
                <input
                  type="text"
                  name="noOfRestRooms"
                  value={formData.noOfRestRooms}
                  inputMode="numeric"
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded bg-secondary-50 dark:bg-secondary-800 text-secondary-900 dark:text-secondary-50 focus:ring-2 focus:ring-primary-500 focus:outline-none
              placeholder-secondary-400 transition dark:border-transparent"
                  required
                />
              </div>
            )}

            {selectedCategory.isAgeOfThePropertyNeeded && (
              <div>
                <label className="block font-medium mb-1">Property Age (years)</label>
                <input
                  type="text"
                  name="propertyAge"
                  value={formData.propertyAge}
                  inputMode="numeric"
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded bg-secondary-50 dark:bg-secondary-800 text-secondary-900 dark:text-secondary-50 focus:ring-2 focus:ring-primary-500 focus:outline-none
              placeholder-secondary-400 transition dark:border-transparent"
                  required
                />
              </div>
            )}

            {selectedCategory.isFacingDirectionNeeded && (
              <div>
                <label className="block font-medium mb-1">Facing Direction</label>
                <select
                  name="facingDirection"
                  value={formData.facingDirection}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded bg-secondary-50 dark:bg-secondary-800 text-secondary-900 dark:text-secondary-50 focus:ring-2 focus:ring-primary-500 focus:outline-none
              placeholder-secondary-400 transition dark:border-transparent"
                  required
                >
                  <option value="" disabled hidden>
                    Select Direction
                  </option>
                  <option value="east">East</option>
                  <option value="west">West</option>
                  <option value="north">North</option>
                  <option value="south">South</option>
                  <option value="northeast">Northeast</option>
                  <option value="northwest">Northwest</option>
                  <option value="southeast">Southeast</option>
                  <option value="southwest">Southwest</option>
                </select>
              </div>

            )}

            {selectedCategory.isFloorAreaNeeded && (
              <div>
                <label className="block font-medium mb-1">Floor Area (sq ft)</label>
                <input
                  type="text"
                  name="floorArea"
                  value={formData.floorArea}
                  inputMode="numeric"
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded bg-secondary-50 dark:bg-secondary-800 text-secondary-900 dark:text-secondary-50 focus:ring-2 focus:ring-primary-500 focus:outline-none
              placeholder-secondary-400 transition dark:border-transparent"
                  required
                />
              </div>
            )}

            {selectedCategory.isFloorLevelNeeded && (
              <div>
                <label className="block font-medium mb-1">Floor Level</label>
                <input
                  type="text"
                  name="floorLevel"
                  value={formData.floorLevel}
                  inputMode="numeric"
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded bg-secondary-50 dark:bg-secondary-800 text-secondary-900 dark:text-secondary-50 focus:ring-2 focus:ring-primary-500 focus:outline-none
              placeholder-secondary-400 transition dark:border-transparent"
                  placeholder="eg: 0 means GroundFloor"
                  required
                />
              </div>
            )}

            {selectedCategory.isRoadSizeNeeded && (
              <div>
                <label className="block font-medium mb-1">Road Size (ft)</label>
                <input
                  type="text"
                  name="roadSize"
                  value={formData.roadSize}
                  inputMode="numeric"
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded bg-secondary-50 dark:bg-secondary-800 text-secondary-900 dark:text-secondary-50 focus:ring-2 focus:ring-primary-500 focus:outline-none
              placeholder-secondary-400 transition dark:border-transparent"
                  required
                />
              </div>
            )}
          </div>
        )}

        {/* Existing Images */}

        {
          existingImages.length > 0 && (
            <div>
              <label className="block font-medium mb-1">Existing Images</label>

              <div className="flex items-center gap-4">
                <div className="flex gap-2 overflow-x-auto">
                  {existingImages?.map((img: any) => {
                    const isDeleted = deleteImageIds.includes(img.id);

                    return (
                      <div
                        key={img.id}
                        className={`relative group transition ${isDeleted ? "opacity-40" : ""
                          }`}
                      >
                        <img
                          src={`${process.env.NEXT_PUBLIC_BASE_URL}${img.url}`}
                          alt="preview"
                          className="w-20 h-20 object-cover rounded border"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            setDeleteImageIds((prev) => {
                              const set = new Set(prev);

                              if (set.has(img.id)) {
                                set.delete(img.id); // undo delete
                              } else {
                                set.add(img.id); // mark delete
                              }

                              return Array.from(set);
                            });
                          }}
                          className="absolute top-0 right-0 bg-black/60 text-white text-xs px-1 rounded opacity-0 group-hover:opacity-100 transition"
                        >
                          {isDeleted ? "↺" : "✕"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          )
        }



        {/* Images Upload */}
        <div>
          <label className="block font-medium mb-1">Images</label>
          <div className="flex items-center gap-4">
            <label className="ek-secondary-button cursor-pointer px-4 py-2">
              Add Images
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  handleAddImages(files);
                }}
              />
            </label>

            <div className="flex gap-2 overflow-x-auto">
              {images?.map((img: any, idx: number) => (
                <div key={idx} className="relative group">
                  <img src={img.preview} alt={`preview-${idx}`} className="w-20 h-20 object-cover rounded border" />
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(img.preview);
                      setImages((prev) => prev.filter((_: any, i: number) => i !== idx));
                      allBlobUrls.current = allBlobUrls.current.filter((url) => url !== img.preview);
                    }}
                    className="absolute top-0 right-0 bg-black/60 text-white text-xs px-1 rounded opacity-0 group-hover:opacity-100 transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-1 text-sm text-[var(--ek-text-muted)] dark:text-[var(--ek-dark-soft)]">Max 5 images, each not more than 10MB.</p>
        </div>

        {user === "admin" && (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="verified"
              id="verified"
              checked={formData.verified}
              onChange={() => setFormData((prev: any) => ({ ...prev, verified: !prev.verified }))}
              className="h-4 w-4 accent-primary-600 cursor-pointer"
            />
            <label htmlFor="verified" className="font-medium text-secondary-900 dark:text-secondary-50">
              Verified
            </label>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="submit"
            disabled={isLoading || compressing}
            className={`ek-primary-button px-6 py-3 ${(isLoading || compressing) ? "cursor-not-allowed opacity-70" : ""
              }`}
          >
            {(isLoading || compressing) ? <Loader2 className="animate-spin" /> : isEditing ? "Update Property" : "Add Property"}
          </button>
        </div>
      </form>

      {/* {showCategoryModal && <CategoryModal onClose={() => setShowCategoryModal(false)}/>} */}
      {showLocationModal && (
        <LocationModal
          type={showLocationModal.type}
          parentId={showLocationModal.parentId}
          onClose={() => setShowLocationModal(null)}
          user={user}
        />
      )}
    </div>
  );
};

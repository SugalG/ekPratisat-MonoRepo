"use client";

import { useState, useEffect, useMemo } from "react";
import { useFeatureProperty, useFetchPropertyDetail, useToggleActive, usetoggleActiveListing, useVerifyProperty } from "@repo/query-hook";
import PageLoading from "@repo/ui/pageloading";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import PropertyMap from "./propertyMap";
import {
  ShieldCheck,
  Star,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  X,
  ChevronLeft,
  ChevronRight,
  LandPlot
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import DeletePropertyButton from "./deletePropertyButton";
import AddPropertyNoteButton from "./addPropertyNoteButton";
import NotesCard from "./notesCard";
import DynamicIcon from "./DynamicIcon";
import UpdateCoverImage from "./updateCoverImage";


export default function AdminPropertyDetailComponent() {
  const param = useParams();
  const queryClient = useQueryClient();
  const {
    data: property,
    isLoading,
    isError,
    error,
    refetch // Important for updating UI after actions
  } = useFetchPropertyDetail(param.id as string);
  const { mutate: verifyMutate, isPending: verifyPending } = useVerifyProperty();
  const { mutate: featureMutate, isPending: featurePending } = useFeatureProperty();
  const { mutate: activeMutate, isPending: activePending } = usetoggleActiveListing();

  const router = useRouter();

  const [activeImage, setActiveImage] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const images = property?.images ?? [];

  // Inside your parent component or right before passing props:
  const sortedImages = useMemo(() => {
    if (!images || images.length === 0) return [];

    // If no cover image is set, keep the default order
    if (!property?.coverImage) return images;

    // Clone the array and sort: move the item matching coverImageId to the front
    return [...images].sort((a, b) => {
      if (a.id === property.coverImage.id) return -1;
      if (b.id === property.coverImage.id) return 1;
      return 0;
    });
  }, [images, property?.coverImage]);

  const openLightbox = (startIndex?: number) => {
    if (typeof startIndex === "number") setActiveImage(startIndex);
    setIsLightboxOpen(true);
  };
  const closeLightbox = () => setIsLightboxOpen(false);
  const showNextImage = () => setActiveImage((c) => (c + 1) % sortedImages.length);
  const showPrevImage = () => setActiveImage((c) => (c - 1 + sortedImages.length) % sortedImages.length);

  useEffect(() => {
    if (!isLightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") showNextImage();
      else if (e.key === "ArrowLeft") showPrevImage();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLightboxOpen, sortedImages.length, images.length]);

  if (isLoading) return <PageLoading />;

  if (isError || !property) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-red-500">
        <AlertCircle size={48} className="mb-4" />
        <p className="text-lg font-bold">{error?.message || "Couldn't fetch property data"}</p>
      </div>
    );
  }


  const handleVerify = async () => {
    if (confirm("Once verified, this cannot be undone. Proceed?")) {
      verifyMutate({ propertyId: property.id }, {
        onSuccess: (data) => {
          toast.success(data.message || "Operation Successful!!!");
          queryClient.invalidateQueries({
            queryKey: ["all-properties"]
          });
          queryClient.invalidateQueries({
            queryKey: ["property-detail", property.id]
          })
        }
      })
      refetch();
    }
  };

  const handleToggleFeature = async () => {
    if (confirm(`Do you want to ${property.isFeatured ? "remove feature for" : "feature"} this listing?`)) {
      featureMutate({ propertyId: property.id, isFeatured: property.isFeatured }, {
        onSuccess: (data) => {
          toast.success(data.message || "Operation Successful!!!");
          queryClient.invalidateQueries({
            queryKey: ["all-properties"]
          });
          queryClient.invalidateQueries({
            queryKey: ["property-detail", property.id]
          })
        }
      })
    }
    refetch();
  };

  const handleActiveToggle = async () => {
    if (confirm(`Do you want to ${property.isActive ? "deactivate" : "activate"} this listing?`)) {
      activeMutate({ id: property.id }, {
        onSuccess: (data) => {
          toast.success(data.message || "Operation Successful!!!");
          queryClient.invalidateQueries({
            queryKey: ["all-properties"]
          });
          queryClient.invalidateQueries({
            queryKey: ["property-detail", property.id]
          })
        }
      })
    }
    refetch();
  }

  const getStatusStyle = (isVerified: boolean) => {

    if (isVerified) return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900";
    if (!isVerified) return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900";
    return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900";
  };

  const isPending = verifyPending || activePending || featurePending;

  console.log("Property Data:", property);
  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden bg-white dark:bg-secondary-900">

      {/* ---------------- LIGHTBOX ---------------- */}
      {isLightboxOpen && sortedImages.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Property photos"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-secondary-900/90 text-white transition hover:bg-secondary-900"
          >
            <X size={22} />
          </button>

          {sortedImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); showPrevImage(); }}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-secondary-900/90 text-white transition hover:bg-secondary-900 sm:left-6"
              >
                <ChevronLeft size={26} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); showNextImage(); }}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-secondary-900/90 text-white transition hover:bg-secondary-900 sm:right-6"
              >
                <ChevronRight size={26} />
              </button>
            </>
          )}

          <div className="relative flex h-full w-full items-center justify-center px-12 py-16 sm:px-20" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-full w-full">
              <Image
                src={`${process.env.NEXT_PUBLIC_BASE_URL}${sortedImages[activeImage]?.url}`}
                alt={`${property.title} photo ${activeImage + 1} of ${sortedImages.length}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/25 bg-secondary-900/90 px-4 py-1.5 text-sm font-semibold text-white">
            {activeImage + 1} / {sortedImages.length}
          </div>
        </div>
      )}

      {/* ---------------- ADMIN MANAGEMENT BAR ---------------- */}
      <div className="max-w-[1400px] bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-800 p-4 rounded-2xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded-xl">
            <LandPlot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold tracking-tight">{property.title || "Anonymous Prospect"}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wide ${getStatusStyle(property.verified)}`}>
                {property.verified ? "Verified" : "Not Verified"}
              </span>
            </div>
            <p className="text-xs text-secondary-500 mt-0.5 font-mono">P-CODE: EP-{property.propertyCode}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3 lg:border-t-0 lg:pt-0">
          <AddPropertyNoteButton propertyId={property.id} leadNotes={property.leadNotes} />
          {
            !property.verified && (
              <button type="button" onClick={handleVerify} disabled={isPending} className="inline-flex items-center gap-1.5 px-3 py-2 border border-secondary-200 dark:border-secondary-800 hover:bg-secondary-50 dark:hover:bg-secondary-800 rounded-xl text-xs font-semibold text-secondary-700 dark:text-secondary-300 transition-colors">
                <ShieldCheck className="w-3.5 h-3.5 text-secondary-400" />
                <span>Verify Property</span>
              </button>
            )
          }
          <button
            onClick={handleToggleFeature}
            disabled={isPending}
            className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold  ${property.isFeatured
              ? "border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              : "border-secondary-200 dark:border-secondary-800 hover:bg-secondary-50 dark:hover:bg-secondary-800 text-secondary-700 dark:text-secondary-300 transition-colors"
              }`}
          >
            <Star size={18} fill={property.isFeatured ? "currentColor" : "none"} />
            {property.isFeatured ? "Remove from Featured" : "Make Featured"}
          </button>
          <button onClick={() => router.push(`/admin/properties/edit/${property.id}`)} className="inline-flex items-center gap-1.5 px-3 py-2 border border-secondary-200 dark:border-secondary-800 hover:bg-secondary-50 dark:hover:bg-secondary-800 rounded-xl text-xs font-semibold text-secondary-700 dark:text-secondary-300 transition-colors">
            <Edit3 className="w-3.5 h-3.5 text-secondary-400" />
            <span>Edit Property</span>
          </button>

          <button
            onClick={handleActiveToggle}
            className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold transition-all duration-200 ${!property.isActive
              ? "border-amber-500 text-amber-700 bg-amber-50/50 dark:text-amber-400 dark:bg-amber-950/20 animate-pulse shadow-sm shadow-amber-500/10" // 🔥 Staff attention focus state when inactive
              : "border-secondary-200 dark:border-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800" // Default neutral state when active
              }`}
          >
            {/* Optional: Add a small visual dot indicator to enhance the layout anchor */}
            {!property.isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping absolute inline-flex" />
            )}
            <span className={!property.isActive ? "pl-3" : ""}>
              {property.isActive ? "Mark Property as Inactive" : "Mark Property as Active"}
            </span>
          </button>
          <UpdateCoverImage propertyId={property.id} images={images} coverImageId={property?.coverImage?.id} text="Update Cover Image" />
          <DeletePropertyButton id={property.id} isActive={property.isActive} />

        </div>

      </div>

      {/* ---------------- Rest of the UI (Same as your provided layout) ---------------- */}
      <div
        className={`relative w-full aspect-[16/10] max-h-[70vh] bg-secondary-100 dark:bg-secondary-800 ${sortedImages.length > 0 ? "cursor-zoom-in" : ""}`}
        onClick={() => sortedImages > 0 && openLightbox(activeImage)}
      >
        {sortedImages.length > 0 ? (
          <Image
            src={`${process.env.NEXT_PUBLIC_BASE_URL}${sortedImages[activeImage]?.url ?? sortedImages[0]!.url}`}
            alt={property.title}
            fill
            priority
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-secondary-500">No Image Available</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
        {sortedImages.length > 1 && (
          <span className="absolute top-4 right-4 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            {activeImage + 1} / {sortedImages.length}
          </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-white pointer-events-none">
          <h1 className="text-2xl md:text-5xl font-black tracking-tight">{property.title}</h1>
          <p className="mt-2 text-sm md:text-lg font-medium opacity-90">
            {property.location.municipality.district.name}, {property.location.municipality.name}, {property.tole}
          </p>
        </div>
      </div>

      {/* Thumbnail strip */}
      {sortedImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto bg-secondary-50 dark:bg-secondary-900/50 px-4 py-3 border-b border-secondary-100 dark:border-secondary-800">
          {sortedImages.map((img: { url: string, id: string }, idx: number) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActiveImage(idx)}
              aria-label={`Show image ${idx + 1} of ${sortedImages.length}`}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${idx === activeImage
                ? "border-primary-500 ring-2 ring-primary-500/30"
                : "border-transparent opacity-70 hover:opacity-100"
                }`}
            >
              <Image
                src={`${process.env.NEXT_PUBLIC_BASE_URL}${img.url}`}
                alt={`${property.title} thumbnail ${idx + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full px-4 md:px-6 py-12 space-y-12">
        <div className="bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">

          {/* Left Core Segment: Pricing, Category Meta, & Status Badges */}
          <div className="space-y-4">
            {/* System Metadata Tracking Status Flags */}
            <div className="flex flex-wrap items-center gap-2">
              <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 border ${property.verified
                ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/50"
                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50"
                }`}>
                {property.verified ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                <span>{property.verified ? "Verified Property" : "Pending Verification"}</span>
              </div>

              {property.isFeatured && (
                <div className="bg-primary-50 text-primary-700 border border-primary-200 dark:bg-primary-950/30 dark:text-primary-400 dark:border-primary-900/50 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase flex items-center gap-1.5 shadow-sm">
                  <Star size={13} fill="currentColor" className="text-primary-500" />
                  <span>Featured Asset</span>
                </div>
              )}
            </div>

            {/* Price & Class Descriptors */}
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-primary-600 dark:text-primary-400">
                Rs. {property.price.toLocaleString()}
              </h1>
              <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1 font-semibold flex items-center gap-1.5">
                <span className="capitalize">{property.category?.name}</span>
                <span className="text-secondary-300 dark:text-secondary-700">•</span>
                <span className="uppercase tracking-wide text-xs bg-secondary-100 dark:bg-secondary-800 px-2 py-0.5 rounded-md font-bold text-secondary-700 dark:text-secondary-300">
                  {property.type}
                </span>
                <span className="uppercase tracking-wide text-xs bg-secondary-100 dark:bg-secondary-800 px-2 py-0.5 rounded-md font-bold text-secondary-700 dark:text-secondary-300">{property.negotiable ? "Negotiable" : "Not Negotiable"}</span>
              </p>
            </div>
          </div>

          {/* Right Core Segment: Owner/Agent Identity Node */}
          <div className="flex items-center gap-3.5 p-4 bg-secondary-50/60 dark:bg-secondary-800/30 border border-secondary-100 dark:border-secondary-800/60 rounded-2xl md:min-w-[240px] shadow-inner transition-colors duration-200">
            <div className="w-11 h-11 rounded-full bg-primary-600 dark:bg-primary-500 text-white flex items-center justify-center text-base font-black shadow-sm shrink-0 uppercase">
              {property.user?.name?.charAt(0) || "?"}
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] text-secondary-400 font-bold uppercase tracking-wider">Posted Agent</span>
              <p className="font-bold text-secondary-900 dark:text-secondary-100 truncate text-sm mt-0.5">
                {property.user?.name || "Anonymous User"}
              </p>
            </div>
          </div>

        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <SpecItem label="Bedrooms" value={property.noOfBedRooms} />
          <SpecItem label="Bathrooms" value={property.noOfRestRooms} />
          <SpecItem label="Land Area" value={property.landArea} />
          <SpecItem label="Floors" value={property.noOfFloors} />
          <SpecItem label="Road Size" value={property.roadSize} />
          <SpecItem label="Facing" value={property.facingDirection} />
          {/* ... Add other specs as needed */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-3xl border border-secondary-200 dark:border-secondary-800 p-8 bg-white dark:bg-secondary-900">
              <h2 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100 mb-4">Description</h2>
              <p className="text-secondary-600 dark:text-secondary-400 leading-relaxed whitespace-pre-line text-lg">
                {property.description}
              </p>
            </div>
            <NotesCard notes={property.features} header="Property Features" subheader="Specific feature of the property" />
            {/* Map Section */}
            {typeof (property as any).lat === "number" && typeof (property as any).lng === "number" ? (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100 flex items-center gap-2">
                  Location Mapping
                </h2>
                <div className="rounded-[2.5rem] overflow-hidden border-4 border-white dark:border-secondary-800 shadow-2xl">
                  <PropertyMap lat={(property as any).lat} lng={(property as any).lng} />
                </div>
              </div>
            ) : null}
          </div>

          {/* Admin Summary Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-secondary-50 dark:bg-secondary-800/40 rounded-[2rem] p-8 border border-secondary-100 dark:border-secondary-800">
              <h3 className="font-bold text-secondary-900 dark:text-white mb-4">Listing Details</h3>
              <div className="space-y-4">
                <DetailLine label="Listing ID" value={property.id} />
                <DetailLine label="Created At" value={new Date(property.createdAt).toLocaleDateString()} />
                <DetailLine label="Status" value={property.verified ? "Verified" : "Pending Approval"} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <NotesCard notes={property.leadNotes} header="Acquisition and Owner Lead Info" subheader="Offline parameters caputred by field agent" />
      {
        property.amenities.length > 0 && (
          <div className="mt-8 p-6 border border-secondary-100 dark:border-secondary-800 rounded-2xl bg-white dark:bg-secondary-900/40 max-w-7xl mx-auto">
            <h3 className="text-base font-bold text-secondary-900 dark:text-secondary-100 mb-4">
              What this place offers
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {property.amenities.map((amenity: { id: string, name: string, icon: string, createdAt: string }) => (
                <div key={amenity.id} className="flex items-center gap-3">

                  {/* 🌟 Dynamically renders the Lucide icon based on the DB string string */}
                  <DynamicIcon
                    name={amenity.icon}
                    className="w-5 h-5 text-primary-600 dark:text-primary-400"
                  />

                  <span className="text-sm font-medium">
                    {amenity.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

        )
      }
    </div>
  );
}

// Small helper for the sidebar
function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-2 text-sm">
      <span className="text-secondary-500 font-medium shrink-0">{label}</span>
      <span className="text-secondary-900 dark:text-secondary-200 font-mono text-xs break-all text-right">{value}</span>
    </div>
  );
}

function SpecItem({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col rounded-2xl border border-secondary-100 dark:border-secondary-800 p-5 bg-white dark:bg-secondary-900 shadow-sm">
      <span className="text-[10px] uppercase tracking-widest font-bold text-secondary-400">
        {label}
      </span>
      <span className="text-lg font-bold text-secondary-900 dark:text-secondary-100 mt-1">
        {value}
      </span>
    </div>
  );
}
// app/property/[id]/property-detail-client.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  ShareIcon,
  MapPinIcon,
  CheckBadgeIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import FavouriteButton from "./FavouriteButton";
import { toast } from "sonner";


export type PropertyData = {
  id: string;
  propertyCode: number;
  title: string;
  description: string;
  price: string;
  negotiable: boolean,
  amenities: { id: string; name: string; icon: string }[];
  features:unknown;
  type: string;
  category: { name: string } | null
  isFeatured: boolean;
  noOfBedRooms: number | null;
  noOfRestRooms: number | null;
  landArea: string | null;
  noOfFloors: number | null;
  propertyAge: number | null;
  facingDirection: string | null;
  floorArea: string | null;
  roadSize: string | null;
  floorLevel: number | null;
  tole: string | null;
  createdAt: Date;
  images: { url: string }[];
  location: {
    name: string;
    municipality: {
      name: string;
      district: { name: string };
    };
  } | null;
};

export interface PropertyDetailClientProps {
  property: PropertyData;
}

// Number of thumbnail tiles rendered next to the main image. The form
// caps uploads at 5, so 4 thumb tiles + a "+N more" overlay on the last
// one covers every possible state without overflow. Lightbox shows all
// images regardless.
const THUMB_TILE_COUNT = 4;

export function PropertyDetailClient({ property }: PropertyDetailClientProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Format price with commas
  const formattedPrice = new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(Number(property.price));

  // Format date
  const formattedDate = new Date(property.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleShare = async () => {
  const shareData = {
    title: property.title,
    text: `Check out this property on Ek Pratisat: ${property.title}`,
    url: window.location.href, // Current page URL
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (err) {
      console.log("Share failed or cancelled", err);
    }
  } else {
    // Fallback: Copy to clipboard
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  }
};

  // Location string
  const locationString = property.location
    ? `${property.location.municipality.name}-${property.location.name}, ${property.location.municipality.district.name}`
    : "Location not specified";

  const toleString = property.tole ? `, ${property.tole}` : "";

  const images = property.images.length > 0 ? property.images : [{ url: "/placeholder-property.jpg" }];

  const openLightbox = useCallback((startIndex?: number) => {
    if (typeof startIndex === "number") setSelectedImage(startIndex);
    setIsLightboxOpen(true);
  }, []);
  const closeLightbox = useCallback(() => setIsLightboxOpen(false), []);
  const showNextImage = useCallback(() => {
    setSelectedImage((current) => (current + 1) % images.length);
  }, [images.length]);
  const showPrevImage = useCallback(() => {
    setSelectedImage((current) => (current - 1 + images.length) % images.length);
  }, [images.length]);

  // Lightbox keyboard nav + scroll lock — only when open.
  useEffect(() => {
    if (!isLightboxOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeLightbox();
      else if (event.key === "ArrowRight") showNextImage();
      else if (event.key === "ArrowLeft") showPrevImage();
    };

    const scrollY = window.scrollY;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      window.removeEventListener("keydown", onKeyDown);
      const previousScrollBehavior =
        document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    };
  }, [isLightboxOpen, closeLightbox, showNextImage, showPrevImage]);

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-[#10151f] transition-colors duration-200 dark:bg-[#171512] dark:text-[#f7f1e3]">
    <div className="ek-nav-safe-page mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
        {/* Header with actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              {property.isFeatured && (
                <span className="inline-flex items-center rounded-full border border-[var(--ek-border-soft)] bg-[rgba(214,169,54,0.12)] px-3 py-1 text-xs font-semibold text-[var(--ek-gold-text)] dark:border-[var(--ek-dark-border)] dark:bg-[rgba(229,184,62,0.12)] dark:text-[var(--ek-dark-gold)]">
                  <CheckBadgeIcon className="w-3.5 h-3.5 mr-1" />
                  Featured
                </span>
              )}
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 uppercase">
                {property.type || "Property"}
              </span>
              <span className="text-secondary-500 dark:text-[var(--ek-dark-soft)] text-sm">
                Listed on {formattedDate}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--ek-text-primary)] dark:text-[var(--ek-dark-text)] mt-3">
              {property.title}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-secondary-600 dark:text-secondary-300">
              <MapPinIcon className="w-5 h-5 text-gold" />
              <span>
                {locationString}
                {toleString}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            {/* <button
              onClick={() => setIsSaved(!isSaved)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-secondary-200 dark:border-secondary-700 hover:border-gold dark:hover:border-gold transition-all duration-200 bg-white dark:bg-secondary-800"
            >
              {isSaved ? (
                <HeartSolidIcon className="w-5 h-5 text-red-500" />
              ) : (
                <HeartIcon className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
              )}
              <span className="text-secondary-700 dark:text-secondary-300">
                {isSaved ? "Saved" : "Save"}
              </span>
            </button> */}
            <FavouriteButton property={property}/>
            <button className="flex items-center gap-2 rounded-xl border border-[var(--ek-border-soft)] bg-[var(--ek-bg-card)] px-4 py-2 transition-colors duration-200 hover:border-[var(--ek-border-strong)] dark:border-[var(--ek-dark-border)] dark:bg-[var(--ek-dark-surface)] dark:hover:border-[var(--ek-dark-border-strong)]" onClick={handleShare}>
              <ShareIcon className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
              <span className="text-secondary-700 dark:text-secondary-300">Share</span>
            </button>
          </div>
        </div>

        {/*
          Image Gallery — realtor-style layout.
          lg+: main image (col-span-2) on the left, 2×2 thumb grid on the right.
          <lg: main image stacks on top, thumbs in a row of 4 below.
          The last thumb slot doubles as an overflow trigger when more
          images exist than thumb slots: it shows the next image with a
          "+N more" overlay and opens the lightbox on click. Clicking
          the main image OR any thumb beyond the first opens the
          lightbox at that index. Lightbox handles full navigation
          (keyboard arrows, ESC, on-screen controls).
        */}
        <div className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => openLightbox(selectedImage)}
              aria-label="Open photo gallery"
              className="group relative aspect-[16/10] lg:col-span-2 overflow-hidden rounded-2xl bg-secondary-100 dark:bg-secondary-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-secondary-900"
            >
              <Image
                src={`${process.env.NEXT_PUBLIC_BASE_URL}${images[selectedImage]?.url}` || "/placeholder-property.jpg"}
                alt={property.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                sizes="(max-width: 1024px) 100vw, 66vw"
                priority
              />
              <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
                {images.length === 1 ? "View photo" : `View all ${images.length} photos`}
              </span>
            </button>

            <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:grid-cols-2">
              {Array.from({ length: THUMB_TILE_COUNT }).map((_, slot) => {
                const image = images[slot];
                if (!image) return null;

                const isOverflowTile =
                  slot === THUMB_TILE_COUNT - 1 && images.length > THUMB_TILE_COUNT;
                const overflowCount = images.length - THUMB_TILE_COUNT;
                const isCurrent = selectedImage === slot && !isOverflowTile;

                const onClick = isOverflowTile
                  ? () => openLightbox(THUMB_TILE_COUNT - 1)
                  : () => setSelectedImage(slot);

                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={onClick}
                    aria-label={
                      isOverflowTile
                        ? `View ${overflowCount} more photo${overflowCount === 1 ? "" : "s"}`
                        : `Show image ${slot + 1} of ${images.length}`
                    }
                    className={`relative aspect-square overflow-hidden rounded-xl bg-secondary-100 dark:bg-secondary-800 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 ${
                      isCurrent
                        ? "ring-2 ring-gold ring-offset-2 dark:ring-offset-secondary-900"
                        : "opacity-85 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={`${process.env.NEXT_PUBLIC_BASE_URL}${image.url}`}
                      alt={`${property.title} — photo ${slot + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 24vw, (max-width: 1024px) 22vw, 16vw"
                    />
                    {isOverflowTile && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-base font-bold text-white backdrop-blur-[1px]">
                        +{overflowCount} more
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Price and CTA */}
        <div className="mb-8 rounded-2xl border border-[var(--ek-border-soft)] bg-[linear-gradient(135deg,rgba(214,169,54,0.11),rgba(255,253,248,0.82))] p-6 dark:border-[var(--ek-dark-border)] dark:bg-[linear-gradient(135deg,rgba(229,184,62,0.1),rgba(33,28,20,0.88))]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-sm text-secondary-500 dark:text-secondary-400 uppercase tracking-wide">
                Price
              </span>
              <p className="text-4xl font-bold text-[var(--ek-gold-text)] dark:text-[var(--ek-dark-gold)]">{formattedPrice}</p>
            </div>
            {property.negotiable && <span className="mt-1 inline-block text-xs font-semibold text-[var(--ek-gold-text)] dark:text-[var(--ek-dark-gold)]">Negotiable</span>}

            <div className="flex gap-3">
              <button className="rounded-xl bg-gold-gradient px-8 py-3 font-semibold text-[#151006] shadow-sm shadow-gold-800/15 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-gold-gradient-hover active:translate-y-0">
                Contact Agent
              </button>
              <button className="rounded-xl border border-[var(--ek-border-strong)] px-8 py-3 font-semibold text-[var(--ek-gold-text)] transition-colors duration-200 hover:bg-[rgba(214,169,54,0.1)] dark:border-[var(--ek-dark-border-strong)] dark:text-[var(--ek-dark-gold)] dark:hover:bg-[rgba(229,184,62,0.1)]">
                Schedule Visit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/*
        Lightbox modal — rendered as a sibling of <main> so it escapes
        any parent stacking context. Click backdrop or X to close,
        prev/next arrow buttons to navigate, keyboard arrow keys + ESC
        also work (wired up by the useEffect above). Body scroll is
        locked while the lightbox is open.
      */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Property photo gallery"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="Close gallery"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-[#111827]/90 text-white shadow-lg shadow-black/35 backdrop-blur-md transition hover:bg-[#111827] focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6 sm:top-6"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showPrevImage();
                }}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-[#111827]/90 text-white shadow-lg shadow-black/35 backdrop-blur-md transition hover:bg-[#111827] focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-6"
              >
                <ChevronLeftIcon className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showNextImage();
                }}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-[#111827]/90 text-white shadow-lg shadow-black/35 backdrop-blur-md transition hover:bg-[#111827] focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6"
              >
                <ChevronRightIcon className="h-7 w-7" />
              </button>
            </>
          )}

          <div
            className="relative flex h-full w-full items-center justify-center px-12 py-16 sm:px-20"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative h-full w-full">
              <Image
                src={`${process.env.NEXT_PUBLIC_BASE_URL}${images[selectedImage]?.url}`}
                alt={`${property.title} — photo ${selectedImage + 1} of ${images.length}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/25 bg-[#111827]/90 px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-black/35 backdrop-blur-md">
            {selectedImage + 1} / {images.length}
          </div>
        </div>
      )}
    </main>

  );
}

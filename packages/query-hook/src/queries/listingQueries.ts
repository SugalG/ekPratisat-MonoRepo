import {
  fetchCategoryAction,
  fetchListingAction,
  fetchLocationTreeAction,
  fetchPropertyDetailAction,
} from "@repo/actions";
import { authenticatedFetch } from "@repo/shared-provider";

import { useQuery } from "@tanstack/react-query";

interface PropertyQueryType {
  page?: number;
  pageSize?: number;
  isVerified?: string;
  isFeatured?: string;
  type?: string;
  c_id?: string;
  isActive?: string;
  q?: string;
}

export const useGetCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategoryAction,
    staleTime: 60 * 60 * 1000,
    refetchOnMount: (data) => !data,
    retry: 1,
    retryDelay: 2000,
    refetchOnWindowFocus: true,
  });
};

export const useGetLocationTree = () => {
  return useQuery({
    queryKey: ["location"],
    queryFn: fetchLocationTreeAction,
    retry: 1,
    retryDelay: 2000,
    staleTime: 60 * 60 * 1000,
    refetchOnMount: (data) => !data,
    refetchOnWindowFocus: true,
});
};

export const useFetchPropertyDetail = (id: string) => {
  return useQuery({
    queryKey: ["property-detail", id],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/listing/${id}`,
        { method: "GET" },
      );
      const data = await res.json();

      if(!res.ok){
        throw new Error(data?.message || "Failed to fetch listing")
      }

      return data?.response?.result;
    },
    retry: 1,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useGetAmenities = () => {
  return useQuery({
    queryKey: ["amenities"],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/listing/amenities`,
        { method: "GET" },
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch info");
      }

      return data;
    },
  });
};

export const useGetAllProperties = ({
  page = 1,
  pageSize = 20,
  c_id = "",
  isActive = "",
  isFeatured = "",
  type = "",
  isVerified = "",
  q = "",
}: PropertyQueryType) => {
  return useQuery({
    queryKey: [
      "all-properties",
      { page, c_id, isActive, isFeatured, type, isVerified, q },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(q && { q }),
        ...(type && { type }),
        ...(c_id && { c_id }),
        ...(isActive !== "" && { isActive: String(isActive) }),
        ...(isVerified !== "" && { isVerified: String(isVerified) }),
        ...(isFeatured !== "" && { isFeatured: String(isFeatured) }),
      });

      return authenticatedFetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/listing/get-all?${params.toString()}`,
        { method: "GET" },
      );
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
};

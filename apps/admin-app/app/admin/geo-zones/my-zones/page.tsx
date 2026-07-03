"use client";

import { useGetMyZone } from "@repo/query-hook";
import { useMemo } from "react";
import mapboxgl from "mapbox-gl";
import RenderZoneList from "../../../../components/zone/RenderZoneList";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface Zone {
  id: string;
  name: string;
  notes: string | null;
  isActive: boolean;
  geom: any;
  createdAt: string;
}

export default function MyZones() {
  const { data, isLoading, isError, error } = useGetMyZone();

  const zones: Zone[] = useMemo(() => {
    return data?.zones || [];
  }, [data?.zones]);

  if (isError) return <div className="p-8 text-center text-red-500 text-sm">Error: {error?.message || "Failed to load mapping data"}</div>;

  return (
    <RenderZoneList zones={zones} isLoading={isLoading} isMyZone={true}/>
  );
}
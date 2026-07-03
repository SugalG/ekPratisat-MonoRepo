"use client";

import { useZonesQuery } from "@repo/query-hook";
import ZonesTable from "../../../../components/ZonesTable";
import RenderZoneList from "../../../../components/zone/RenderZoneList";

export default function ListZonesPage() {
  const { data: zones =[], isLoading, isError, error } = useZonesQuery();
  if (isError) return <div className="p-8 text-center text-red-500 text-sm">Error: {error?.message || "Failed to load mapping data"}</div>;
  console.log(zones);
  return (
    <>
      <RenderZoneList zones={zones} isLoading={isLoading}/>
    </>
  );
}
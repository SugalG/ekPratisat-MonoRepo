"use client";

import { useGetAgentDetail } from "@repo/query-hook";
import AnimateLoader from "@repo/ui/animateLoader";
import { AgentDetailType } from "@repo/validators";
import { useParams } from "next/navigation";
import ManagementActions from "./ManagementActions";
import BasicInfoSection from "./BasicInfoSection";
import DocumentSection from "./DocumentSection";
import { DropdownSection } from "@repo/ui/dropdown-section"; // Your new component
import Link from "next/link";
import { ChevronRight, Layers, MapPin, Trash2 } from "lucide-react";
import RevokeZoneAssigned from "./userSpecific/RevokeZoneAssigned";

export default function AgentDetail() {
    const param = useParams();
    const { data, isLoading, isError, error } = useGetAgentDetail(param.id as string);

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center h-full">
                <AnimateLoader />
            </div>
        );
    }

    if (isError) {
        const message = error.message || "Couldn't fetch data";
        return (
            <div className="flex flex-1 items-center justify-center text-red-500 text-lg md:text-xl h-full">{message}</div>
        );
    }

    const agent = data?.result as AgentDetailType;
    const zones = data?.result?.assignedZones || [];


    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6 rounded-xl shadow-md">

            {/* Header - Profile Info (Always Visible) */}
            <BasicInfoSection agent={agent} />

            {/* Management Settings - Collapsible */}
            <DropdownSection
                title="Management Settings"
                defaultOpen={false}
            >
                <ManagementActions agent={agent} />
            </DropdownSection>

            {/* Documents - Collapsible */}
            <DropdownSection
                title="Documents"
                defaultOpen={false}
            >
                <DocumentSection agent={agent} />
            </DropdownSection>
           {zones.length > 0 && (
    <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-secondary-100 dark:border-secondary-800 pb-3">
            <div className="space-y-0.5">
                <h2 className="text-base font-bold text-secondary-900 dark:text-white flex items-center gap-2 tracking-tight">
                    <Layers className="w-4 h-4 text-blue-500" />
                    Assigned Sectors & Zones
                </h2>
                <p className="text-xs text-secondary-500">
                    This agent is actively authorized to manage {zones.length} geographic operational areas.
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {zones.map((zone) => {
                const zoneName = zone?.zone?.name || "Unnamed Zone";
                const zoneNotes = zone?.zone?.notes;

                return (
                    /* 🎯 Card container changed from <Link> to a clean static <div> */
                    <div
                        key={zone.zoneId}
                        className="flex flex-col justify-between p-4 bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                    >
                        {/* Top: Information Header Section */}
                        <div className="space-y-1 min-w-0">
                            <h3 className="font-semibold text-sm text-secondary-800 dark:text-secondary-200 tracking-tight line-clamp-1">
                                {zoneName}
                            </h3>
                            {zoneNotes ? (
                                <p className="text-xs text-secondary-500 line-clamp-2">
                                    {zoneNotes}
                                </p>
                            ) : (
                                <p className="text-xs text-secondary-400 italic">No additional metadata notes.</p>
                            )}
                        </div>

                        {/* Bottom: Action Control Row */}
                        <div className="mt-4 pt-3 border-t border-secondary-100 dark:border-secondary-800/60 flex items-center justify-between gap-2">
                            {/* 🔍 Primary Action: Dedicated View Details Route Link */}
                            <Link
                                href={`/admin/geo-zones/${zone.zoneId}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition group"
                            >
                                <MapPin className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                                View Details
                                <ChevronRight className="w-3 h-3 text-blue-400 transition-transform group-hover:translate-x-0.5" />
                            </Link>

                            {/* 🛑 Administrative Action: Dedicated Revoke Trigger */}
                            {/* <button
                                type="button"
                                className="inline-flex items-center justify-center p-1.5 text-secondary-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                title="Revoke Zone Authorization"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button> */}
                            <RevokeZoneAssigned agentId={agent.id} zoneId={zone.zoneId} zoneName={zoneName}/>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
)}

        </div>
    );
}
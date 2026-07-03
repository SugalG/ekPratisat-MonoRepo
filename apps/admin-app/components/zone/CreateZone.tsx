"use client";

import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { useEffect, useRef, useState } from "react";
import { useCreateZoneMutation, useZonesQuery } from "@repo/query-hook";
import * as turf from "@turf/turf";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { FeatureCollection, Geometry } from "geojson";
import AnimateLoader from "@repo/ui/animateLoader";
import { Map, AlertTriangle, Layers, Save, FileText, Info } from "lucide-react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
type PolygonFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
type CleanFeatureCollection = GeoJSON.FeatureCollection<
    GeoJSON.Polygon | GeoJSON.MultiPolygon
>;

export default function CreateZone() {
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const drawRef = useRef<MapboxDraw | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const queryClient = useQueryClient();
    const { mutate, isPending: saving } = useCreateZoneMutation();
    const { data: zones = [], isLoading } = useZonesQuery();

    const [name, setName] = useState("");
    const [notes, setNotes] = useState("");
    const [hasOverlap, setHasOverlap] = useState(false);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = new mapboxgl.Map({
            container: containerRef.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: [85.324, 27.7172], // default
            zoom: 11,
        });

        const draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: { polygon: true, trash: true },
            defaultMode: "draw_polygon",
        });

        map.addControl(draw);
        map.addControl(new mapboxgl.NavigationControl(), "top-right");

        mapRef.current = map;
        drawRef.current = draw;

        map.on("load", async () => {
            map.on("draw.create", handleOverlapCheck);
            map.on("draw.update", handleOverlapCheck);
            map.on("draw.delete", () => {
                setHasOverlap(false);
            });
        });

        return () => {
            map.remove();
            mapRef.current = null;
            drawRef.current = null;
        };
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const update = () => {
            const features = zones.map((z: any) => ({
                type: "Feature",
                geometry: z.geom,
                properties: {
                    id: z.id,
                    name: z.name,
                },
            }));

            const geojson: FeatureCollection<Geometry> = {
                type: "FeatureCollection",
                features,
            };

            const existingSource = map.getSource("zones") as mapboxgl.GeoJSONSource;

            if (existingSource) {
                existingSource.setData(geojson);
            } else {
                map.addSource("zones", {
                    type: "geojson",
                    data: geojson,
                });

                map.addLayer({
                    id: "zones-fill",
                    type: "fill",
                    source: "zones",
                    paint: {
                        "fill-color": "#3b82f6",
                        "fill-opacity": 0.2,
                    },
                });

                map.addLayer({
                    id: "zones-outline",
                    type: "line",
                    source: "zones",
                    paint: {
                        "line-color": "#1d4ed8",
                        "line-width": 2,
                    },
                });

                map.addLayer({
                    id: "zones-label",
                    type: "symbol",
                    source: "zones",
                    layout: {
                        "text-field": ["get", "name"], // ✅ Already gets the name from properties
                        "text-size": 18,               // Slightly increased for better readability
                        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"], // ✨ Added bold font stack
                        "text-justify": "center",
                        "text-anchor": "center",       // ✨ Centers the text perfectly inside the polygon
                    },
                    paint: {
                        "text-color": "#1e3a8a",       // Changing to a sharp dark blue to match the outline
                        "text-halo-color": "#ffffff",  // ✨ Added a white background glow (halo) so text 
                        "text-halo-width": 2,          //   is readable over any terrain or street background
                    },
                });


            }
        };

        if (!map.isStyleLoaded()) {
            map.once("load", update);
        } else {
            update();
        }
    }, [zones]);

    const handleOverlapCheck = () => {
        const draw = drawRef.current;
        const map = mapRef.current;

        if (!draw || !map) return;

        const drawn = draw.getAll();
        if (!drawn.features.length) {
            setHasOverlap(false);
            return;
        }
        const drawnFeature = drawn.features?.[0];

        if (!drawnFeature || !drawnFeature.geometry) return;

        if (
            drawnFeature.geometry.type !== "Polygon" &&
            drawnFeature.geometry.type !== "MultiPolygon"
        ) {
            return;
        }

        const drawnGeom = turf.feature(drawnFeature.geometry);

        const source = map.getSource("zones") as any;
        if (!source) return;

        const existing = source._data; // geojson

        let overlap = false;

        for (const zone of existing.features) {
            if (turf.booleanIntersects(drawnGeom, zone)) {
                overlap = true;
                break;
            }
        }

        setHasOverlap(overlap);
    };

    const getFirstRing = (
        geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
    ): number[][] | null => {
        if (geometry.type === "Polygon") {
            return geometry.coordinates?.[0] ?? null;
        }

        if (geometry.type === "MultiPolygon") {
            return geometry.coordinates?.[0]?.[0] ?? null;
        }

        return null;
    };

    const validateAndCleanFeatures = (
        rawFeatures: GeoJSON.Feature[]
    ): {
        ok: boolean;
        message?: string;
        cleaned?: CleanFeatureCollection;
    } => {
        const polygonFeatures = rawFeatures.filter((f): f is PolygonFeature => {
            return (
                !!f.geometry &&
                (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
            );
        });

        if (polygonFeatures.length === 0) {
            return { ok: false, message: "Draw at least one polygon" };
        }

        const cleanedFeatures: PolygonFeature[] = [];

        for (const feature of polygonFeatures) {
            const ring = getFirstRing(feature.geometry);

            if (!ring || ring.length < 4) {
                continue;
            }

            try {
                const turfFeature = turf.feature(feature.geometry);

                const area = turf.area(turfFeature);
                if (area <= 0) {
                    continue;
                }

                if (area < 100) {
                    return {
                        ok: false,
                        message: "Polygon is too small or invalid",
                    };
                }

                const bbox = turf.bbox(turfFeature);
                const width = Math.abs(bbox[2] - bbox[0]);
                const height = Math.abs(bbox[3] - bbox[1]);

                if (width === 0 || height === 0) {
                    return {
                        ok: false,
                        message: "Polygon is a straight line (invalid shape)",
                    };
                }
                if (bbox[0] === bbox[2] || bbox[1] === bbox[3]) {
                    return {
                        ok: false,
                        message: "Polygon shape is invalid",
                    };
                }

                const kinks = turf.kinks(turfFeature);
                if (kinks.features.length > 0) {
                    return { ok: false, message: "Polygon is self-intersecting" };
                }

                const isValid = turf.booleanValid(turfFeature);
                if (!isValid) {
                    return {
                        ok: false,
                        message: "Polygon is self-intersecting or invalid",
                    };
                }

                cleanedFeatures.push({
                    type: "Feature",
                    geometry: feature.geometry,
                    properties: {},
                });
            } catch {
                return { ok: false, message: "Invalid polygon geometry" };
            }
        }

        if (cleanedFeatures.length === 0) {
            return { ok: false, message: "Draw a valid polygon" };
        }

        return {
            ok: true,
            cleaned: {
                type: "FeatureCollection",
                features: cleanedFeatures,
            },
        };
    };

    const onSave = () => {
        const draw = drawRef.current;
        if (!draw) return;

        if (!name.trim()) {
            toast.error("Zone name is required");
            return;
        }

        const featureCollection = draw.getAll();

        if (!featureCollection?.features?.length) {
            toast.error("Draw at least one polygon");
            return;
        }

        const validated = validateAndCleanFeatures(
            featureCollection.features as GeoJSON.Feature[]
        );

        if (!validated.ok || !validated.cleaned) {
            toast.error(validated.message || "Invalid polygon");
            return;
        }

        mutate(
            {
                name: name.trim(),
                notes: notes.trim(),
                featureCollection: validated.cleaned,
            },
            {
                onSuccess: (data: any) => {
                    toast.success(data?.message || "Zone created successfully");
                    draw.deleteAll();
                    setName("");
                    setNotes("");
                    queryClient.invalidateQueries({ queryKey: ["zones"] });
                },
                onError: (error: any) => {
                    const message =
                        error?.response?.data?.error ||
                        error?.message ||
                        "Failed to create zone";
                    toast.error(message);
                },
            }
        );
    };

    return (
        <div className="relative flex flex-col md:flex-row h-screen w-full bg-slate-900 antialiased overflow-hidden">

            {/* 🧭 Control Panel Panel (Fixed desktop sidebar layout) */}
            <div className="w-full md:w-[380px] shrink-0 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col h-[320px] md:h-full shadow-xl z-20">

                {/* Panel Header */}
                <div className="p-4 md:p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Layers className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">Zone Constructor</h1>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">Plot and partition territorial spaces.</p>
                    </div>
                </div>

                {/* Input Workspaces */}
                <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 tracking-wider uppercase flex items-center gap-1.5">
                            <Map className="h-3.5 w-3.5 text-slate-400" />
                            Zone Designation
                        </label>
                        <input
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm"
                            placeholder="e.g., Central District Core"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 tracking-wider uppercase flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                            Operational Notes
                        </label>
                        <textarea
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm resize-none h-20 md:h-28"
                            placeholder="Specify special parameters or boundary notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    {/* Conflict Notification Alert */}
                    {hasOverlap && (
                        <div className="flex items-start gap-2.5 border border-red-100 bg-red-50/50 rounded-xl p-3 text-red-700 animate-in fade-in duration-200">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                            <div>
                                <p className="text-xs font-bold tracking-tight">Geospatial Violation</p>
                                <p className="text-[11px] text-red-600/90 font-medium mt-0.5">This perimeter overlaps with an existing zone layer.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Form Submission Triggers */}
                <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50/50">
                    <button
                        className={`w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-3 px-4 rounded-xl shadow-md disabled:shadow-none transition active:scale-[0.99] text-sm`}
                        onClick={onSave}
                        disabled={saving || hasOverlap}
                    >
                        <Save className="h-4 w-4" />
                        {saving ? "Saving Coordinates..." : "Commit Zone Frame"}
                    </button>
                </div>
            </div>

            {/* 🗺️ Screen-filling Canvas Canvas */}
            <div className="flex-1 relative h-full w-full bg-slate-800 z-10">

                {/* Absolute loader positioning over map element layout contexts */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm z-30 animate-in fade-in duration-200">
                        <div className="bg-white p-5 rounded-2xl shadow-2xl flex flex-col items-center gap-3">
                            <AnimateLoader />
                            <p className="text-xs font-bold text-slate-500 tracking-wide uppercase">Caching Geo-Slices...</p>
                        </div>
                    </div>
                )}

                {/* Mapbox core rendering frame anchor */}
                <div ref={containerRef} className="h-full w-full" />

                {/* Dynamic Mapping Guide Overlay HUD */}
                <div className="absolute bottom-5 right-5 bg-slate-900/90 backdrop-blur border border-slate-700/50 text-slate-200 px-3 py-2 rounded-xl text-[11px] font-medium tracking-wide flex items-center gap-2 pointer-events-none shadow-xl z-20 max-w-xs hidden sm:flex">
                    <Info className="h-4 w-4 text-blue-400 shrink-0" />
                    <span>Use the polygon drawing toolkit in the top right to safely map new boundaries.</span>
                </div>
            </div>
        </div>
    );
}
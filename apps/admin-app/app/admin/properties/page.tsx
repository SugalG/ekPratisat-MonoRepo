"use client";

import { useGetAllProperties, useGetCategories, useUser } from "@repo/query-hook";
import AnimateLoader from "@repo/ui/animateLoader";
import { ChevronDown, Eye, Filter, Plus, Search, ShieldCheck, Star, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import ListingTable from "../../../components/ListingTable";
import Pagination from "../../../components/Pagination";

export default function PropertiesListPage() {
    const sp = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const page = Number(sp.get("page") || 1);

    const [input, setInput] = useState(sp.get("q") ?? "");
    const [q, setQ] = useState(sp.get("q") || "");

    const [type, setType] = useState(sp.get("type") || "");
    const [c_id, setCatId] = useState(sp.get("c_id") || "");

    const [isVerified, setIsVerified] = useState(sp.get("isVerified") ?? "");
    const [isActive, setIsActive] = useState(sp.get("isActive") || "");
    const [isFeatured, setIsFeatured] = useState(sp.get("isFeatured") || "");

    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setQ(sp.get("q") ?? "");
        setInput(sp.get("q") ?? "");
        setIsVerified(sp.get("isVerified") ?? "");
        setType(sp.get("type") ?? "");
        setCatId(sp.get("c_id") || "");
        setIsActive(sp.get("isActive") || "");
        setIsFeatured(sp.get("isFeatured") || "");
    }, [sp]);

    const { data, isLoading, isError, error } = useGetAllProperties({ page, pageSize: 20, c_id, isActive, isFeatured, type, isVerified, q });
    const { data: categories, isLoading: categoriesLoading } = useGetCategories();
    const { data: user, isLoading: userLoading, isError: isUserError, error: userError } = useUser();

    if (isLoading || categoriesLoading || userLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <AnimateLoader />
            </div>
        );
    }

    if (isError || isUserError) {
        const errorMessage = error?.message || userError?.message || "Try Again Later";

        return (
            <div className="min-h-screen flex items-center justify-center text-red-500 font-medium">
                {errorMessage}
            </div>
        )
    }


    if (!data.items.length) {
        return (
            /* --- BEAUTIFUL EMPTY STATE (Server Side) --- */
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="relative mb-6">
                    <div className="h-24 w-24 rounded-full bg-secondary-100 dark:bg-secondary-800 flex items-center justify-center text-4xl">
                        🏙️
                    </div>
                    <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-gold-gradient flex items-center justify-center shadow-lg border-4 border-white dark:border-secondary-900">
                        <span className="text-white text-xs font-bold">?</span>
                    </div>
                </div>

                <h2 className="text-2xl md:text-3xl font-black text-secondary-900 dark:text-white uppercase tracking-tight">
                    No Matches <span className="text-gold">Found</span>
                </h2>

                <p className="mt-4 max-w-md text-secondary-500 dark:text-secondary-400 leading-relaxed">
                    We couldn't find any properties matching your current filters {q && <span>for <span className="text-gold font-bold">"{q}"</span></span>}.
                    Try broadening your criteria or resetting the filters.
                </p>

                <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                    {/* This link effectively "Refreshes" the search by clearing the URL */}
                    <Link
                        href="/admin/properties/add-property"
                        replace
                        className="px-10 py-4 bg-gold-gradient text-white rounded-full font-bold hover:bg-gold-gradient-hover transition-all shadow-xl active:scale-95"
                    >
                        Add Property +
                    </Link>
                    <Link
                        href="/admin/properties"
                        replace
                        className="px-10 py-4 bg-secondary-900 dark:bg-black text-white rounded-full font-bold hover:bg-gold-gradient transition-all shadow-xl active:scale-95"
                    >
                        Clear All Filters
                    </Link>

                    <Link
                        href="/admin/dashboard"
                        replace
                        className="px-10 py-4 border border-secondary-200 dark:border-secondary-700 text-secondary-900 dark:text-white rounded-full font-bold hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-all"
                    >
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    const applyFilters = (updates: Record<string, string>) => {
        const params = new URLSearchParams(sp.toString());

        // Apply the updates passed (q, c_id, or type)
        Object.entries(updates).forEach(([key, value]) => {
            // if (value) params.set(key, value);
            // else params.delete(key);
            if (value === "" || value === undefined) {
                params.delete(key);
            } else {
                params.set(key, String(value));
            }

        });

        params.set("page", "1"); // Reset to page 1 on search

        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    };

    const resetAll = () => {
        setQ("");
        setIsVerified("");
        setIsFeatured("");
        setIsActive("");
        setCatId("");
        setType("");
        setInput("");
        startTransition(() => router.push(pathname));
    };

    const listings = data.items;
    const { totalPages, page: currentPage } = data.meta;

    return (
        <main className="min-h-screen">
            <div className="h-60 bg-secondary-900 flex flex-col items-center justify-center relative overflow-hidden">
                {/* Texture Overlay */}
                <div className="absolute inset-0 opacity-80 dark:opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat" />

                {/* Decorative Glow */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-gold/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />

                {/* Content Container */}
                <div className="relative z-10 flex flex-col items-center gap-6">
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight text-center">
                        Properties List
                    </h1>
                    <div className="flex flex-col sm:flex-row gap-2">

                        <Link
                            href="/admin/properties/add-property"
                            className="group flex items-center gap-3 px-8 py-3.5 bg-white/10 hover:bg-gold backdrop-blur-md border border-white/20 hover:border-gold text-white rounded-full font-bold transition-all duration-300 shadow-2xl active:scale-95"
                        >
                            <div className="bg-gold group-hover:bg-white p-1 rounded-full transition-colors">
                                <Plus size={16} className="text-white group-hover:text-gold" strokeWidth={3} />
                            </div>
                            <span className="tracking-wide">Add New Listing</span>
                        </Link>
                        {
                            user.role === "admin" && (

                                <Link
                                    href="/admin/properties/categories"
                                    className="text-center gap-3 px-8 py-3.5 bg-white/10 hover:bg-gold backdrop-blur-md border border-white/20 hover:border-gold text-white rounded-full font-bold transition-all duration-300 shadow-2xl active:scale-95"
                                >
                                    <span className="tracking-wide">Categories</span>
                                </Link>
                            )
                        }
                    </div>

                </div>
            </div>
            <div className="w-full max-w-7xl mx-auto -mt-4 sm:-mt-10 mb-12 relative z-20 px-4">
                <div className="bg-white dark:bg-secondary-800 backdrop-blur-xl border border-secondary-200 dark:border-secondary-700 rounded-3xl shadow-2xl p-4 md:p-6">
                    <div className="flex flex-col gap-6">

                        {/* --- ROW 1: PRIMARY SEARCH --- */}
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <div className="flex-1 flex items-center px-4 w-full bg-secondary-50 dark:bg-secondary-900/50 border border-secondary-100 dark:border-secondary-700 rounded-2xl py-3 group focus-within:border-gold transition-all">
                                <Search className="text-gold mr-3" size={20} />
                                <div className="flex flex-col w-full">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-secondary-400 mb-0.5">Search Keywords</label>
                                    <input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                // setQ(input);
                                                applyFilters({ q: input });
                                            }
                                        }}
                                        placeholder="Title, description, or location..."
                                        className="bg-transparent border-none outline-none text-sm w-full placeholder:text-secondary-400 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <button
                                    onClick={() => applyFilters({ q: input })}
                                    disabled={isPending}
                                    className="flex-1 md:flex-none bg-secondary-900 dark:bg-black text-white px-10 py-4 rounded-2xl text-sm font-bold hover:bg-gold-gradient transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-gold/10"
                                >
                                    {isPending ? "Searching..." : "Search Properties"}
                                </button>

                                {(q || isVerified || type || isActive || isFeatured || c_id) && (
                                    <button
                                        onClick={resetAll}
                                        className="p-4 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                                        title="Reset All"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* --- ROW 2: FILTERS --- */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-secondary-100 dark:border-secondary-700">

                            {/* Category */}
                            <FilterGroup label="Category" icon={<Filter size={14} />}>
                                <select
                                    value={c_id}
                                    onChange={(e) => applyFilters({ c_id: e.target.value })}
                                    className="bg-secondary-50 dark:bg-secondary-900/50 border border-secondary-200 dark:border-secondary-700 rounded-lg px-3 py-2 text-sm w-full cursor-pointer dark:text-white appearance-none focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all pr-10"
                                >
                                    <option value="">All Categories</option>
                                    {categories?.result.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </FilterGroup>

                            {/* Type */}
                            <FilterGroup label="Listing Type" icon={<Filter size={14} />}>
                                <select
                                    value={type}
                                    onChange={(e) => applyFilters({ type: e.target.value })}
                                    className="bg-secondary-50 dark:bg-secondary-900/50 border border-secondary-200 dark:border-secondary-700 rounded-lg px-3 py-2 text-sm w-full cursor-pointer dark:text-white appearance-none focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all pr-10"
                                >
                                    <option value="">All Types</option>
                                    <option value="rent">For Rent</option>
                                    <option value="sale">For Sale</option>
                                </select>
                            </FilterGroup>

                            {/* Verified */}
                            <FilterGroup label="Verification" icon={<ShieldCheck size={14} />}>
                                <select
                                    value={isVerified}
                                    onChange={(e) => applyFilters({ isVerified: e.target.value })}
                                    className="bg-secondary-50 dark:bg-secondary-900/50 border border-secondary-200 dark:border-secondary-700 rounded-lg px-3 py-2 text-sm w-full cursor-pointer dark:text-white appearance-none focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all pr-10"
                                >
                                    <option value="">All Status</option>
                                    <option value="true">Verified</option>
                                    <option value="false">Not Verified</option>
                                </select>
                            </FilterGroup>

                            {/* Featured */}
                            <FilterGroup label="Highlight" icon={<Star size={14} />}>
                                <select
                                    value={isFeatured}
                                    onChange={(e) => applyFilters({ isFeatured: e.target.value })}
                                    className="bg-secondary-50 dark:bg-secondary-900/50 border border-secondary-200 dark:border-secondary-700 rounded-lg px-3 py-2 text-sm w-full cursor-pointer dark:text-white appearance-none focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all pr-10"
                                >
                                    <option value="">All Items</option>
                                    <option value="true">Featured Only</option>
                                    <option value="false">Standard</option>
                                </select>
                            </FilterGroup>

                            {/* Active */}
                            <FilterGroup label="Visibility" icon={<Eye size={14} />}>
                                <select
                                    value={isActive}
                                    onChange={(e) => applyFilters({ isActive: e.target.value })}
                                    className="bg-secondary-50 dark:bg-secondary-900/50 border border-secondary-200 dark:border-secondary-700 rounded-lg px-3 py-2 text-sm w-full cursor-pointer dark:text-white appearance-none focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all pr-10"
                                >
                                    <option value="">All Visibility</option>
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </FilterGroup>

                        </div>
                    </div>
                </div>
            </div>
            <ListingTable listings={listings} />
            <Pagination totalPages={totalPages} currentPage={currentPage} />
        </main>
    )


}

function FilterGroup({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-wider text-secondary-400 px-1">
                {icon} {label}
            </label>
            <div className="relative group">
                {children}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary-400 group-hover:text-gold transition-colors">
                    <ChevronDown size={14} />
                </div>
            </div>
        </div>
    );
}
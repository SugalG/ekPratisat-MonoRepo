"use client";

import { useGetLeads } from "@repo/query-hook";
import AnimateLoader from "@repo/ui/animateLoader";
import { ChevronDown, Filter, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import LeadTable from "../../../components/LeadTable";
import Pagination from "../../../components/Pagination";

export default function LeadsPage() {
  const sp = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const page = Number(sp.get("page") || "1");

  const [q, setQ] = useState(sp.get("q") || "");
  const [input, setInput] = useState(sp.get("q") ?? "");
  const [status, setStatus] = useState(sp.get("status") || "");
  const [dealType, setDealType] = useState(sp.get("dealType") || "");
  const [clientType, setClientType] = useState(sp.get("clientType") || "");

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setQ(sp.get("q") ?? "");
    setInput(sp.get("q") ?? "");
    setStatus(sp.get("status") || "");
    setDealType(sp.get("dealType") || "");
    setClientType(sp.get("clientType") || "");
  }, [sp]);

  const { data, isLoading, isError, error } = useGetLeads({page,limit:10,status,dealType,clientType,q});

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
    setInput("");
    setStatus("");
    startTransition(() => router.push(pathname));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <AnimateLoader />
      </div>
    );
  }

  if (isError) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error.message}</div>
  }
 
  const {totalPages,page:currentPage} = data.meta;

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
            Lead List
          </h1>

          <Link
            href="/admin/leads/create"
            className="group flex items-center gap-3 px-8 py-3.5 bg-white/10 hover:bg-gold backdrop-blur-md border border-white/20 hover:border-gold text-white rounded-full font-bold transition-all duration-300 shadow-2xl active:scale-95"
          >
            <div className="bg-gold group-hover:bg-white p-1 rounded-full transition-colors">
              <Plus size={16} className="text-white group-hover:text-gold" strokeWidth={3} />
            </div>
            <span className="tracking-wide">Add New Lead</span>
          </Link>
        </div>
      </div>
      <div className="w-full max-w-7xl mx-auto -mt-10 mb-12 relative z-20 px-4">
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
                    placeholder="Contact, email, name, or source..."
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
                  {isPending ? "Searching..." : "Search Leads"}
                </button>

                {(q || status) && (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-secondary-100 dark:border-secondary-700">

              {/* Category */}
              <FilterGroup label="Client Segment" icon={<Filter size={14} />}>
                <select
                  value={clientType}
                  onChange={(e) => applyFilters({ clientType: e.target.value })}
                  className="bg-secondary-50 dark:bg-secondary-900/50 border border-secondary-200 dark:border-secondary-700 rounded-lg px-3 py-2 text-sm w-full cursor-pointer dark:text-white appearance-none focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all pr-10"
                >
                  <option value="">All Client Segments</option>
                  <option value="BUYER">Buyer</option>
                  <option value="SELLER">Seller</option>
                </select>
              </FilterGroup>

              {/* Type */}
              <FilterGroup label="Deal Type" icon={<Filter size={14} />}>
                <select
                  value={dealType}
                  onChange={(e) => applyFilters({ dealType: e.target.value })}
                  className="bg-secondary-50 dark:bg-secondary-900/50 border border-secondary-200 dark:border-secondary-700 rounded-lg px-3 py-2 text-sm w-full cursor-pointer dark:text-white appearance-none focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all pr-10"
                >
                  <option value="">All Types</option>
                  <option value="buy">For Buy</option>
                  <option value="sell">For Sell</option>
                  <option value="rent">For Rent</option>
                </select>
              </FilterGroup>

              <FilterGroup label="Lead Status" icon={<Filter size={14} />}>
                <select
                  value={status}
                  onChange={(e) => applyFilters({ status: e.target.value })}
                  className="bg-secondary-50 dark:bg-secondary-900/50 border border-secondary-200 dark:border-secondary-700 rounded-lg px-3 py-2 text-sm w-full cursor-pointer dark:text-white appearance-none focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all pr-10"
                >
                  <option value="">All</option>
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="INTERESTED">Interested</option>
                  <option value="NOT_INTERESTED">Not Interested</option>
                  <option value="FOLLOW_UP">Follow Up</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_NEGOTIATION">In Negotiation</option>
                  <option value="WON">Won</option>
                  <option value="LOST">Lost</option>
                </select>
              </FilterGroup>

            </div>
          </div>
        </div>
      </div>
      <LeadTable leads={data.data}/>
      <Pagination totalPages={totalPages} currentPage={currentPage}/>
    </main>
  );
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
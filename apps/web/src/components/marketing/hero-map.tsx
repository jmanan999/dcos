"use client";

import dynamic from "next/dynamic";
import { usePublicStats } from "@/lib/hooks";
import type { MapWard } from "@/components/GisMap";

// MapLibre is client-only — lazy load to avoid SSR crash
const GisMap = dynamic(
  () => import("@/components/GisMap").then((m) => ({ default: m.GisMap })),
  { ssr: false, loading: () => <MapSkeleton /> }
);

function MapSkeleton() {
  return (
    <div className="w-full h-full bg-[#F0EEE8] flex items-center justify-center">
      {/* Subtle Delhi silhouette placeholder while map loads */}
      <svg viewBox="0 0 200 200" className="w-32 h-32 opacity-10" fill="#080808">
        <path d="M100 20 L160 60 L180 120 L150 170 L100 180 L50 170 L20 120 L40 60 Z" />
      </svg>
    </div>
  );
}

export function HeroMap() {
  const { data: stats } = usePublicStats();

  // Convert public-stats hotspots → GisMap's MapWard format
  const wards: MapWard[] = (stats?.hotspots ?? [])
    .filter((h) => h.lat != null && h.lng != null)
    .map((h) => ({
      ward_name: h.ward_name,
      lat: h.lat!,
      lng: h.lng!,
      open: h.open_count,
      total: h.total_count,
    }));

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <GisMap
        wards={wards}
        theme="light"
        height="h-full"
        className="absolute inset-0"
      />

      {/* IC Bold overlay — top badges */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-10 pointer-events-none">
        {/* Live badge */}
        <div className="flex items-center gap-2 bg-[#080808] px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-amber-pulse"
                style={{ animationName: "amber-pulse" }} />
          <span className="label-caps text-white text-[10px] tracking-[0.15em]">LIVE · 272 WARDS</span>
        </div>

        {/* Grievance count */}
        {wards.length > 0 && (
          <div className="bg-white border border-[#E5E7EB] px-3 py-1.5">
            <span className="label-caps text-[#080808] text-[10px]">
              {wards.reduce((s, w) => s + w.open, 0).toLocaleString("en-IN")} OPEN
            </span>
          </div>
        )}
      </div>

      {/* Bottom legend */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
        <div className="bg-white border border-[#E5E7EB] px-3 py-2 flex items-center gap-4">
          <span className="label-caps text-[#6B7280] text-[9px]">SEVERITY</span>
          {[
            { color: "#ef4444", label: "Critical" },
            { color: "#f59e0b", label: "High" },
            { color: "#22c55e", label: "Low" },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="label-caps text-[#6B7280] text-[9px]">{label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Right edge accent bar */}
      <div className="absolute top-0 right-0 bottom-0 w-[3px] bg-[#E8920A] z-10" />
    </div>
  );
}

"use client";

import { useEffect, useRef, useCallback } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapWard {
  ward_id?: string;
  ward_name: string;
  district_name?: string | null;
  lat: number;
  lng: number;
  open: number;
  total: number;
  sla_breaches?: number;
  severity?: "high" | "medium" | "low";
}

interface GisMapProps {
  wards: MapWard[];
  theme?: "dark" | "light";
  height?: string;
  className?: string;
}

const SEVERITY_COLORS = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

function getSeverity(ward: MapWard): "high" | "medium" | "low" {
  if (ward.severity) return ward.severity;
  const ratio = ward.total > 0 ? ward.open / ward.total : 0;
  if (ward.open >= 20 || ratio > 0.6) return "high";
  if (ward.open >= 10 || ratio > 0.3) return "medium";
  return "low";
}

export function GisMap({ wards, theme = "dark", height = "h-full", className = "" }: GisMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const popupRef = useRef<any>(null);

  const buildGeoJSON = useCallback(() => ({
    type: "FeatureCollection" as const,
    features: wards
      .filter((w) => w.lat && w.lng)
      .map((w) => {
        const sev = getSeverity(w);
        return {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [w.lng, w.lat] },
          properties: {
            ward_name: w.ward_name,
            district: w.district_name ?? "",
            open: w.open,
            total: w.total,
            sla: w.sla_breaches ?? 0,
            severity: sev,
            color: SEVERITY_COLORS[sev],
            radius: Math.max(6, Math.min(24, 6 + w.total * 0.8)),
          },
        };
      }),
  }), [wards]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !containerRef.current) return;

      const style =
        theme === "dark"
          ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

      const map = new maplibregl.Map({
        container: containerRef.current,
        style,
        bounds: [[76.8, 28.4], [77.4, 28.9]] as [[number, number], [number, number]],
        fitBoundsOptions: { padding: 40 },
        attributionControl: false,
      });

      mapRef.current = map;

      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: "240px",
      });
      popupRef.current = popup;

      map.on("load", () => {
        map.addSource("wards", { type: "geojson", data: buildGeoJSON() as never });

        // Glow for high-severity wards
        map.addLayer({
          id: "wards-halo",
          type: "circle",
          source: "wards",
          filter: ["==", ["get", "severity"], "high"],
          paint: {
            "circle-radius": ["+", ["get", "radius"], 8],
            "circle-color": "#ef4444",
            "circle-opacity": 0.15,
            "circle-blur": 1,
          },
        });

        // Main circles
        map.addLayer({
          id: "wards-circles",
          type: "circle",
          source: "wards",
          paint: {
            "circle-radius": ["get", "radius"],
            "circle-color": ["get", "color"],
            "circle-opacity": 0.85,
            "circle-stroke-width": 1.5,
            "circle-stroke-color":
              theme === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
          },
        });

        // Ward name labels
        map.addLayer({
          id: "wards-labels",
          type: "symbol",
          source: "wards",
          filter: [">=", ["get", "total"], 3],
          layout: {
            "text-field": ["get", "ward_name"],
            "text-size": 10,
            "text-offset": [0, 1.8],
            "text-anchor": "top",
          },
          paint: {
            "text-color": theme === "dark" ? "#e2e8f0" : "#1e293b",
            "text-halo-color": theme === "dark" ? "#0f172a" : "#ffffff",
            "text-halo-width": 1.5,
          },
        });

        // Popup on hover
        map.on("mouseenter", "wards-circles", (e) => {
          const feat = e.features?.[0];
          if (!feat) return;
          map.getCanvas().style.cursor = "pointer";
          const p = feat.properties as Record<string, string | number>;
          const slaHtml =
            Number(p.sla) > 0
              ? `<p style="color:#ef4444;font-size:11px;margin:2px 0 0">⚠ ${p.sla} SLA breach${Number(p.sla) > 1 ? "es" : ""}</p>`
              : "";
          const bg = theme === "dark" ? "#1e293b" : "#ffffff";
          const fg = theme === "dark" ? "#e2e8f0" : "#1e293b";
          const muted = theme === "dark" ? "#94a3b8" : "#64748b";
          const sev = String(p.severity);
          const sevColor = sev === "high" ? "#ef4444" : sev === "medium" ? "#f59e0b" : "#22c55e";
          const coords = (feat.geometry as GeoJSON.Point).coordinates as [number, number];

          popup
            .setLngLat(coords)
            .setHTML(`
              <div style="background:${bg};color:${fg};padding:10px 12px;border-radius:8px;
                          font-family:system-ui;min-width:160px;box-shadow:0 4px 12px rgba(0,0,0,.3)">
                <p style="font-weight:600;margin:0 0 4px;font-size:13px">${p.ward_name}</p>
                ${p.district ? `<p style="color:${muted};font-size:11px;margin:0 0 6px">${p.district}</p>` : ""}
                <div style="display:flex;gap:12px;font-size:12px">
                  <span><strong style="color:${sevColor}">${p.open}</strong> open</span>
                  <span style="color:${muted}">${p.total} total</span>
                </div>
                ${slaHtml}
              </div>`)
            .addTo(map);
        });

        map.on("mouseleave", "wards-circles", () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
      });
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // Live-update the GeoJSON source when wards change
  useEffect(() => {
    const src = mapRef.current?.getSource?.("wards");
    if (src) src.setData(buildGeoJSON());
  }, [wards, buildGeoJSON]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-xl ${height} ${className}`}
    />
  );
}

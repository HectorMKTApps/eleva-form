"use client";

import { useEffect, useState } from "react";
import type { OpenPosition, PositionsResponse } from "@/types";

export default function OpenPositions() {
  const [positions, setPositions] = useState<OpenPosition[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPositions() {
      try {
        const res = await fetch("/api/positions");
        if (!res.ok) throw new Error("positions request failed");
        const data: PositionsResponse = await res.json();
        if (!cancelled && Array.isArray(data.positions) && data.positions.length > 0) {
          setPositions(data.positions);
          setSelectedIndex(0);
        }
      } catch {
        // Silent fallback: the section simply stays hidden and the form
        // keeps its normal column, per spec.
      }
    }

    loadPositions();
    return () => {
      cancelled = true;
    };
  }, []);

  if (positions.length === 0) {
    return null;
  }

  const selected = positions[selectedIndex] ?? positions[0];

  return (
    <section className="rounded-2xl border border-elevacx-panelBorder bg-elevacx-panel p-6 text-white sm:p-8 lg:sticky lg:top-8 lg:self-start">
      <h2 className="text-xl font-bold sm:text-2xl">Explore Our Open Positions</h2>
      <p className="mt-2 text-sm text-elevacx-placeholder sm:text-base">
        Browse the job descriptions below and apply to the role that best fits your profile.
      </p>

      <div
        role="tablist"
        aria-label="Open positions"
        className="mt-5 flex gap-2 overflow-x-auto pb-1"
      >
        {positions.map((position, index) => {
          const isActive = index === selectedIndex;
          return (
            <button
              key={`${position.title}-${index}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="open-position-panel"
              onClick={() => setSelectedIndex(index)}
              className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-elevacx-accent-gradient text-white"
                  : "border border-elevacx-panelBorder bg-elevacx-panel text-elevacx-placeholder hover:text-white"
              }`}
            >
              {position.title}
            </button>
          );
        })}
      </div>

      <div
        id="open-position-panel"
        role="tabpanel"
        className="mt-5 rounded-xl border border-elevacx-panelBorder bg-elevacx-inputBg p-4 sm:p-5"
      >
        <p className="text-sm font-semibold text-elevacx-accentFrom sm:text-base">
          {selected.salary}
        </p>
        <p className="mt-3 whitespace-pre-line text-sm text-white/90 sm:text-base">
          {selected.jobDescription}
        </p>
      </div>
    </section>
  );
}

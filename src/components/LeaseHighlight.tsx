"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

export default function LeaseHighlight({
  targetId,
  redirectTo,
}: {
  targetId?: string | null;
  redirectTo?: string;
}) {
  const searchParams = useSearchParams();
  const highlightParam = searchParams.get("highlight");
  // Grabs the unique timestamp from your search bar (e.g. ?_hNonce=1794213...)
  const nonce = searchParams.get("_hNonce") || searchParams.get("_highlightRun") || "";
  const effectiveId = highlightParam || targetId;

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!effectiveId) return;

    const id = String(effectiveId).trim();
    let attempts = 0;

    const ringClasses = [
      "ring-4",
      "ring-blue-500",
      "ring-offset-2",
      "transition-all",
      "duration-500",
    ];

    const interval = setInterval(() => {
      attempts++;

      const element =
        document.getElementById(id) ||
        document.getElementById(`property-${id}`) ||
        document.getElementById(`prop-${id}`) ||
        document.getElementById(`lease-${id}`) ||
        document.getElementById(`payment-${id}`) ||
        document.getElementById(`expense-${id}`) ||
        document.getElementById(`unit-${id}`) ||
        document.querySelector(`[data-id="${id}"]`);

      if (element) {
        clearInterval(interval);

        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        // Strip first to restart CSS transition if it was already highlighted
        element.classList.remove(...ringClasses);
        void (element as HTMLElement).offsetWidth;
        element.classList.add(...ringClasses);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          element.classList.remove(...ringClasses);
        }, 3000);
      }

      if (attempts >= 30) {
        clearInterval(interval);
      }
    }, 150);

    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [effectiveId, nonce]); // <-- Re-runs when ID changes OR when user clicks the same item again (new nonce)

  return null;
}
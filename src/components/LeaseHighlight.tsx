"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function LeaseHighlight({
  targetId,
  redirectTo,
}: {
  targetId?: string | null;
  redirectTo?: string;
}) {
  const searchParams = useSearchParams();
  const highlightParam = searchParams.get("highlight");
  const effectiveId = highlightParam || targetId;

  useEffect(() => {
    if (!effectiveId) return;

    const id = String(effectiveId).trim();
    let attempts = 0;

    const interval = setInterval(() => {
      attempts++;

      const element =
        document.getElementById(id) ||
        document.getElementById(`lease-${id}`) ||
        document.getElementById(`payment-${id}`) ||
        document.getElementById(`expense-${id}`) ||
        document.getElementById(`property-${id}`) ||
        document.getElementById(`unit-${id}`);

      if (element) {
        clearInterval(interval);

        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        element.classList.add(
          "ring-4",
          "ring-blue-500",
          "ring-offset-2",
          "transition-all",
          "duration-500"
        );

        setTimeout(() => {
          element.classList.remove(
            "ring-4",
            "ring-blue-500",
            "ring-offset-2",
            "transition-all",
            "duration-500"
          );
        }, 3000);
      }

      if (attempts >= 30) {
        clearInterval(interval);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [effectiveId]);

  return null;
}
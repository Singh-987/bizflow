"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

export default function LeaseHighlight({
  targetId,
  redirectTo,
}: {
  targetId: string | null;
  redirectTo?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const urlHighlight = searchParams.get("highlight");
  const nonce = searchParams.get("_hNonce") || searchParams.get("_highlightRun") || "";
  const effectiveTargetId = urlHighlight || targetId;

  const previousRun = useRef(0);
  const activeElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!effectiveTargetId) return;

    // Increment run ID so previous retry loops are immediately invalidated
    const currentRun = ++previousRun.current;

    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const ringClasses = [
      "ring-4",
      "ring-blue-500",
      "ring-offset-2",
      "dark:ring-offset-slate-900",
      "transition-all",
      "duration-300",
    ];

    // Clean up any lingering ring from a prior click
    if (activeElementRef.current) {
      activeElementRef.current.classList.remove(...ringClasses);
      activeElementRef.current = null;
    }

    const triggerHighlight = () => {
      // Abort if another click/search happened in the meantime
      if (currentRun !== previousRun.current) return;

      const targetStr = String(effectiveTargetId);
      const element =
        document.getElementById(targetStr) ||
        document.getElementById(`payment-${targetStr}`) ||
        document.getElementById(`expense-${targetStr}`) ||
        document.getElementById(`lease-${targetStr}`) ||
        document.getElementById(`unit-${targetStr}`);

      if (!element) {
        attempts++;
        if (attempts < 30) {
          retryTimer = setTimeout(triggerHighlight, 150);
        }
        return;
      }

      activeElementRef.current = element;

      // Bring smoothly into view
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      // Strip first, trigger browser reflow, then apply ring to force animation restart
      element.classList.remove(...ringClasses);
      void element.offsetWidth;
      element.classList.add(...ringClasses);

      fadeTimer = setTimeout(() => {
        if (currentRun === previousRun.current) {
          element.classList.remove(...ringClasses);
          activeElementRef.current = null;

          if (redirectTo) {
            router.replace(redirectTo);
          }
        }
      }, 2500);
    };

    triggerHighlight();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (fadeTimer) clearTimeout(fadeTimer);
      if (activeElementRef.current) {
        activeElementRef.current.classList.remove(...ringClasses);
      }
    };
  }, [effectiveTargetId, nonce, pathname, redirectTo, router]);

  return null;
}
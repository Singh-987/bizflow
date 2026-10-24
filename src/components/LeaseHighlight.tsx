"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

export default function LeaseHighlight({
targetId,
redirectTo,
}: {
targetId: string | null;
redirectTo?: string;
}) {
const searchParams = useSearchParams();
const pathname = usePathname();
const urlHighlight = searchParams.get("highlight");
const effectiveTargetId = urlHighlight || targetId;
const navigationKey = searchParams.toString();
const previousRun = useRef(0);


useEffect(() => {
    if (!effectiveTargetId) return;

    const runId = ++previousRun.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let highlightTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let highlightedElement: HTMLElement | null = null;

    const removeHighlight = () => {
        highlightedElement?.classList.remove(
            "ring-2",
            "ring-blue-500",
            "ring-offset-2"
        );
    };

    const findTarget = () => {
        if (runId !== previousRun.current) return;

        const element = document.getElementById(effectiveTargetId);

        if (!element) {
            attempts++;

            if (attempts < 30) {
                timer = setTimeout(findTarget, 200);
            }

            return;
        }

        highlightedElement = element;

        element.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });

        element.classList.remove(
            "ring-2",
            "ring-blue-500",
            "ring-offset-2"
        );

        // Force the browser to apply the cleared state before re-highlighting.
        void element.offsetWidth;

        element.classList.add(
            "ring-2",
            "ring-blue-500",
            "ring-offset-2"
        );

        highlightTimer = setTimeout(() => {
            removeHighlight();
        }, 2500);
    };

    findTarget();

    return () => {
        if (timer) clearTimeout(timer);
        if (highlightTimer) clearTimeout(highlightTimer);
        removeHighlight();
    };
}, [effectiveTargetId, pathname, navigationKey, redirectTo]);

return null;


}

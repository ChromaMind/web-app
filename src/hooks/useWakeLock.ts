// useWakeLock.ts
"use client";

import { useEffect, useRef, useCallback } from "react";

export function useWakeLock(enabled: boolean) {
    const lockRef = useRef<any>(null);

    const request = useCallback(async () => {
        if (!enabled) return;
        try {
            if ("wakeLock" in navigator) {
                lockRef.current = await navigator.wakeLock.request("screen");
                lockRef.current.addEventListener?.("release", () => {
                    // console.log("WakeLock released");
                });
                // console.log("WakeLock acquired");
            }
        } catch (e) {
            console.warn("WakeLock failed:", e);
        }
    }, [enabled]);

    useEffect(() => {
        if (!enabled) return;
        const onVis = () => {
            if (document.visibilityState === "visible" && !lockRef.current) request();
        };
        document.addEventListener("visibilitychange", onVis);
        request();
        return () => {
            document.removeEventListener("visibilitychange", onVis);
            if (lockRef.current) {
                lockRef.current.release?.();
                lockRef.current = null;
            }
        };
    }, [enabled, request]);
}

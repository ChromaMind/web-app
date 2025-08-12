"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export type LedRGBFrame = Uint8Array;

export default function ChromaPreview({
                                          rows,
                                          cols,
                                          frame,
                                          serpentine = true,
                                          strobeHz,
                                          cellSize = 20,
                                          gap = 10,
                                          className = "",
                                      }: {
    rows: number;
    cols: number;
    frame: LedRGBFrame;
    serpentine?: boolean;
    strobeHz?: number; // 0–100 Hz
    cellSize?: number;
    gap?: number;
    className?: string;
}) {
    const total = rows * cols;

    const [gate, setGate] = useState(1);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (!strobeHz || strobeHz <= 0) {
            setGate(1);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            return;
        }

        const start = performance.now();
        const loop = () => {
            const t = (performance.now() - start) / 1000; // seconds
            // Period of one cycle
            const period = 1 / strobeHz;
            // Square wave: on first half, off second half
            const phase = (t % period) / period;
            setGate(phase < 0.5 ? 1 : 0);
            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        };
    }, [strobeHz]);

    const colors = useMemo(() => {
        const out: string[] = new Array(total);

        const mapIndex = (i: number) => {
            if (!serpentine) return i;
            const y = Math.floor(i / cols);
            const x = i % cols;
            const sx = y % 2 === 1 ? cols - 1 - x : x;
            return y * cols + sx;
        };

        for (let i = 0; i < total; i++) {
            const t = mapIndex(i);
            const base = i * 3;
            const r = Math.round(frame[base + 0] * gate);
            const g = Math.round(frame[base + 1] * gate);
            const b = Math.round(frame[base + 2] * gate);
            out[t] = `rgb(${r}, ${g}, ${b})`;
        }
        return out;
    }, [frame, total, cols, serpentine, gate]);

    return (
        <div
            className={className}
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
                gap,
                justifyContent: "center",
                alignContent: "center",
            }}
        >
            {colors.map((bg, i) => (
                <div
                    key={i}
                    style={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: 6,
                        background: bg,
                        border: "1px solid #1f2937",
                        boxShadow: `0 0 6px ${bg}`,
                    }}
                />
            ))}
        </div>
    );
}

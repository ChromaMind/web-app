"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useBLE } from "@/hooks/useBLE";
import { useSessionPlayerEngine } from "@/hooks/useSessionPlayerEngine";
import { getSessionDetails, SessionDetails } from "@/services/nftService";
import { prepareFrame } from "@/utils/color";
import { Loader } from "@/components/core/Loader";
import { SessionPlayerUI } from "@/components/session/SessionPlayerUI";

export default function PlayerPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const { isConnected: isDeviceConnected, sendData } = useBLE();
    const [session, setSession] = useState<SessionDetails | null>(null);
    const [error, setError] = useState<string | null>(null);

    const lastEventIndexRef = useRef<number>(-1);

    const audioRef = useRef<HTMLAudioElement>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);

    // create analyser only once
    useEffect(() => {
        if (!audioRef.current || analyserRef.current) return;

        const ctx = new AudioContext();
        const src = ctx.createMediaElementSource(audioRef.current);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64; // LED mapping friendly
        src.connect(analyser);
        analyser.connect(ctx.destination);
        analyserRef.current = analyser;
    }, []);

    const handleTimeUpdate = useCallback(
        (time: number) => {
            if (!isDeviceConnected || !session?.events) return;

            let eventIndex = -1;
            for (let i = session.events.length - 1; i >= 0; i--) {
                if (session.events[i].time <= time) {
                    eventIndex = i;
                    break;
                }
            }

            if (eventIndex !== -1 && eventIndex !== lastEventIndexRef.current) {
                // const frameData = prepareFrame(session.events[eventIndex].colors);
                //sendData(frameData);
                lastEventIndexRef.current = eventIndex;
            }
        },
        [isDeviceConnected, session, sendData]
    );

    useEffect(() => {
        getSessionDetails(sessionId)
            .then((data) => {
                if (data) setSession(data);
                else setError("Could not find the requested session.");
            })
            .catch(() =>
                setError("Failed to load session data. Please try again later.")
            );
    }, [sessionId]);

    const playerEngine = useSessionPlayerEngine({
        audioUrl: session?.audioUrl || "",
        onTimeUpdate: handleTimeUpdate,
        onEnded: () => {
            console.log("Session ended");
            lastEventIndexRef.current = -1;
        },
    });

    if (error)
        return (
            <div className="max-w-md mx-auto text-center p-8 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
            </div>
        );
    if (!session) return <Loader />;

    return (
        <>
            <audio ref={audioRef} src={session.audioUrl || "/audios/rave.mp3"} preload="auto" />
            <SessionPlayerUI
                session={session}
                player={playerEngine}
                isDeviceConnected={isDeviceConnected}
            />
        </>
    );
}

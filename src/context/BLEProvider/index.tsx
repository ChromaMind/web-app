"use client";

import React, { createContext, useCallback, useMemo, useRef, useState } from "react";

const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const LED_UUID     = "12345678-1234-5678-1234-56789abcdef1"; // write w/o response
const STROBE_UUID  = "4fafc201-1fb5-459e-8fcc-c5c9c331914c"; // write (string -> float)

type ColorsInput = Uint8Array | number[][];

function rgbToRgb565(r: number, g: number, b: number) {
  const r5 = (r >> 3) & 0x1F;
  const g6 = (g >> 2) & 0x3F;
  const b5 = (b >> 3) & 0x1F;
  return (r5 << 11) | (g6 << 5) | b5;
}

function prepareFrame(colors: ColorsInput) {
  const ledCount = Array.isArray((colors as any)[0])
      ? (colors as number[][]).length
      : (colors as Uint8Array).length / 3;

  const buffer = new ArrayBuffer(ledCount * 2);
  const view = new DataView(buffer);

  if (Array.isArray((colors as any)[0])) {
    (colors as number[][]).forEach((c, i) => {
      view.setUint16(i * 2, rgbToRgb565(c[0], c[1], c[2]), false); // big-endian
    });
  } else {
    const flat = colors as Uint8Array;
    for (let i = 0; i < ledCount; i++) {
      view.setUint16(
          i * 2,
          rgbToRgb565(flat[i * 3], flat[i * 3 + 1], flat[i * 3 + 2]),
          false
      );
    }
  }
  return buffer;
}

type Ctx = {
  device: BluetoothDevice | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendData: (colors: ColorsInput) => Promise<void>;
  sendStrobe: (hz: number | string) => Promise<void>;
};

export const BLEContext = createContext<Ctx | undefined>(undefined);

export function BLEProvider({ children }: { children: React.ReactNode }) {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const ledCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const strobeCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const connect = useCallback(async () => {
    try {
      if (!("bluetooth" in navigator)) {
        throw new Error("Web Bluetooth not supported in this browser/context.");
      }
      setIsConnecting(true);

      const dev = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
        // optional: acceptAllDevices: false
      });
      setDevice(dev);

      const server = await dev.gatt!.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);

      // Grab both characteristics
      ledCharRef.current = await service.getCharacteristic(LED_UUID);
      try {
        strobeCharRef.current = await service.getCharacteristic(STROBE_UUID);
      } catch (e) {
        console.warn("Strobe characteristic not found (optional):", e);
        strobeCharRef.current = null;
      }

      setIsConnected(true);

      const onDisc = () => {
        ledCharRef.current = null;
        strobeCharRef.current = null;
        setIsConnected(false);
      };
      dev.addEventListener("gattserverdisconnected", onDisc);
    } catch (e) {
      console.error("BLE connect failed:", e);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    const dev = device;
    if (dev?.gatt?.connected) dev.gatt.disconnect();
    ledCharRef.current = null;
    strobeCharRef.current = null;
    setIsConnected(false);
  }, [device]);

  const sendData = useCallback(async (colors: ColorsInput) => {
    const chr = ledCharRef.current;
    if (!chr) return; // ignore if not connected
    try {
      const frame = prepareFrame(colors);
      await chr.writeValueWithoutResponse(frame);
    } catch (e) {
      console.error("BLE write (LED) failed:", e);
    }
  }, []);

  const sendStrobe = useCallback(async (hz: number | string) => {
    const chr = strobeCharRef.current;
    if (!chr) return; // optional characteristic
    try {
      // ESP32 code calls String(...).toFloat(), so just send plain text
      const payload = typeof hz === "number" ? String(hz) : hz;
      const bytes = new TextEncoder().encode(payload);
      // Most stacks only allow write *with* response on this char type
      // but if it's WRITE_NR, switch to writeValueWithoutResponse
      if ((chr as any).properties?.writeWithoutResponse) {
        await chr.writeValueWithoutResponse(bytes);
      } else {
        await chr.writeValue(bytes);
      }
    } catch (e) {
      console.error("BLE write (STROBE) failed:", e);
    }
  }, []);

  const value = useMemo(
      () => ({
        device,
        isConnected,
        isConnecting,
        connect,
        disconnect,
        sendData,
        sendStrobe,
      }),
      [device, isConnected, isConnecting, connect, disconnect, sendData, sendStrobe]
  );

  return <BLEContext.Provider value={value}>{children}</BLEContext.Provider>;
}

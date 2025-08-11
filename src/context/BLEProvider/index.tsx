// context/BLEProvider.tsx
"use client";

import React, { createContext, useCallback, useMemo, useRef, useState } from "react";

const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const LED_UUID = "12345678-1234-5678-1234-56789abcdef1";

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
      view.setUint16(i * 2, rgbToRgb565(c[0], c[1], c[2]), false);
    });
  } else {
    const flat = colors as Uint8Array;
    for (let i = 0; i < ledCount; i++) {
      const r = flat[i * 3];
      const g = flat[i * 3 + 1];
      const b = flat[i * 3 + 2];
      view.setUint16(i * 2, rgbToRgb565(r, g, b), false);
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
};

export const BLEContext = createContext<Ctx | undefined>(undefined);

export function BLEProvider({ children }: { children: React.ReactNode }) {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      const dev = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
      });
      setDevice(dev);

      const server = await dev.gatt!.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const chr = await service.getCharacteristic(LED_UUID);
      characteristicRef.current = chr;
      setIsConnected(true);

      // auto-cleanup on disconnect
      dev.addEventListener("gattserverdisconnected", () => {
        characteristicRef.current = null;
        setIsConnected(false);
      });
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
    characteristicRef.current = null;
    setIsConnected(false);
  }, [device]);

  const sendData = useCallback(async (colors: ColorsInput) => {
    const chr = characteristicRef.current;
    if (!chr) return; // silently ignore if not connected
    try {
      const frame = prepareFrame(colors);
      await chr.writeValueWithoutResponse(frame);
    } catch (e) {
      console.error("BLE write failed:", e);
    }
  }, []);

  const value = useMemo(
      () => ({ device, isConnected, isConnecting, connect, disconnect, sendData }),
      [device, isConnected, isConnecting, connect, disconnect, sendData]
  );

  return <BLEContext.Provider value={value}>{children}</BLEContext.Provider>;
}

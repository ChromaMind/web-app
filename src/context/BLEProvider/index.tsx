"use client";

import React, { createContext, useState, ReactNode, useEffect } from 'react';

// Define the shape of the context data
interface BLEContextType {
  connect: () => Promise<void>;
  disconnect: () => void;
  sendData: (data: BufferSource) => Promise<void>;
  isConnected: boolean;
  isConnecting: boolean;
  device: BluetoothDevice | null;
  isSupported: boolean;
}

// Create the context
export const BLEContext = createContext<BLEContextType | undefined>(undefined);

// Your specific UUIDs from your example
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const LED_UUID = "12345678-1234-5678-1234-56789abcdef1";

export function BLEProvider({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [ledCharacteristic, setLedCharacteristic] = useState<BluetoothRemoteGATTCharacteristic | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  // Check for Bluetooth support on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'bluetooth' in navigator) {
      setIsSupported(true);
    }
  }, []);

  // Event handler for when the device disconnects
  const onDisconnected = () => {
    console.log('BLE device disconnected.');
    setIsConnected(false);
    setDevice(null);
    setLedCharacteristic(null);
  };

  const connect = async () => {
    if (!isSupported) {
      alert('Web Bluetooth is not supported in this browser or is not used in a secure context (https).');
      return;
    }

    setIsConnecting(true);
    try {
      console.log('Requesting Bluetooth device...');
      const btDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
      });

      console.log('Connecting to GATT Server...');
      const server = await btDevice.gatt?.connect();
      
      console.log('Getting Service...');
      const service = await server?.getPrimaryService(SERVICE_UUID);
      
      console.log('Getting Characteristic...');
      const characteristic = await service?.getCharacteristic(LED_UUID);
      setLedCharacteristic(characteristic || null);
      
      setDevice(btDevice);
      setIsConnected(true);
      console.log("✅ BLE connected");

      btDevice.addEventListener('gattserverdisconnected', onDisconnected);

    } catch (error) {
      console.error('❌ BLE connection failed!', error);
    } finally {
      setIsConnecting(false);
    }
  };

  // --- THIS IS THE MISSING FUNCTION ---
  const disconnect = () => {
    if (!device) return;

    console.log('Disconnecting from BLE device...');
    device.gatt?.disconnect();
    // The 'gattserverdisconnected' event listener will handle the state updates
  };

  // Updated to use writeValueWithoutResponse
  const sendData = async (data: BufferSource) => {
    if (!ledCharacteristic) {
      console.error('No BLE characteristic found. Cannot send data.');
      return;
    }
    try {
      // Using writeValueWithoutResponse as shown in your example
      await ledCharacteristic.writeValueWithoutResponse(data);
    } catch (error) {
      console.error('❌ BLE write failed:', error);
    }
  };

  return (
    <BLEContext.Provider value={{ connect, disconnect, sendData, isConnected, isConnecting, device, isSupported }}>
      {children}
    </BLEContext.Provider>
  );
}
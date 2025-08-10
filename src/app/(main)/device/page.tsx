"use client";

import { DeviceConnectButton } from "@/components/ble/DeviceConnectButton";
import { useBLE } from "@/hooks/useBLE";
import { useState } from "react";

// Placeholder component for calibration UI
function DeviceCalibration() {
  const { sendData, isConnected } = useBLE();
  const [brightness, setBrightness] = useState(100);

  const handleBrightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBrightness = parseInt(e.target.value, 10);
    setBrightness(newBrightness);
    
    // Example: send a command to set brightness.
    // Command format: [Command_ID, Value]. Let's say 1 is for brightness.
    const command = new Uint8Array([1, newBrightness]);
    sendData(command);
  };
  
  if (!isConnected) return null;

  return (
    <div className="mt-8 p-4 border rounded-lg">
      <h2 className="font-bold text-lg">Calibrate Brightness</h2>
      <input 
        type="range" 
        min="0" 
        max="255" 
        value={brightness}
        onChange={handleBrightnessChange}
        className="w-full mt-2"
      />
      <p>Current value: {brightness}</p>
    </div>
  );
}

export default function DevicePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Device Management</h1>
      <div className="p-4 bg-white rounded-lg shadow-sm">
        <h2 className="font-bold text-lg">Connection</h2>
        <p className="text-sm text-slate-600 mb-4">
          Use the button below to scan for and connect to your ChromaMind device via Bluetooth.
        </p>
        <DeviceConnectButton />
      </div>
      <DeviceCalibration />
    </div>
  );
}
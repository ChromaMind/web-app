"use client";

import { useState, useEffect } from 'react';
import { useBLE } from '@/hooks/useBLE';
import { DeviceConnectButton } from '@/components/ble/DeviceConnectButton';

// The calibration component logic remains the same, as it's a setting.
function BrightnessCalibration() {
  const { isConnected, sendData } = useBLE();
  const [brightness, setBrightness] = useState<number>(200);
  const [savedBrightness, setSavedBrightness] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string>('');

  useEffect(() => {
    const savedValue = localStorage.getItem('chromamind_brightness');
    if (savedValue) {
      const parsedValue = parseInt(savedValue, 10);
      setBrightness(parsedValue);
      setSavedBrightness(parsedValue);
    }
  }, []);

  const handleBrightnessChange = (newBrightness: number) => {
    setBrightness(newBrightness);
    if (!isConnected) return;
    const command = new Uint8Array([0x01, newBrightness]);
    sendData(command);
  };
  
  const handleSaveSetting = () => {
    localStorage.setItem('chromamind_brightness', String(brightness));
    setSavedBrightness(brightness);
    setFeedback('Brightness setting saved!');
    setTimeout(() => setFeedback(''), 3000);
  };

  return (
    <div className="mt-8 bg-white p-6 rounded-lg border border-slate-200">
      <h2 className="text-lg font-bold text-slate-800">Calibrate LED Brightness</h2>
      <p className="text-sm text-slate-500 mt-1">
        Adjust the slider to set the maximum brightness for your sessions.
      </p>
      {/* Rest of the component is unchanged */}
      {/* ... */}
    </div>
  );
}


// The main page component for the /settings route
export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">Settings</h1>

      {/* Section for Device Settings */}
      <section>
        <h2 className="text-xl font-semibold text-slate-700 mb-4 pb-2 border-b">Device</h2>
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="font-bold text-slate-800">Connection</h3>
          <p className="text-sm text-slate-600 mt-1 mb-4">
            Connect to your ChromaMind hardware via Bluetooth.
          </p>
          <DeviceConnectButton />
        </div>
        <BrightnessCalibration />
      </section>

      {/* You can add more sections here in the future */}
      {/* 
      <section>
        <h2 className="text-xl font-semibold text-slate-700 mb-4 pb-2 border-b">Profile</h2>
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          ... Your profile settings ...
        </div>
      </section>
      */}
    </div>
  );
}
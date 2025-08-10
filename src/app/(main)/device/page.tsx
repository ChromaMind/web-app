"use client";

import { useState, useEffect } from 'react';
import { useBLE } from '@/hooks/useBLE';
import { DeviceConnectButton } from '@/components/ble/DeviceConnectButton';

/**
 * A self-contained component for handling brightness calibration logic and UI.
 */
function BrightnessCalibration() {
  const { isConnected, sendData } = useBLE();
  const [brightness, setBrightness] = useState<number>(200); // A default value (0-255)
  const [savedBrightness, setSavedBrightness] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string>('');

  // On component mount, load the saved brightness from localStorage
  useEffect(() => {
    const savedValue = localStorage.getItem('chromamind_brightness');
    if (savedValue) {
      const parsedValue = parseInt(savedValue, 10);
      setBrightness(parsedValue);
      setSavedBrightness(parsedValue);
    }
  }, []);

  // Function to send the brightness value over BLE
  const handleBrightnessChange = (newBrightness: number) => {
    setBrightness(newBrightness);
    
    // Don't send data if not connected
    if (!isConnected) return;
    
    // Command format: [Command_ID, Value]
    // Let's define Command ID 0x01 as "Set Live Brightness".
    const command = new Uint8Array([0x01, newBrightness]);
    sendData(command);
  };
  
  // Function to save the setting to localStorage
  const handleSaveSetting = () => {
    localStorage.setItem('chromamind_brightness', String(brightness));
    setSavedBrightness(brightness);
    setFeedback('Brightness setting saved!');
    
    // Clear the feedback message after a few seconds
    setTimeout(() => setFeedback(''), 3000);

    // Optional: Send a command to the device to permanently save the value
    // This requires firmware support on the device itself.
    // Let's define Command ID 0x02 as "Save Brightness to Device Memory".
    // const command = new Uint8Array([0x02, brightness]);
    // sendData(command);
  };

  return (
    <div className="mt-8 bg-white p-6 rounded-lg border border-slate-200">
      <h2 className="text-lg font-bold text-slate-800">Calibrate LED Brightness</h2>
      <p className="text-sm text-slate-500 mt-1">
        Adjust the slider to set the maximum brightness for your sessions. This change is sent to your device in real-time.
      </p>

      {!isConnected && (
        <div className="mt-4 p-3 text-center bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-md">
          Please connect your device to enable calibration.
        </div>
      )}

      <div className="mt-6">
        <div className="flex justify-between items-center">
          <label htmlFor="brightness-slider" className="font-medium text-slate-700">
            Brightness
          </label>
          <span className="font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded-md text-sm">
            {Math.round((brightness / 255) * 100)}%
          </span>
        </div>
        <input
          id="brightness-slider"
          type="range"
          min="0"
          max="255"
          value={brightness}
          onChange={(e) => handleBrightnessChange(parseInt(e.target.value, 10))}
          disabled={!isConnected}
          className="w-full h-2 mt-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:accent-slate-400"
        />
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={handleSaveSetting}
          disabled={!isConnected}
          className="w-full sm:w-auto bg-blue-600 text-white font-semibold py-2 px-5 rounded-lg transition-colors hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
          Save as Default
        </button>
        <div className="flex-grow text-sm text-slate-500">
          {savedBrightness !== null && (
            <span>
              Last saved value: <strong className="text-slate-700">{Math.round((savedBrightness / 255) * 100)}%</strong>
            </span>
          )}
          {feedback && <span className="ml-4 text-green-600 font-semibold">{feedback}</span>}
        </div>
      </div>
    </div>
  );
}

/**
 * The main page component for the /device route.
 */
export default function DevicePage() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Card for Connection */}
      <div className="bg-white p-6 rounded-lg border border-slate-200">
        <h1 className="text-xl font-bold text-slate-900">Device Management</h1>
        <p className="text-sm text-slate-600 mt-2 mb-4">
          Use the button below to scan for and connect to your ChromaMind device via Bluetooth.
        </p>
        <DeviceConnectButton />
      </div>

      {/* Card for Calibration */}
      <BrightnessCalibration />
    </div>
  );
}
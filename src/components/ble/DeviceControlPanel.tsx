"use client";

import { useBLE } from '@/hooks/useBLE';
import { useHasMounted } from '@/hooks/useHasMounted';
import { DeviceConnectButton } from './DeviceConnectButton';
import { DeviceStatusIndicator } from './DeviceStatusIndicator';

export function DeviceControlPanel() {
  const hasMounted = useHasMounted();
  const { isConnected, device, sendData, sendStrobe } = useBLE();

  if (!hasMounted) {
    return (
      <div className="bg-slate-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Device Connection</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded mb-2"></div>
          <div className="h-8 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Device Connection</h3>
      
      {/* Connection Status */}
      <div className="flex items-center gap-3 mb-4">
        <DeviceStatusIndicator />
        {device && (
          <span className="text-xs text-slate-600">
            {device.name || 'Unnamed Device'}
          </span>
        )}
      </div>

      {/* Connection Controls */}
      <div className="mb-4">
        <DeviceConnectButton />
      </div>

      {/* Device Controls - Only show when connected */}
      {isConnected && (
        <div className="space-y-3 pt-3 border-t border-slate-200">
          <div>
            <label className="block text-xs text-slate-600 mb-2">Quick Test Patterns</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => sendData([[255, 0, 0]])} // Red
                className="p-2 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                title="Test Red LED"
              >
                Red
              </button>
              <button
                onClick={() => sendData([[0, 255, 0]])} // Green
                className="p-2 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                title="Test Green LED"
              >
                Green
              </button>
              <button
                onClick={() => sendData([[0, 0, 255]])} // Blue
                className="p-2 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                title="Test Blue LED"
              >
                Blue
              </button>
              <button
                onClick={() => sendData([[255, 255, 255]])} // White
                className="p-2 bg-slate-500 text-white text-xs rounded hover:bg-slate-600 transition-colors"
                title="Test White LED"
              >
                White
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-2">Strobe Test</label>
            <div className="flex gap-2">
              <button
                onClick={() => sendStrobe(1)}
                className="p-2 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
                title="1 Hz strobe"
              >
                1 Hz
              </button>
              <button
                onClick={() => sendStrobe(5)}
                className="p-2 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
                title="5 Hz strobe"
              >
                5 Hz
              </button>
              <button
                onClick={() => sendStrobe(10)}
                className="p-2 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
                title="10 Hz strobe"
              >
                10 Hz
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-2">Clear LEDs</label>
            <button
              onClick={() => sendData([[0, 0, 0]])} // Off
              className="p-2 bg-slate-600 text-white text-xs rounded hover:bg-slate-700 transition-colors"
              title="Turn off all LEDs"
            >
              Turn Off
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

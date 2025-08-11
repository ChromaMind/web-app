// utils/ble.ts
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const LED_UUID = "12345678-1234-5678-1234-56789abcdef1";

let ledCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
let connectedDevice: BluetoothDevice | null = null;

export function rgbToRgb565(r: number, g: number, b: number) {
    const r5 = (r >> 3) & 0x1F;
    const g6 = (g >> 2) & 0x3F;
    const b5 = (b >> 3) & 0x1F;
    return (r5 << 11) | (g6 << 5) | b5;
}

/**
 * Accepts flat Uint8Array [R,G,B,R,G,B,...] or array of [R,G,B]
 */
export function prepareFrame(colors: Uint8Array | number[][]) {
    const ledCount = Array.isArray(colors[0]) ? (colors as number[][]).length : (colors as Uint8Array).length / 3;
    const buffer = new ArrayBuffer(ledCount * 2);
    const view = new DataView(buffer);

    if (Array.isArray(colors[0])) {
        (colors as number[][]).forEach((color, i) => {
            view.setUint16(i * 2, rgbToRgb565(color[0], color[1], color[2]), false);
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

export async function connectBLE() {
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [SERVICE_UUID] }],
        });

        connectedDevice = device;
        const server = await device.gatt!.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        ledCharacteristic = await service.getCharacteristic(LED_UUID);

        console.log("✅ BLE connected to", device.name || "Unnamed device");
        return true;
    } catch (error) {
        console.error("❌ BLE connection failed:", error);
        return false;
    }
}

export async function sendLedFrame(colors: Uint8Array | number[][]) {
    if (!ledCharacteristic) {
        console.error("⚠️ No BLE characteristic found. Call connectBLE() first.");
        return;
    }

    try {
        const frame = prepareFrame(colors);
        await ledCharacteristic.writeValueWithoutResponse(frame);
    } catch (error) {
        console.error("❌ BLE write failed:", error);
    }
}

export function disconnectBLE() {
    if (connectedDevice?.gatt?.connected) {
        connectedDevice.gatt.disconnect();
        console.log("🔌 BLE disconnected");
    }
    ledCharacteristic = null;
    connectedDevice = null;
}

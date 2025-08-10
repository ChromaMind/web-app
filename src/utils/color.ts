/**
 * Converts an [R, G, B] color array to a 16-bit RGB565 format number.
 */
export function rgbToRgb565(r: number, g: number, b: number): number {
    const r5 = (r >> 3) & 0x1F;
    const g6 = (g >> 2) & 0x3F;
    const b5 = (b >> 3) & 0x1F;
    return (r5 << 11) | (g6 << 5) | b5;
}

/**
 * Prepares a full frame of LED colors into a single ArrayBuffer for BLE transfer.
 */
export function prepareFrame(colors: number[][]): ArrayBuffer {
    const buffer = new ArrayBuffer(colors.length * 2);
    const view = new DataView(buffer);
    colors.forEach((color, i) => {
        view.setUint16(i * 2, rgbToRgb565(color[0], color[1], color[2]), false); // Big-endian
    });
    return buffer;
}
import { renderPattern, type PatternId } from '@/lib/ledPatterns';

export interface PatternFrame {
  timestamp: number;
  pattern: PatternId;
  brightness: number;
  strobe_hz: number;
  led_data: number[];
}

export interface PatternData {
  trip_id: string;
  duration: number;
  fps: number;
  frames: PatternFrame[];
}

/**
 * Generate chronological LED pattern data for NFT deployment
 * @param patternId - The pattern type to generate
 * @param duration - Duration in seconds
 * @param fps - Frames per second (default: 60)
 * @param brightness - LED brightness (0-1, default: 0.8)
 * @param strobeHz - Strobe frequency (0-60, default: 0)
 * @returns PatternData object ready for JSON export
 */
export function generatePatternData(
  patternId: PatternId,
  duration: number,
  fps: number = 60,
  brightness: number = 0.8,
  strobeHz: number = 0
): PatternData {
  const totalFrames = Math.floor(duration * fps);
  const frames: PatternFrame[] = [];

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const timestamp = frameIndex / fps;
    
    // Generate pattern for this frame
    const pattern = renderPattern(patternId, {
      rows: 2,
      cols: 8,
      t: timestamp,
      bass: 128 + Math.sin(timestamp * 2) * 64, // Simulate audio reactivity
      mid: 128 + Math.cos(timestamp * 1.5) * 64,
      treble: 128 + Math.sin(timestamp * 3) * 64,
      energy: 128 + Math.abs(Math.sin(timestamp * 0.5)) * 64,
    });

    // Apply brightness and convert Uint8Array to number[]
    const ledData = Array.from(pattern).map(value => Math.round(value * brightness));

    frames.push({
      timestamp,
      pattern: patternId,
      brightness,
      strobe_hz: strobeHz,
      led_data: ledData,
    });
  }

  return {
    trip_id: `${patternId}-${Date.now()}`,
    duration,
    fps,
    frames,
  };
}

/**
 * Export pattern data as downloadable JSON file
 * @param patternData - The pattern data to export
 * @param filename - Name of the file (without extension)
 */
export function downloadPatternJSON(patternData: PatternData, filename: string): void {
  const jsonString = JSON.stringify(patternData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Generate multiple pattern variations for a single trip
 * @param patterns - Array of pattern configurations
 * @param duration - Duration in seconds
 * @param fps - Frames per second
 * @returns Array of pattern data objects
 */
export function generateMultiPatternData(
  patterns: Array<{
    patternId: PatternId;
    startTime: number;
    endTime: number;
    brightness: number;
    strobeHz: number;
  }>,
  duration: number,
  fps: number = 60
): PatternData {
  const totalFrames = Math.floor(duration * fps);
  const frames: PatternFrame[] = [];

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const timestamp = frameIndex / fps;
    
    // Find which pattern should be active at this timestamp
    const activePattern = patterns.find(p => 
      timestamp >= p.startTime && timestamp <= p.endTime
    ) || patterns[0]; // Default to first pattern

    // Generate pattern for this frame
    const pattern = renderPattern(activePattern.patternId, {
      rows: 2,
      cols: 8,
      t: timestamp,
      bass: 128 + Math.sin(timestamp * 2) * 64,
      mid: 128 + Math.cos(timestamp * 1.5) * 64,
      treble: 128 + Math.sin(timestamp * 3) * 64,
      energy: 128 + Math.abs(Math.sin(timestamp * 0.5)) * 64,
    });

    // Apply brightness and convert Uint8Array to number[]
    const ledData = Array.from(pattern).map(value => Math.round(value * activePattern.brightness));

    frames.push({
      timestamp,
      pattern: activePattern.patternId,
      brightness: activePattern.brightness,
      strobe_hz: activePattern.strobeHz,
      led_data: ledData,
    });
  }

  return {
    trip_id: `multi-pattern-${Date.now()}`,
    duration,
    fps,
    frames,
  };
}

/**
 * Validate pattern data structure
 * @param patternData - The pattern data to validate
 * @returns Validation result with errors if any
 */
export function validatePatternData(patternData: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!patternData.trip_id || typeof patternData.trip_id !== 'string') {
    errors.push('trip_id is required and must be a string');
  }

  if (!patternData.duration || typeof patternData.duration !== 'number' || patternData.duration <= 0) {
    errors.push('duration is required and must be a positive number');
  }

  if (!patternData.fps || typeof patternData.fps !== 'number' || patternData.fps <= 0) {
    errors.push('fps is required and must be a positive number');
  }

  if (!Array.isArray(patternData.frames) || patternData.frames.length === 0) {
    errors.push('frames is required and must be a non-empty array');
  }

  // Validate each frame
  patternData.frames?.forEach((frame: any, index: number) => {
    if (!frame.timestamp || typeof frame.timestamp !== 'number') {
      errors.push(`Frame ${index}: timestamp is required and must be a number`);
    }
    if (!frame.pattern || typeof frame.pattern !== 'string') {
      errors.push(`Frame ${index}: pattern is required and must be a string`);
    }
    if (!Array.isArray(frame.led_data) || frame.led_data.length !== 48) { // 16 LEDs * 3 colors
      errors.push(`Frame ${index}: led_data must be an array of 48 values (16 LEDs × 3 colors)`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

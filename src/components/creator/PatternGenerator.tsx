"use client";

import { useState } from 'react';
import { generatePatternData, downloadPatternJSON, generateMultiPatternData, validatePatternData } from '@/utils/patternGenerator';
import { ALL_PATTERN_IDS, PATTERN_LABELS, type PatternId } from '@/lib/ledPatterns';
import { DocumentArrowDownIcon, PlayIcon, StopIcon } from '@heroicons/react/24/outline';

interface PatternConfig {
  patternId: PatternId;
  startTime: number;
  endTime: number;
  brightness: number;
  strobeHz: number;
}

export function PatternGenerator() {
  const [duration, setDuration] = useState(45); // minutes
  const [fps, setFps] = useState(60);
  const [selectedPattern, setSelectedPattern] = useState<PatternId>('full-color');
  const [brightness, setBrightness] = useState(0.8);
  const [strobeHz, setStrobeHz] = useState(0);
  const [isMultiPattern, setIsMultiPattern] = useState(false);
  const [multiPatterns, setMultiPatterns] = useState<PatternConfig[]>([
    { patternId: 'full-color', startTime: 0, endTime: 15, brightness: 0.8, strobeHz: 0 },
    { patternId: 'full-white', startTime: 15, endTime: 30, brightness: 0.9, strobeHz: 5 },
    // { patternId: 'left-eye', startTime: 30, endTime: 45, brightness: 0.7, strobeHz: 0 },
    // { patternId: 'right-eye', startTime: 30, endTime: 45, brightness: 0.7, strobeHz: 0 },
  ]);

  const [generatedData, setGeneratedData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateSingle = async () => {
    setIsGenerating(true);
    try {
      const data = generatePatternData(selectedPattern, duration * 60, fps, brightness, strobeHz);
      setGeneratedData(data);
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate pattern data');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMulti = async () => {
    setIsGenerating(true);
    try {
      const data = generateMultiPatternData(multiPatterns, duration * 60, fps);
      setGeneratedData(data);
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate multi-pattern data');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedData) return;
    
    const filename = `trip-pattern-${selectedPattern}-${duration}min`;
    downloadPatternJSON(generatedData, filename);
  };

  const addMultiPattern = () => {
    setMultiPatterns(prev => [...prev, {
      patternId: 'full-white',
      startTime: prev.length * 15,
      endTime: (prev.length + 1) * 15,
      brightness: 0.8,
      strobeHz: 0,
    }]);
  };

  const updateMultiPattern = (index: number, field: keyof PatternConfig, value: any) => {
    setMultiPatterns(prev => prev.map((p, i) => 
      i === index ? { ...p, [field]: value } : p
    ));
  };

  const removeMultiPattern = (index: number) => {
    setMultiPatterns(prev => prev.filter((_, i) => i !== index));
  };

  const validateGeneratedData = () => {
    if (!generatedData) return;
    
    const validation = validatePatternData(generatedData);
    if (validation.isValid) {
      alert('✅ Pattern data is valid!');
    } else {
      alert(`❌ Validation failed:\n${validation.errors.join('\n')}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Pattern Generator</h2>
        <p className="text-slate-600">Generate LED pattern JSON files for your NFT trips</p>
      </div>

      {/* Basic Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Duration (minutes)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="1"
            max="180"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">FPS</label>
          <select
            value={fps}
            onChange={(e) => setFps(parseInt(e.target.value))}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={30}>30 FPS</option>
            <option value={60}>60 FPS</option>
            <option value={120}>120 FPS</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Pattern Type</label>
          <select
            value={selectedPattern}
            onChange={(e) => setSelectedPattern(e.target.value as PatternId)}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {ALL_PATTERN_IDS.map((id) => (
              <option key={id} value={id}>
                {PATTERN_LABELS[id] ?? id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pattern Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Brightness</label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={brightness * 100}
            onChange={(e) => setBrightness(parseInt(e.target.value) / 100)}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Strobe Frequency (Hz)</label>
          <input
            type="range"
            min="0"
            max="60"
            step="1"
            value={strobeHz}
            onChange={(e) => setStrobeHz(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0 Hz</span>
            <span className="font-mono">{strobeHz} Hz</span>
            <span>60 Hz</span>
          </div>
        </div>
      </div>

      {/* Multi-Pattern Toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="multi-pattern"
          checked={isMultiPattern}
          onChange={(e) => setIsMultiPattern(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="multi-pattern" className="text-sm font-medium text-slate-700">
          Use multiple patterns throughout the trip
        </label>
      </div>

      {/* Multi-Pattern Configuration */}
      {isMultiPattern && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-slate-900">Pattern Timeline</h3>
            <button
              onClick={addMultiPattern}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              Add Pattern
            </button>
          </div>

          <div className="space-y-3">
            {multiPatterns.map((pattern, index) => (
              <div key={index} className="grid grid-cols-5 gap-3 p-3 bg-slate-50 rounded-lg">
                <select
                  value={pattern.patternId}
                  onChange={(e) => updateMultiPattern(index, 'patternId', e.target.value)}
                  className="p-2 border border-slate-200 rounded text-sm"
                >
                  {ALL_PATTERN_IDS.map((id) => (
                    <option key={id} value={id}>
                      {PATTERN_LABELS[id] ?? id}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  value={pattern.startTime}
                  onChange={(e) => updateMultiPattern(index, 'startTime', parseInt(e.target.value) || 0)}
                  placeholder="Start (min)"
                  className="p-2 border border-slate-200 rounded text-sm"
                />

                <input
                  type="number"
                  value={pattern.endTime}
                  onChange={(e) => updateMultiPattern(index, 'endTime', parseInt(e.target.value) || 0)}
                  placeholder="End (min)"
                  className="p-2 border border-slate-200 rounded text-sm"
                />

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={pattern.brightness * 100}
                  onChange={(e) => updateMultiPattern(index, 'brightness', parseInt(e.target.value) / 100)}
                  className="h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={pattern.strobeHz}
                    onChange={(e) => updateMultiPattern(index, 'strobeHz', parseInt(e.target.value) || 0)}
                    placeholder="Hz"
                    className="w-16 p-2 border border-slate-200 rounded text-sm"
                  />
                  <button
                    onClick={() => removeMultiPattern(index)}
                    className="p-1 text-red-600 hover:text-red-800 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generation Controls */}
      <div className="flex gap-4">
        <button
          onClick={isMultiPattern ? handleGenerateMulti : handleGenerateSingle}
          disabled={isGenerating}
          className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <PlayIcon className="h-5 w-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <PlayIcon className="h-5 w-5" />
              Generate Pattern Data
            </>
          )}
        </button>

        {generatedData && (
          <>
            <button
              onClick={handleDownload}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              Download JSON
            </button>

            <button
              onClick={validateGeneratedData}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Validate
            </button>
          </>
        )}
      </div>

      {/* Generated Data Preview */}
      {generatedData && (
        <div className="bg-slate-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-slate-900 mb-3">Generated Data Preview</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-600">Trip ID:</span>
              <p className="font-mono text-xs break-all">{generatedData.trip_id}</p>
            </div>
            <div>
              <span className="text-slate-600">Duration:</span>
              <p>{generatedData.duration} seconds</p>
            </div>
            <div>
              <span className="text-slate-600">FPS:</span>
              <p>{generatedData.fps}</p>
            </div>
            <div>
              <span className="text-slate-600">Total Frames:</span>
              <p>{generatedData.frames.length.toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-4">
            <span className="text-slate-600 text-sm">Sample Frame:</span>
            <pre className="mt-2 p-3 bg-slate-100 rounded text-xs overflow-x-auto">
              {JSON.stringify(generatedData.frames[0], null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

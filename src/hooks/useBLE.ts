"use client";

import { useContext } from 'react';
import { BLEContext } from '@/context/BLEProvider';

export const useBLE = () => {
  const context = useContext(BLEContext);
  if (context === undefined) {
    throw new Error('useBLE must be used within a BLEProvider');
  }
  return context;
};
import React from 'react';
import { AbsoluteFill } from 'remotion';

export interface SafeZone {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const SafeArea: React.FC<{
  zone: SafeZone;
  debugSafeZone?: boolean;
  children: React.ReactNode;
}> = ({ zone, debugSafeZone, children }) => (
  <AbsoluteFill
    style={{
      paddingTop: zone.top,
      paddingBottom: zone.bottom,
      paddingLeft: zone.left,
      paddingRight: zone.right,
      boxSizing: 'border-box',
      outline: debugSafeZone ? '2px solid #B7F34A' : undefined,
    }}
  >
    {children}
  </AbsoluteFill>
);

import React from 'react';
import { AbsoluteFill } from 'remotion';
import { textOutsideSafeZone, titleBox, type TextBox } from './safeMath';

export interface SafeZone {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function safeAreaReport(input: {
  title: string;
  width: number;
  height: number;
  zone: SafeZone;
}): { box: TextBox; overflow: boolean } {
  const box = titleBox({ title: input.title, width: input.width, height: input.height, zone: input.zone });
  return { box, overflow: textOutsideSafeZone(box, input, input.zone) };
}

export const SafeArea: React.FC<{
  zone: SafeZone;
  debugSafeZone?: boolean;
  frame?: { width: number; height: number; title?: string };
  children: React.ReactNode;
}> = ({ zone, debugSafeZone, frame, children }) => {
  const report = debugSafeZone && frame
    ? safeAreaReport({ title: frame.title || ' ', width: frame.width, height: frame.height, zone })
    : null;
  return (
    <AbsoluteFill
      style={{
        paddingTop: zone.top,
        paddingBottom: zone.bottom,
        paddingLeft: zone.left,
        paddingRight: zone.right,
        boxSizing: 'border-box',
        outline: debugSafeZone ? '2px solid #B7F34A' : undefined,
      }}
      data-safe-overflow={report?.overflow ? '1' : '0'}
    >
      {children}
    </AbsoluteFill>
  );
};

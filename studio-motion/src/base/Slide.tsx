import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { mediaSrc } from './mediaSrc';
import { SafeArea, type SafeZone } from './SafeArea';
import { tokensOf, type MotionTokens } from './tokens';

export interface SlideProps {
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  title: string;
  support: string;
  handle: string;
  page: number;
  pages: number;
  background: string;
  backgroundColor: string;
  titleColor: string;
  accent: string;
  tokens: MotionTokens;
  zone: SafeZone;
  debugSafeZone: boolean;
}

export const Slide: React.FC<SlideProps> = (props) => {
  tokensOf(props.tokens);
  return (
    <AbsoluteFill style={{ backgroundColor: props.backgroundColor }}>
      {props.background ? (
        <Img src={mediaSrc(props.background)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : null}
      <SafeArea zone={props.zone} debugSafeZone={props.debugSafeZone}>
        <AbsoluteFill style={{ justifyContent: 'flex-end' }}>
          <div style={{ color: props.titleColor, fontFamily: 'Instrument Sans, sans-serif' }}>
            <div style={{ fontSize: 64, fontWeight: 650, lineHeight: 1.05 }}>{props.title}</div>
            <div style={{ marginTop: 16, fontSize: 32, color: props.accent }}>{props.support}</div>
            <div style={{ marginTop: 28, fontSize: 22 }}>
              {props.handle} · {props.page}/{props.pages}
            </div>
          </div>
        </AbsoluteFill>
      </SafeArea>
    </AbsoluteFill>
  );
};

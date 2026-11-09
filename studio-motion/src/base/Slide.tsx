import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { mediaSrc } from './mediaSrc';
import { SlideLayout } from './layouts/SlideLayout';
import { SafeArea, type SafeZone } from './SafeArea';
import { tokensOf, type MotionTokens } from './tokens';

export type SlideProps = {
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
  layout: string;
  fontFamily: string;
};

export const Slide: React.FC<SlideProps> = (props) => {
  tokensOf(props.tokens);
  return (
    <AbsoluteFill style={{ backgroundColor: props.backgroundColor }}>
      {props.background ? (
        <Img src={mediaSrc(props.background)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : null}
      <SafeArea zone={props.zone} debugSafeZone={props.debugSafeZone} frame={{ width: props.width, height: props.height, title: props.title }}>
        <AbsoluteFill style={{ justifyContent: 'flex-end', fontFamily: `${props.fontFamily || 'Instrument Sans'}, sans-serif` }}>
          <SlideLayout layout={props.layout} title={props.title} support={props.support} titleColor={props.titleColor} accent={props.accent} handle={props.handle} page={props.page} pages={props.pages} />
        </AbsoluteFill>
      </SafeArea>
    </AbsoluteFill>
  );
};

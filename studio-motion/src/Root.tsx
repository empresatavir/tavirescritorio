import React from 'react';
import { Composition } from 'remotion';
import { z } from 'zod';
import { ReelBase, type ReelProps } from './base/ReelBase';
import { Slide, type SlideProps } from './base/Slide';
import { TOKEN_PADRAO } from './base/tokens';

const tokensSchema = z.object({
  easing: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  enterFrames: z.number(),
  exitFrames: z.number(),
  staggerFrames: z.number(),
  holdPerWordFrames: z.number(),
  zoomFrom: z.number(),
  zoomTo: z.number(),
});

const zoneSchema = z.object({
  top: z.number(),
  bottom: z.number(),
  left: z.number(),
  right: z.number(),
});

export const slideSchema = z.object({
  width: z.number(),
  height: z.number(),
  fps: z.number(),
  durationInFrames: z.number(),
  title: z.string(),
  support: z.string(),
  handle: z.string(),
  page: z.number(),
  pages: z.number(),
  background: z.string(),
  backgroundColor: z.string(),
  titleColor: z.string(),
  accent: z.string(),
  tokens: tokensSchema,
  zone: zoneSchema,
  debugSafeZone: z.boolean(),
  layout: z.string(),
  fontFamily: z.string(),
});

export const reelSchema = z.object({
  width: z.number(),
  height: z.number(),
  fps: z.number(),
  durationInFrames: z.number(),
  scenes: z.array(z.object({
    src: z.string(),
    kind: z.enum(['image', 'video']),
    durationFrames: z.number(),
    caption: z.string(),
    preset: z.string(),
  })),
  narration: z.string(),
  narrations: z.array(z.object({
    src: z.string(),
    from: z.number(),
    durationFrames: z.number(),
  })),
  music: z.string(),
  words: z.array(z.object({ text: z.string(), startMs: z.number(), endMs: z.number() })),
  handle: z.string(),
  tokens: tokensSchema,
  zone: zoneSchema,
  debugSafeZone: z.boolean(),
  backgroundColor: z.string(),
  titleColor: z.string(),
  accent: z.string(),
});

const slideDefaults: SlideProps = {
  width: 1080,
  height: 1350,
  fps: 30,
  durationInFrames: 1,
  title: '',
  support: '',
  handle: '',
  page: 1,
  pages: 1,
  background: '',
  backgroundColor: '#0B1220',
  titleColor: '#F4F6F2',
  accent: '#B7F34A',
  tokens: TOKEN_PADRAO,
  zone: { top: 0, bottom: 0, left: 60, right: 60 },
  debugSafeZone: false,
  layout: 'capa',
  fontFamily: 'Instrument Sans',
};

const reelDefaults: ReelProps = {
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 90,
  scenes: [],
  narration: '',
  narrations: [],
  music: '',
  words: [],
  handle: '',
  tokens: TOKEN_PADRAO,
  zone: { top: 220, bottom: 420, left: 60, right: 140 },
  debugSafeZone: false,
  backgroundColor: '#0B1220',
  titleColor: '#F4F6F2',
  accent: '#B7F34A',
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="TavirSlide"
      component={Slide}
      durationInFrames={1}
      fps={30}
      width={1080}
      height={1350}
      schema={slideSchema}
      defaultProps={slideDefaults}
      calculateMetadata={({ props }) => ({
        width: props.width,
        height: props.height,
        fps: props.fps,
        durationInFrames: Math.max(1, props.durationInFrames),
      })}
    />
    <Composition
      id="TavirReel"
      component={ReelBase}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1920}
      schema={reelSchema}
      defaultProps={reelDefaults}
      calculateMetadata={({ props }) => ({
        width: props.width,
        height: props.height,
        fps: props.fps,
        durationInFrames: Math.max(1, props.durationInFrames),
      })}
    />
    {/* <kits> */}
    {/* </kits> */}
  </>
);

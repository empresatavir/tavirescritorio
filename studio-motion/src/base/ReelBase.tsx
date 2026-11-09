import React from 'react';
import { Audio, AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { easingFrom } from './easing';
import { mediaSrc } from './mediaSrc';
import { SafeArea, type SafeZone } from './SafeArea';
import { tokensOf, type MotionTokens } from './tokens';

export type ReelScene = {
  src: string;
  kind: 'image' | 'video';
  durationFrames: number;
  caption: string;
  preset: string;
};

export type ReelNarration = {
  src: string;
  from: number;
  durationFrames: number;
};

export type ReelProps = {
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  scenes: ReelScene[];
  narration: string;
  narrations: ReelNarration[];
  music: string;
  words: Array<{ text: string; startMs: number; endMs: number }>;
  handle: string;
  tokens: MotionTokens;
  zone: SafeZone;
  debugSafeZone: boolean;
  backgroundColor: string;
  titleColor: string;
  accent: string;
};

export const ReelBase: React.FC<ReelProps> = (props) => {
  const frame = useCurrentFrame();
  const tokens = tokensOf(props.tokens);
  const ease = easingFrom(tokens);
  let cursor = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: props.backgroundColor }}>
      {props.scenes.map((scene, index) => {
        const from = cursor;
        cursor += scene.durationFrames;
        const local = frame - from;
        const zoom = scene.preset === 'zoom-lento' || scene.preset === 'titulo-entrada'
          ? interpolate(local, [0, Math.max(1, scene.durationFrames - 1)], [tokens.zoomFrom, tokens.zoomTo], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: ease,
          })
          : 1;
        const timeMs = (frame / Math.max(1, props.fps)) * 1000;
        const spoken = (props.words || []).find((word) => timeMs >= word.startMs && timeMs < word.endMs);
        const opacity = interpolate(local, [0, tokens.enterFrames], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: ease,
        });
        return (
          <Sequence key={`${scene.src}-${index}`} from={from} durationInFrames={scene.durationFrames}>
            <AbsoluteFill style={{ opacity, transform: `scale(${zoom})` }}>
              {scene.kind === 'video' ? (
                <OffthreadVideo src={mediaSrc(scene.src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Img src={mediaSrc(scene.src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </AbsoluteFill>
            <SafeArea zone={props.zone} debugSafeZone={props.debugSafeZone} frame={{ width: props.width, height: props.height, title: scene.caption }}>
              <AbsoluteFill style={{ justifyContent: 'flex-end', opacity }}>
                {spoken ? (
                  <div style={{ color: props.accent, fontFamily: 'Instrument Sans, sans-serif', fontSize: 64, fontWeight: 700 }}>{spoken.text}</div>
                ) : null}
                <div style={{ color: scene.preset === 'encerramento-cta' ? props.accent : props.titleColor, fontFamily: 'Instrument Sans, sans-serif', fontSize: 42 }}>
                  {scene.caption}
                </div>
                <div style={{ marginTop: 12, color: props.accent, fontSize: 22 }}>{props.handle}</div>
              </AbsoluteFill>
            </SafeArea>
          </Sequence>
        );
      })}
      {(props.narrations || []).filter((item) => item.src).map((item) => (
        <Sequence key={item.src + item.from} from={item.from} durationInFrames={Math.max(1, item.durationFrames)}>
          <Audio src={mediaSrc(item.src)} />
        </Sequence>
      ))}
      {props.music ? (
        <Audio src={mediaSrc(props.music)} volume={(f) => {
          const speaking = (props.narrations || []).some((item) => f >= item.from && f < item.from + item.durationFrames);
          return speaking ? 0.15 : 0.45;
        }} />
      ) : null}
    </AbsoluteFill>
  );
};

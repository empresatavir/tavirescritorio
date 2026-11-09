import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { easingFrom } from './easing';
import { mediaSrc } from './mediaSrc';
import { SafeArea, type SafeZone } from './SafeArea';
import { tokensOf, type MotionTokens } from './tokens';

export type ReelScene = {
  src: string;
  kind: 'image' | 'video';
  durationFrames: number;
  caption: string;
};

export type ReelProps = {
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  scenes: ReelScene[];
  narration: string;
  music: string;
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
        const zoom = interpolate(local, [0, Math.max(1, scene.durationFrames - 1)], [tokens.zoomFrom, tokens.zoomTo], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: ease,
        });
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
                <div style={{ color: props.titleColor, fontFamily: 'Instrument Sans, sans-serif', fontSize: 42 }}>
                  {scene.caption}
                </div>
                <div style={{ marginTop: 12, color: props.accent, fontSize: 22 }}>{props.handle}</div>
              </AbsoluteFill>
            </SafeArea>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

import React from 'react';

export function SlideLayout(props: {
  layout?: string;
  title: string;
  support: string;
  titleColor: string;
  accent: string;
  handle: string;
  page: number;
  pages: number;
}): React.ReactElement {
  const layout = props.layout || (props.page === 1 ? 'capa' : 'texto');
  const color = props.titleColor;
  if (layout === 'imagem-cheia') {
    return <div style={{ position: 'absolute', left: 64, right: 64, top: 72, color, fontSize: 48, fontWeight: 650 }}>{props.title}</div>;
  }
  if (layout === 'dado') {
    return (
      <div style={{ color: props.accent }}>
        <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1 }}>{props.title}</div>
        <div style={{ marginTop: 16, fontSize: 32, color }}>{props.support}</div>
      </div>
    );
  }
  if (layout === 'fonte') {
    return (
      <div style={{ color }}>
        <div style={{ fontSize: 22, letterSpacing: 2, textTransform: 'uppercase', color: props.accent }}>Fonte</div>
        <div style={{ marginTop: 16, fontSize: 32 }}>{props.support || props.title}</div>
      </div>
    );
  }
  if (layout === 'cta') {
    return <div style={{ fontSize: 64, fontWeight: 700, color: props.accent }}>{props.title}</div>;
  }
  return (
    <div style={{ color }}>
      <div style={{ fontSize: layout === 'capa' ? 72 : 56, fontWeight: 650, lineHeight: 1.05 }}>{props.title}</div>
      {props.support ? <div style={{ marginTop: 16, fontSize: 32, color: props.accent }}>{props.support}</div> : null}
      <div style={{ marginTop: 28, fontSize: 22 }}>{props.handle} · {props.page}/{props.pages}</div>
    </div>
  );
}

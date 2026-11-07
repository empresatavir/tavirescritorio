import React from 'react';

export function toCssSize(val: number | string | undefined, defaultSize = '20px'): string {
  if (val === undefined || val === null || val === '') return defaultSize;
  if (typeof val === 'number') return `${val}px`;
  if (/^\d+(\.\d+)?$/.test(val)) return `${val}px`;
  return val;
}

export const IC: Record<string, string> = {
  gauge: 'M3 17a9 9 0 0 1 18 0M12 17l4.5-5M7 17h.01M17 17h.01',
  zap: 'M13 3 5 14h6l-1 7 8-11h-6z',
  play: 'M7 5v14l11-7z',
  kanban: 'M4 4h6v16H4zM14 4h6v10h-6z',
  shield: 'M12 3 5 6v6c0 4 3 6.5 7 8 4-1.5 7-4 7-8V6zM9 12l2 2 4-4',
  bot: 'M6 8h12v11H6zM12 8V4M9.5 12.5h.01M14.5 12.5h.01M9.5 16h5',
  msg: 'M5 5h14v11H9l-4 3z',
  layers: 'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13M20 20l-4.8-4.8',
  spark: 'M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z',
  factory: 'M3 20V10l6 3v-3l6 3V7l6 3v10zM7 16h2M12 16h2M17 16h2',
  flow: 'M4 5h5v5H4zM15 14h5v5h-5zM9 7.5h3a2 2 0 0 1 2 2v5a2 2 0 0 0 1 1.7',
  film: 'M4 5h16v14H4zM8 5v14M16 5v14M4 9.5h4M4 14.5h4M16 9.5h4M16 14.5h4',
  case: 'M8 7V5h8v2M4 7h16v12H4zM4 12h16',
  filter: 'M4 5h16l-6 7v6l-4 2v-8z',
  file: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h4',
  wallet: 'M4 7h15v12H4zM4 7l11-3v3M15 13h2',
  user: 'M12 12a4 4 0 1 0 0-8a4 4 0 1 0 0 8M5 20a7 7 0 0 1 14 0',
  share: 'M7 10a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5M17 4a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5M17 15a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5M9.2 11.3l5.6-3M9.2 13.7l5.6 3',
  inbox: 'M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6H3v-6z',
  brain: 'M9 4a3 3 0 0 0-3 3a3 3 0 0 0-2 5a3 3 0 0 0 3 5h2V4zM15 4a3 3 0 0 1 3 3a3 3 0 0 1 2 5a3 3 0 0 1-3 5h-2V4z',
  db: 'M5 6c0-2.7 14-2.7 14 0s-14 2.7-14 0M5 6v12c0 2.7 14 2.7 14 0V6M5 12c0 2.7 14 2.7 14 0',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  target: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 11.5h.01',
  mile: 'M4 6h9M8 12h12M6 18h8',
  chart: 'M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-6',
  pulse: 'M3 12h4l2-6 4 12 2-6h6',
  net: 'M10 3h4v4h-4zM4 17h4v4H4zM16 17h4v4h-4zM12 7v5M6 17v-2.5h12V17',
  sliders: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  bell: 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
  alert: 'M12 3 2 20h20zM12 10v4M12 17h.01',
  info: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 11v5M12 8h.01',
  pause: 'M8 5v14M16 5v14',
  retry: 'M4 12a8 8 0 0 1 14-5.3M20 4v5h-5M20 12a8 8 0 0 1-14 5.3M4 20v-5h5',
  send: 'M4 12 20 4l-6 16-3-7z',
  clip: 'M20 11.5l-8.5 8.5a5 5 0 0 1-7-7L13 4.5a3.5 3.5 0 0 1 5 5L9.5 18a2 2 0 0 1-3-3L14 7.5',
  compass: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M15.5 8.5l-2 5-5 2 2-5z',
  diagram: 'M3 4h6v5H3zM15 4h6v5h-6zM9 15h6v5H9zM6 9v3h12V9M12 12v3',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13'
};

interface TvIconProps {
  name: string;
  size?: number | string;
  className?: string;
  strokeWidth?: number;
}

export const TvIcon: React.FC<TvIconProps> = ({
  name,
  size = 20,
  className = '',
  strokeWidth = 1.9,
}) => {
  const path = IC[name];
  const cssSize = toCssSize(size);

  if (!path) {
    return <span style={{ width: cssSize, height: cssSize, display: 'inline-block' }} />;
  }

  return (
    <span
      className={`tv-icon-wrapper ${className}`}
      style={{
        width: cssSize,
        height: cssSize,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 0,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={path} />
      </svg>
    </span>
  );
};

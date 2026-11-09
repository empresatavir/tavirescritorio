import type { FC } from 'react';

interface StudioViewProps {
  onOpenModal?: (name: string, data?: unknown) => void;
  onNavigate?: (screen: string, extra?: unknown) => void;
}

export const StudioView: FC<StudioViewProps> = () => (
  <div className="page" style={{ padding: 24 }}>
    <h1>Studio</h1>
    <p>Modo dev — a tela real é a do app empacotado.</p>
  </div>
);

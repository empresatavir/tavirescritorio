import type { FC } from 'react';

interface SocialViewProps {
  onOpenModal?: (name: string, data?: unknown) => void;
  onNavigate?: (screen: string, extra?: unknown) => void;
  initialTab?: 'perfis' | 'comms';
}

export const SocialView: FC<SocialViewProps> = () => (
  <div className="page" style={{ padding: 24 }}>
    <h1>Social</h1>
    <p>Modo dev — a tela real é a do app empacotado.</p>
  </div>
);

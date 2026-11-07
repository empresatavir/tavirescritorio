import React from 'react';
import { FabricaDashboard } from '../features/fabrica/dashboard/FabricaDashboard';
import type { FactoryProjectItem } from '../../shared/types';

interface FabricaViewProps {
  onOpenModal?: (name: string, data?: any) => void;
  onNavigate?: (screen: string, extra?: any) => void;
  projects?: FactoryProjectItem[];
}

/** Fábrica Electron — UI fiel a Referencias/Fábrica-html (Fabrica.dc.html). */
export const FabricaView: React.FC<FabricaViewProps> = ({ onOpenModal }) => {
  return <FabricaDashboard onOpenModal={onOpenModal} />;
};

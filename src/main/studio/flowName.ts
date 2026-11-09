import * as path from 'node:path';

/** `<SIGLA>-<NNNN>-<S|C><NN>[-v<N>].<png|jpg|jpeg|webp|mp4>` */
export const FLOW_NAME = /^([A-Z0-9]{2,6})-(\d{4})-([SC]\d{2})(?:-v(\d+))?\.(png|jpe?g|webp|mp4)$/;

export interface FlowName {
  sigla: string;
  numero: number;
  parte: string;
  codigo: string;
  versao: number;
  ext: string;
}

export function parseFlowName(file: string): FlowName | null {
  const base = path.basename(file);
  const match = FLOW_NAME.exec(base);
  if (!match) return null;
  const sigla = match[1];
  const numero = match[2];
  const parte = match[3];
  return {
    sigla,
    numero: Number(numero),
    parte,
    codigo: `${sigla}-${numero}-${parte}`,
    versao: match[4] ? Number(match[4]) : 1,
    ext: match[5].toLowerCase() === 'jpeg' ? 'jpeg' : match[5].toLowerCase(),
  };
}

export function flowVersion(file: string): number {
  return parseFlowName(file)?.versao ?? 0;
}

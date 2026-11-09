import type { BrandKit } from '../../shared/studio';

export interface DocuflowChannelInput {
  id: string;
  nome: string;
  iniciais: string;
  brand_kit: BrandKit;
  redes?: Array<{ rede: string; handle: string }>;
}

/** O brand kit do Docuflow recusa campo desconhecido. A voz volta ao lado, fora do POST. */
export function docuflowChannel(perfil: DocuflowChannelInput): {
  channel: { id: string; name: string; handle: string; timezone: string; monthlyBudgetCents: number };
  brandKit: {
    channelId: string;
    name: string;
    colors: { primary: string; secondary: string; accent: string; background: string; foreground: string };
    fonts: { heading: string; body: string };
    logoRefs: Record<string, string>;
    lowerThirdRef: string;
    externalEffect: boolean;
  };
  voz: string;
} {
  const id = (perfil.iniciais || 'canal').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80) || 'canal';
  const handle = (perfil.redes?.find((rede) => rede.rede === 'youtube')?.handle || perfil.iniciais || id).replace(/^@/, '');
  const palette = perfil.brand_kit.palette;
  return {
    channel: { id, name: perfil.nome, handle, timezone: 'America/Sao_Paulo', monthlyBudgetCents: 0 },
    brandKit: {
      channelId: id,
      name: perfil.nome,
      colors: {
        primary: palette.accent,
        secondary: palette.accent2,
        accent: palette.accent,
        background: palette.ink,
        foreground: palette.text,
      },
      fonts: { heading: perfil.brand_kit.fonts.title, body: perfil.brand_kit.fonts.body },
      logoRefs: {},
      lowerThirdRef: 'lower-third.default',
      externalEffect: false,
    },
    voz: perfil.brand_kit.voice?.voiceId ?? '',
  };
}

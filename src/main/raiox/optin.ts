// G-PR1 controle 1: opt-in registrado antes de qualquer caso remoto.
// O botão "Enviar convite" (T8.3) e o pedido vindo do APK (T8.4) passam por createCasePayload:
// sem opt-in válido não há corpo para o create-case. O Supabase confere de novo (função
// create_raiox_case_with_optin e coluna optin_id obrigatória).
import { RAIOX_AVISO_VERSAO, RAIOX_OPTIN_CHANNELS, type RaioxOptin } from '../../shared/raiox';
import { RaioxError } from './raioxRules';

const DAY = 24 * 60 * 60 * 1000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Motivo para recusar o opt-in, ou null se ele vale. Mesmas regras da função no banco. */
export function optinProblem(optin: Partial<RaioxOptin> | null | undefined, now: string): string | null {
  if (!optin) return 'Registre como o contato aceitou receber o convite antes de criar o caso.';
  if (!(RAIOX_OPTIN_CHANNELS as readonly string[]).includes(String(optin.channel))) {
    return 'Escolha o canal em que o contato aceitou o convite.';
  }
  const at = Date.parse(String(optin.obtainedAt || ''));
  const ref = Date.parse(now);
  if (Number.isNaN(at)) return 'Informe quando o contato aceitou o convite.';
  if (at > ref + 5 * 60 * 1000) return 'O aceite não pode estar no futuro.';
  if (at < ref - 30 * DAY) return 'O aceite tem mais de 30 dias. Confirme de novo com o contato.';
  if (optin.policyVersion !== RAIOX_AVISO_VERSAO) {
    return `O aceite tem de ser sobre o aviso em vigor (versão ${RAIOX_AVISO_VERSAO}).`;
  }
  const operator = String(optin.operator || '').trim();
  if (operator.length < 2 || operator.length > 80) return 'Informe quem registrou o aceite.';
  return null;
}

export interface InviteInput { company: string; contact: string; email: string; optin?: Partial<RaioxOptin> | null; }

/** Corpo do create-case. Recusa sem opt-in válido. */
export function createCasePayload(input: InviteInput, now: string): Record<string, unknown> {
  const company = String(input.company || '').trim();
  const contact = String(input.contact || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  if (!company || !contact || !EMAIL.test(email)) {
    throw new RaioxError('Preencha empresa, contato e um e-mail válido.');
  }
  const problem = optinProblem(input.optin, now);
  if (problem) throw new RaioxError(problem);
  const optin = input.optin as RaioxOptin;
  return {
    empresa_nome: company.slice(0, 140),
    contato_nome: contact.slice(0, 120),
    contato_email: email.slice(0, 254),
    optin: {
      canal: optin.channel,
      obtido_em: new Date(Date.parse(optin.obtainedAt)).toISOString(),
      versao_aviso: optin.policyVersion,
      operador: optin.operator.trim(),
    },
  };
}

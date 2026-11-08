/**
 * Moldes das esteiras da Fábrica — fonte única.
 * O main usa para contar etapas, achar gates e gravar o progresso no banco;
 * o build do renderer injeta a mesma lista no Fabrica.dc.html.
 */

export type EsteiraCode = 'LP-C1' | 'LP-M1' | 'OF-C1' | 'OF-M0' | 'SY-C1' | 'SY-M1';

export interface EsteiraStage {
  name: string;
  owner: string;
  skill: string;
  /** Peso relativo no roadmap (dias). */
  weight: number;
  /** Gate: o agente resume e a etapa só fecha com a decisão do Carlos. */
  gate: boolean;
  /** Portão de QA: depois do agente, a suíte automática roda e a etapa só fecha se passar. */
  qa: boolean;
}

export interface EsteiraTemplate {
  code: EsteiraCode;
  name: string;
  stages: EsteiraStage[];
}

type Row = [name: string, owner: string, skill: string, weight: number];

const isGate = (name: string, skill: string) => /^gate\b|aprova/i.test(name) || /aprova[cç][aã]o humana/i.test(skill);
const isQa = (name: string) => /^QA\b|Loop Linter|Completion Guard/i.test(name);

const build = (code: EsteiraCode, name: string, rows: Row[]): EsteiraTemplate => ({
  code,
  name,
  stages: rows.map(([n, owner, skill, weight]) => ({ name: n, owner, skill, weight, gate: isGate(n, skill), qa: !isGate(n, skill) && isQa(n) })),
});

export const ESTEIRA_TEMPLATES: Record<EsteiraCode, EsteiraTemplate> = {
  'LP-C1': build('LP-C1', 'LPs · Criação', [
    ['Entender', 'Paula PM', 'Orquestradora', 1],
    ['Refinar', 'Arquiteto de Nicho', 'Arquitetura de soluções', 1],
    ['Dossiê', 'Dora Descoberta', 'Intake e descoberta', 1],
    ['Arquitetura', 'Théo Tech Lead', 'Liderança técnica', 1],
    ['Construção', 'Vitor Construtor', 'Dev frontend sênior', 2],
    ['QA', 'Edna E2E', 'QA end-to-end', 1],
    ['Security', 'Auditor Seg/LGPD', 'Segurança e LGPD', 2],
    ['SEO', 'Nina SEO', 'SEO técnico', 2],
    ['Handoff', 'Paulo Publicador', 'Publicação e release', 2],
  ]),
  'LP-M1': build('LP-M1', 'LPs · Manutenção', [
    ['Gate 0 · Diagnóstico da LP atual', 'Dora Descoberta', 'brand-context', 1],
    ['Auditoria de conversão', 'Bianca Estrategista', 'cro-audit', 1],
    ['Requisitos da evolução', 'Marina + Yuri', 'requirements', 1],
    ['Aprovação dos requisitos', 'Comercial TAVIR', 'aprovação humana', 1],
    ['Prova visual', 'Yuri UX', 'visual-proof', 1],
    ['Construção incremental', 'Diego Desenvolvedor', 'frontend-excelencia-tavir', 3],
    ['QA E2E Playwright', 'Talita QA', 'playwright', 1],
    ['Segurança & LGPD', 'Sérgio Seg/LGPD', 'web-security', 1],
    ['Auditoria SEO', 'Nina SEO', 'seo-audit', 1],
    ['Documentação & runbook', 'Dante Doc', 'documentacao-sistema', 1],
    ['Gate Final CEO · Completion Guard', 'Carlos Henrique', 'aprovação humana', 1],
  ]),
  'OF-C1': build('OF-C1', 'Ofertas · Criação', [
    ['Gate 0 · Problema e público', 'Dora Descoberta', 'brand-context', 1],
    ['Evidência de público', 'Bianca Estrategista', 'audience-research', 2],
    ['Validação de viabilidade', 'Bianca Estrategista', 'viability-check', 2],
    ['Precificação', 'Comercial TAVIR', 'pricing', 1],
    ['Claims e compliance', 'Sérgio Seg/LGPD', 'claims-check', 1],
    ['Página da oferta', 'Diego Desenvolvedor', 'frontend-excelencia-tavir', 2],
    ['QA de copy e oferta', 'Talita QA', 'copy-qa', 1],
    ['Gate Final CEO', 'Carlos Henrique', 'aprovação humana', 1],
  ]),
  'OF-M0': build('OF-M0', 'Ofertas · Manutenção', [
    ['Revisão da oferta', 'Bianca Estrategista', 'offer-review', 1],
    ['Evidência atualizada', 'Bianca Estrategista', 'audience-research', 1],
    ['Claims e compliance', 'Sérgio Seg/LGPD', 'claims-check', 1],
    ['Ajuste de preço', 'Comercial TAVIR', 'pricing', 1],
    ['Página revisada', 'Diego Desenvolvedor', 'frontend-excelencia-tavir', 1],
    ['Gate Final CEO', 'Carlos Henrique', 'aprovação humana', 1],
  ]),
  'SY-C1': build('SY-C1', 'Sistemas · Criação', [
    ['Gate 0 · Demanda e briefing', 'Dora Descoberta', 'brand-context', 1],
    ['Requisitos verificáveis', 'Ari Arquiteto', 'requirements', 2],
    ['Arquitetura & modelagem', 'Ari Arquiteto', 'archify · sql-queries', 2],
    ['Planejamento ágil', 'Paula PM', 'agile-planning', 1],
    ['Scaffold físico oficial', 'Diego Dev Front & Back', 'flutter create · pnpm create vite', 1],
    ['Construção Front', 'Diego Dev Front & Back', 'frontend-excelencia-tavir', 4],
    ['Construção Back', 'Diego Dev Front & Back', 'test-driven-development', 4],
    ['Loop Linter & Compiler', 'Compiler TAVIR', 'dart analyze · tsc --noEmit', 1],
    ['QA E2E Playwright', 'Talita QA', 'playwright', 2],
    ['QA Mobile · emulador tavir_qa', 'Talita QA', 'mobile-mcp', 1],
    ['Segurança & LGPD', 'Sérgio Seg/LGPD', 'web-security', 1],
    ['Completion Guard · 8 regras físicas', 'Compiler TAVIR', 'completion-guard', 1],
    ['Documentação & runbook', 'Dante Doc', 'documentacao-sistema', 1],
    ['Gate Final CEO · Completion Guard', 'Carlos Henrique', 'aprovação humana', 1],
    ['Handoff', 'Paulo Publicador', 'pacote-entrega', 1],
  ]),
  'SY-M1': build('SY-M1', 'Sistemas · Manutenção', [
    ['Entender', 'Paula PM', 'intake', 1],
    ['Refinar', 'Arquiteto de Nicho', 'refino', 1],
    ['Dossiê', 'Dora Descoberta', 'brand-context', 1],
    ['Diagnóstico técnico', 'Théo Tech Lead', 'code-review', 1],
    ['Correção e migração', 'Diego Dev Front & Back', 'test-driven-development', 3],
    ['Loop Linter & Compiler', 'Compiler TAVIR', 'tsc --noEmit · dart analyze', 1],
    ['QA E2E Playwright', 'Talita QA', 'playwright', 1],
    ['Handoff', 'Paulo Publicador', 'pacote-entrega', 1],
  ]),
};

/** `sy-c`, `SY_M1`, `of-m`… → código do molde. Mesma regra que o painel usava. */
export function normalizeEsteiraCode(raw: string | null | undefined): EsteiraCode {
  const t = String(raw || 'lp-c').toLowerCase().replace(/_/g, '-');
  const maint = /-m|^..m/.test(t);
  if (t.startsWith('sy')) return maint ? 'SY-M1' : 'SY-C1';
  if (t.startsWith('of')) return maint ? 'OF-M0' : 'OF-C1';
  return maint ? 'LP-M1' : 'LP-C1';
}

export function esteiraTemplate(raw: string | null | undefined): EsteiraTemplate {
  return ESTEIRA_TEMPLATES[normalizeEsteiraCode(raw)];
}

/** Formato que o Fabrica.dc.html usa em TPL_STAGES: [nome, dono, skill, peso]. */
export function templateStagesForPanel(): Record<EsteiraCode, Row[]> {
  const out = {} as Record<EsteiraCode, Row[]>;
  for (const t of Object.values(ESTEIRA_TEMPLATES)) {
    out[t.code] = t.stages.map((s) => [s.name, s.owner, s.skill, s.weight]);
  }
  return out;
}

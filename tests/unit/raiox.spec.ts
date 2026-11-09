import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  RAIOX_CATALOG,
  RAIOX_CICLO,
  RAIOX_GAPS,
  RAIOX_SELL_OFFERS,
  RAIOX_STAGES,
  type RaioxDocument,
} from '../../src/shared/raiox';
import {
  RaioxError,
  addEvidence,
  addHypotheses,
  approveDocuments,
  attachDocuments,
  caseIdFromUuid,
  checkStep,
  closeCase,
  closeExecution,
  createCase,
  recordDelivery,
  raioxView,
  recordMetric,
  removeEvidence,
  reviewEvidence,
  setDebrief,
  setPriority,
  startExecution,
  updateFrontier,
  type RaioxCaseInput,
  type RaioxPlaybookRef,
} from '../../src/main/raiox/raioxRules';
import { caseDir, readCase, writeCase } from '../../src/main/raiox/raioxStore';

const NOW = '2026-11-09T12:00:00.000Z';
const LATER = '2026-11-09T13:00:00.000Z';

function open(over: Partial<RaioxCaseInput> = {}, uuid = 'e7c28036-77da-43da-bfd4-5c51eb908253') {
  return createCase(
    {
      company: 'Depósito Norte',
      objective: 'Saber onde perde pedido',
      decisionNeeded: 'Qual oferta contratar primeiro',
      ...over,
    },
    NOW,
    uuid,
  );
}

function evidence(
  c: ReturnType<typeof open>,
  over: Partial<{ stage: string; source: string; claim: string; classification: string; front?: string; author?: 'carlos' | 'dora'; gapIds?: string[] }> = {},
  id = 'ev-1',
) {
  return addEvidence(
    c,
    {
      stage: 'atender',
      source: 'Dono',
      claim: 'Quem chama espera até o dia seguinte',
      classification: 'informado',
      ...over,
    },
    NOW,
    id,
  );
}

function docs(lint: string[] = [], hashes: [string, string] = ['hash-relatorio', 'hash-plano']): RaioxDocument[] {
  return [
    { kind: 'relatorio', version: 1, md: 'relatorio', sha256: hashes[0], lint, createdAt: NOW },
    { kind: 'plano', version: 1, md: 'plano', sha256: hashes[1], lint, createdAt: NOW },
  ];
}

function prioritized() {
  const c = evidence(evidence(open({ frontier: 'Só presença pública e relato do dono' }), {
    stage: 'encontrar',
    source: 'Google Maps',
    claim: 'Perfil sem horário e sem telefone clicável',
    classification: 'observado',
  }, 'ev-encontrar'), {}, 'ev-atender');
  return setPriority(c, {
    stage: 'atender',
    gapId: 'sem-roteiro-venda',
    bottleneck: 'A conversa esfria antes do pedido',
    rationale: 'Ser encontrado já acontece; a perda está na resposta',
    confidence: 'alta',
    discarded: 'Presença Local fica para depois',
  }, NOW);
}

function debriefed() {
  return setDebrief(prioritized(), {
    decision: 'proposta_emitida',
    reason: 'O dono quer corrigir o atendimento',
    offerId: 'atendimento',
    depth: 'guiado',
    plan30: 'Combinar quem responde e em qual janela',
  }, 'rascunho', NOW);
}

function accepted() {
  const approved = approveDocuments(attachDocuments(debriefed(), docs(), NOW), ['hash-relatorio', 'hash-plano'], NOW);
  const delivered = recordDelivery(approved, { channel: 'manual', to: 'Dono' }, NOW);
  return closeCase(delivered, NOW);
}

const playbook: RaioxPlaybookRef = { version: '0.1', steps: [{ n: 1 }, { n: 2 }] };

function expectError(fn: () => unknown, message: string) {
  expect(fn).toThrow(new RaioxError(message));
}

describe('regras do Raio-X', () => {
  it('recusa prioridade sem evidência utilizável', () => {
    const created = open();
    expect(created.status).toBe('fronteira');
    expectError(() => setPriority(created, {
      stage: 'atender',
      gapId: 'sem-roteiro-venda',
      bottleneck: 'Demora no WhatsApp',
      rationale: 'O contato chega e não é respondido',
      confidence: 'media',
    }, NOW), 'A prioridade precisa de uma evidência utilizável na etapa escolhida. Fonte indisponível não sustenta o gargalo.');
    const collected = evidence(created, { classification: 'indisponivel', claim: 'Mensagens ficam sem resposta no fim do dia' });
    expect(collected.status).toBe('coleta');
    expectError(() => setPriority(collected, {
      stage: 'atender',
      gapId: 'sem-roteiro-venda',
      bottleneck: 'Demora no WhatsApp',
      rationale: 'O contato chega e não é respondido',
      confidence: 'media',
    }, NOW), 'A prioridade precisa de uma evidência utilizável na etapa escolhida. Fonte indisponível não sustenta o gargalo.');
  });

  it('a devolutiva exige a oferta do gap e o passo de 30 dias', () => {
    const mapped = evidence(evidence(open({ frontier: 'Só presença pública e relato do dono' }), {
      stage: 'encontrar',
      source: 'Google Maps',
      claim: 'Perfil sem horário e sem telefone clicável',
      classification: 'observado',
    }, 'ev-a'), { stage: 'atender' }, 'ev-b');
    expect(mapped.status).toBe('jornada');
    const chosen = setPriority(mapped, {
      stage: 'atender',
      gapId: 'sem-roteiro-venda',
      bottleneck: 'A conversa esfria antes do pedido',
      rationale: 'Ser encontrado já acontece; a perda está na resposta',
      confidence: 'alta',
      discarded: 'Presença Local fica para depois',
    }, NOW);
    expect(chosen.status).toBe('prioridade');
    expect(chosen.debrief).toBeUndefined();
    expectError(() => setDebrief(chosen, {
      decision: 'proposta_emitida',
      reason: 'O dono quer corrigir o atendimento',
      offerId: 'nenhuma',
      depth: 'guiado',
      plan30: 'Responder em horário combinado',
    }, 'rascunho', NOW), 'Escolha uma oferta seguinte. O Raio-X não vende tudo de uma vez.');
    const debrief = setDebrief(chosen, {
      decision: 'proposta_emitida',
      reason: 'O dono quer corrigir o atendimento',
      offerId: 'atendimento',
      depth: 'guiado',
      plan30: 'Combinar quem responde e em qual janela',
    }, 'rascunho', NOW);
    expect(debrief.status).toBe('devolutiva');
    expect(debrief.debrief?.offerId).toBe('atendimento');
    expect(accepted().status).toBe('fechado');
  });

  it('não emitir apaga oferta e planos', () => {
    const created = evidence(open({
      company: 'Loja Sul',
      objective: 'Decidir se vale investir agora',
      decisionNeeded: 'Seguir ou parar',
    }), { stage: 'vender', claim: 'Não há decisor disponível neste mês' });
    const chosen = setPriority(created, {
      stage: 'vender',
      gapId: 'sem-canal-pedido',
      bottleneck: 'Sem decisor para a próxima oferta',
      rationale: 'O diagnóstico não tem quem receba a proposta',
      confidence: 'baixa',
    }, NOW);
    const stopped = setDebrief(chosen, {
      decision: 'nao_emitir',
      reason: 'Sem decisor, a proposta não tem destinatário',
      offerId: 'crescimento',
      plan30: 'Ignorado',
    }, 'rascunho', NOW);
    expect(stopped.debrief?.offerId).toBeUndefined();
    expect(stopped.debrief?.plan30).toBeUndefined();
    expect(stopped.status).toBe('devolutiva');
  });

  it('deep scan só existe na leitura completa e exige as frentes', () => {
    expectError(() => open({
      company: 'Oficina',
      objective: 'Estudo de amigo',
      decisionNeeded: 'Se vale seguir',
      mode: 'estudo_rapido',
      deepScan: true,
    }, '11111111-1111-4111-8111-111111111111'), 'Deep scan só existe dentro da leitura completa.');
    const created = open({
      company: 'Oficina de Moda',
      objective: 'Pautar venda e marca',
      decisionNeeded: 'Qual oferta única vem primeiro',
      mode: 'completo',
      deepScan: true,
      physicalStore: true,
    }, '22222222-2222-4222-8222-222222222222');
    expect(created.deepScan).toBe(true);
    expect(raioxView(created).scan?.map((item) => item.id)).toEqual(['site', 'instagram', 'google', 'maps', 'opinioes', 'concorrentes']);
    const withSite = evidence(created, {
      stage: 'encontrar',
      source: 'Fachada',
      claim: 'A loja depende do Instagram',
      classification: 'observado',
      front: 'site',
    });
    const chosen = setPriority(withSite, {
      stage: 'encontrar',
      gapId: 'google-perfil-fraco',
      bottleneck: 'Quem procura a loja não acha um site',
      rationale: 'A reputação existe e o caminho próprio não',
      confidence: 'media',
    }, NOW);
    expect(() => setDebrief(chosen, {
      decision: 'proposta_emitida',
      reason: 'O dono quer ser encontrado fora do Instagram',
      offerId: 'presenca_local',
      depth: 'guiado',
      plan30: 'Publicar ficha e telefone',
    }, 'rascunho', NOW)).toThrow(/deep scan/);
    const fronts: Array<[string, string]> = [
      ['instagram', 'O perfil não leva a um site'],
      ['google', 'A busca local não mostra a loja com telefone'],
      ['maps', 'A ficha não tem horário'],
      ['opinioes', 'As avaliações falam de atendimento e não de site'],
      ['concorrentes', 'Duas lojas vizinhas têm site e a Oficina não'],
    ];
    const covered = fronts.reduce((current, [front, claim], index) => evidence(current, {
      stage: 'encontrar',
      source: 'Varredura',
      claim,
      classification: 'observado',
      front,
    }, `front-${index}`), chosen);
    const done = setDebrief(covered, {
      decision: 'proposta_emitida',
      reason: 'O dono quer ser encontrado fora do Instagram',
      offerId: 'presenca_local',
      depth: 'guiado',
      plan30: 'Publicar ficha e telefone',
    }, 'rascunho', NOW);
    expect(done.status).toBe('devolutiva');
    expect(raioxView(done).scan?.every((item) => item.covered)).toBe(true);
  });

  it('o catálogo não deixa peça de fora e ordena por caixa', () => {
    expect(RAIOX_CATALOG.map((item) => item.id)).toEqual([
      'estudo_rapido', 'diagnostico', 'presenca_local', 'atendimento', 'pagina_vendas', 'landing',
      'criacao_oferta', 'catalogo', 'completo', 'deep_scan', 'branding', 'atendimento_automatizado',
      'comercio', 'crescimento', 'conteudo', 'video', 'proposta',
    ]);
    expect(RAIOX_CATALOG.map((item) => item.cashRank)).toEqual(RAIOX_CATALOG.map((_, index) => index + 1));
    expect(Object.keys(RAIOX_CICLO.mobile).sort()).toEqual(['estado', 'ficaNoPc', 'leva']);
    for (const item of RAIOX_CATALOG) {
      expect(item.plano.objetivo).toBeTruthy();
      expect(item.plano.temos.length).toBeGreaterThan(0);
      expect(item.plano.precisa.length).toBeGreaterThan(0);
      expect(item.plano.ferramentas.length).toBeGreaterThan(0);
      expect(item.plano.criar.length).toBeGreaterThan(0);
      expect(item.plano.investimento).toBeTruthy();
      expect(item.plano.estrutura).toBeTruthy();
      expect(item.plano.mobile).toBeTruthy();
      expect(['agora', 'depois_da_primeira_receita', 'depois_da_base']).toContain(item.plano.quando);
    }
    const page = fs.readFileSync(path.join(process.cwd(), 'conhecimento', 'copywriting', 'valor-equation.md'), 'utf8');
    expect(page).toMatch(/Valor/);
    expect(RAIOX_CATALOG.some((item) => item.vault.includes('raw/livros/100-million-offer-alex-hormozi--fonte'))).toBe(false);
    expect(RAIOX_SELL_OFFERS).toContain('video');
    expect(RAIOX_SELL_OFFERS).toContain('proposta');
  });

  it('recusa origem inválida e guarda segmento e link', () => {
    expectError(() => open({ company: 'Loja do Amigo', objective: 'Ver onde a venda trava', decisionNeeded: 'Qual serviço contratar', origin: 'instagram' }, '33333333-3333-4333-8333-333333333333'), 'Origem inválida. Use amigo, rua, formulário ou indicação.');
    const created = open({
      company: 'Loja do Amigo',
      objective: 'Ver onde a venda trava',
      decisionNeeded: 'Qual serviço contratar',
      origin: 'amigo',
      segment: 'Roupa online',
      publicLink: 'https://instagram.com/loja',
    }, '44444444-4444-4444-8444-444444444444');
    expect(created.origin).toBe('amigo');
    expect(created.segment).toBe('Roupa online');
    expect(created.publicLink).toBe('https://instagram.com/loja');
  });

  it('video e proposta são entrega, e a oferta da devolutiva segue o gap', () => {
    expect(RAIOX_CATALOG.filter((item) => item.kind === 'entrega').map((item) => item.id)).toEqual(expect.arrayContaining(['video', 'proposta']));
    const created = evidence(open({
      company: 'Prova video',
      objective: 'Fechar uma entrega',
      decisionNeeded: 'Qual serviço sai primeiro',
      origin: 'rua',
      segment: 'Serviço',
    }, '55555555-5555-4555-8555-555555555555'), { stage: 'vender', claim: 'A proposta não volta e o vídeo não sai' });
    const chosen = setPriority(created, {
      stage: 'vender',
      gapId: 'sem-canal-pedido',
      bottleneck: 'A entrega prometida não chega na mão do cliente',
      rationale: 'Há relato do dono nesta etapa',
      confidence: 'media',
    }, NOW);
    expectError(() => setDebrief(chosen, {
      decision: 'proposta_emitida',
      reason: 'Uma entrega fecha a prova',
      offerId: 'video',
      depth: 'guiado',
      plan30: 'Entregar a quantidade combinada',
    }, 'rascunho', NOW), 'A oferta precisa resolver o gap da prioridade.');
    const debrief = setDebrief(chosen, {
      decision: 'proposta_emitida',
      reason: 'Uma entrega fecha a prova',
      offerId: 'catalogo',
      depth: 'guiado',
      plan30: 'Entregar a quantidade combinada',
    }, 'rascunho', NOW);
    expect(debrief.debrief?.offerId).toBe('catalogo');
  });

  it('deriva o id do caso a partir do uuid', () => {
    expect(caseIdFromUuid('e7c28036-77da-43da-bfd4-5c51eb908253')).toBe('RX-E7C28036');
  });

  it('evidência da Dora pendente não sustenta prioridade; aprovada sustenta', () => {
    const pending = evidence(open(), { author: 'dora' });
    expect(pending.evidence[0].review).toBe('pendente');
    expectError(() => setPriority(pending, {
      stage: 'atender',
      gapId: 'sem-roteiro-venda',
      bottleneck: 'A conversa esfria',
      rationale: 'O dono descreveu a espera',
      confidence: 'media',
    }, NOW), 'A prioridade precisa de uma evidência utilizável na etapa escolhida. Fonte indisponível não sustenta o gargalo.');
    const approved = reviewEvidence(pending, 'ev-1', 'aprovada', NOW);
    expect(setPriority(approved, {
      stage: 'atender',
      gapId: 'sem-roteiro-venda',
      bottleneck: 'A conversa esfria',
      rationale: 'O dono descreveu a espera',
      confidence: 'media',
    }, NOW).status).toBe('prioridade');
  });

  it('remover a única evidência utilizável apaga prioridade e devolutiva', () => {
    const done = debriefed();
    const cleared = removeEvidence(done, 'ev-atender', LATER);
    expect(cleared.priority).toBeUndefined();
    expect(cleared.debrief).toBeUndefined();
    expect(cleared.status).toBe('coleta');
  });

  it('junto com rascunho é recusado; guiado e piloto passam', () => {
    const chosen = prioritized();
    const input = {
      decision: 'proposta_emitida',
      reason: 'O dono quer corrigir o atendimento',
      offerId: 'atendimento',
      plan30: 'Combinar quem responde',
    };
    expectError(() => setDebrief(chosen, { ...input, depth: 'junto' }, 'rascunho', NOW), 'Este gap ainda não tem playbook validado. Ofereça guiado ou piloto declarado.');
    expect(setDebrief(chosen, { ...input, depth: 'guiado' }, 'rascunho', NOW).debrief?.depth).toBe('guiado');
    expect(setDebrief(chosen, { ...input, depth: 'piloto' }, 'rascunho', NOW).debrief?.depth).toBe('piloto');
  });

  it('o status percorre fronteira, coleta, jornada, prioridade e devolutiva', () => {
    const created = open();
    expect(created.status).toBe('fronteira');
    const collected = evidence(created, { stage: 'encontrar', classification: 'observado' }, 'e1');
    expect(collected.status).toBe('coleta');
    const mapped = evidence(collected, { stage: 'atender' }, 'e2');
    expect(mapped.status).toBe('jornada');
    const chosen = setPriority(mapped, {
      stage: 'atender',
      gapId: 'sem-roteiro-venda',
      bottleneck: 'A conversa esfria',
      rationale: 'A perda está na resposta',
      confidence: 'alta',
    }, NOW);
    expect(chosen.status).toBe('prioridade');
    expect(setDebrief(chosen, {
      decision: 'proposta_emitida',
      reason: 'Seguir com atendimento',
      offerId: 'atendimento',
      depth: 'guiado',
      plan30: 'Combinar a janela',
    }, 'rascunho', NOW).status).toBe('devolutiva');
  });

  it('hash antigo não aprova, e a devolutiva apaga documentos e aprovação', () => {
    const withDocs = attachDocuments(debriefed(), docs(), NOW);
    expectError(() => approveDocuments(withDocs, ['velho', 'hash-plano'], NOW), 'Os documentos mudaram depois de gerados. Gere de novo e confira.');
    const approved = approveDocuments(withDocs, ['hash-relatorio', 'hash-plano'], NOW);
    expect(approved.debrief?.approval?.hashes).toEqual(['hash-relatorio', 'hash-plano']);
    const again = setDebrief(approved, {
      decision: 'proposta_emitida',
      reason: 'Texto revisto',
      offerId: 'atendimento',
      depth: 'guiado',
      plan30: 'Combinar a janela',
    }, 'rascunho', LATER);
    expect(again.debrief?.documents).toBeUndefined();
    expect(again.debrief?.approval).toBeUndefined();
  });

  it('caso legado recusa escrita', () => {
    const legacy = { ...open(), legacy: true };
    expectError(() => addEvidence(legacy, {
      stage: 'atender',
      source: 'Dono',
      claim: 'Algo',
      classification: 'informado',
    }, NOW, 'x'), 'Caso legado é somente leitura.');
  });

  it.each([
    ['empresa vazia', () => open({ company: '  ' }), 'Informe a empresa.'],
    ['objetivo vazio', () => open({ objective: '' }), 'Informe o objetivo comercial.'],
    ['decisão vazia', () => open({ decisionNeeded: '' }), 'Informe a decisão que o diagnóstico precisa permitir.'],
    ['modo inválido', () => open({ mode: 'ouro' }), 'Escolha estudo rápido, diagnóstico ou leitura completa.'],
    ['uuid inválido', () => caseIdFromUuid('nao-e-uuid'), 'Identificador inválido.'],
    ['caso fechado', () => updateFrontier(accepted(), { company: 'Outra' }, LATER), 'Caso fechado não muda.'],
    ['etapa inválida', () => evidence(open(), { stage: 'marca' }), 'Etapa da jornada inválida.'],
    ['classe inválida', () => evidence(open(), { classification: 'chute' }), 'Classificação inválida. Use observado, informado, inferido ou indisponível.'],
    ['fonte vazia', () => evidence(open(), { source: ' ' }), 'Informe a fonte da evidência.'],
    ['afirmação vazia', () => evidence(open(), { claim: '' }), 'Informe o que a evidência mostra.'],
    ['frente obrigatória', () => evidence(open({ mode: 'completo', deepScan: true }, '66666666-6666-4666-8666-666666666666'), { front: undefined }), 'No deep scan, marque a frente desta evidência.'],
    ['frente inválida', () => evidence(open(), { front: 'tiktok' }), 'Frente de varredura inválida.'],
    ['gap da evidência', () => evidence(open(), { gapIds: ['fora'] }), 'Gap fora da taxonomia.'],
    ['revisão ausente', () => reviewEvidence(evidence(open()), 'nao', 'aprovada', NOW), 'Evidência não encontrada neste diagnóstico.'],
    ['revisão inválida', () => reviewEvidence(evidence(open()), 'ev-1', 'talvez', NOW), 'Decisão de revisão inválida.'],
    ['remoção ausente', () => removeEvidence(evidence(open()), 'nao', NOW), 'Evidência não encontrada neste diagnóstico.'],
    ['hipótese sem gap', () => addHypotheses(evidence(open()), [{ gapId: 'fora', text: 'x', evidenceIds: ['ev-1'] }], NOW), 'Gap fora da taxonomia.'],
    ['hipótese sem evidência', () => addHypotheses(evidence(open()), [{ gapId: 'sem-roteiro-venda', text: 'x', evidenceIds: ['nao'] }], NOW), 'Hipótese cita evidência inexistente.'],
    ['etapa do gargalo', () => setPriority(evidence(open()), { stage: 'marca', gapId: 'sem-roteiro-venda', bottleneck: 'x', rationale: 'y', confidence: 'alta' }, NOW), 'Escolha a etapa do gargalo.'],
    ['gap ausente', () => setPriority(evidence(open()), { stage: 'atender', gapId: 'fora', bottleneck: 'x', rationale: 'y', confidence: 'alta' }, NOW), 'Escolha um gap da lista.'],
    ['gap de outra etapa', () => setPriority(evidence(open()), { stage: 'atender', gapId: 'google-perfil-fraco', bottleneck: 'x', rationale: 'y', confidence: 'alta' }, NOW), 'O gap escolhido pertence a outra etapa da jornada.'],
    ['gargalo vazio', () => setPriority(evidence(open()), { stage: 'atender', gapId: 'sem-roteiro-venda', bottleneck: ' ', rationale: 'y', confidence: 'alta' }, NOW), 'Descreva o gargalo prioritário.'],
    ['motivo vazio', () => setPriority(evidence(open()), { stage: 'atender', gapId: 'sem-roteiro-venda', bottleneck: 'x', rationale: '', confidence: 'alta' }, NOW), 'Registre por que esta prioridade vem primeiro.'],
    ['confiança inválida', () => setPriority(evidence(open()), { stage: 'atender', gapId: 'sem-roteiro-venda', bottleneck: 'x', rationale: 'y', confidence: 'certeza' }, NOW), 'Informe o nível de confiança: alta, média ou baixa.'],
    ['devolutiva inválida', () => setDebrief(prioritized(), { decision: 'talvez', reason: 'x' }, 'rascunho', NOW), 'A devolutiva é proposta emitida ou não emitir.'],
    ['motivo da devolutiva', () => setDebrief(prioritized(), { decision: 'nao_emitir', reason: ' ' }, 'rascunho', NOW), 'Registre o motivo da devolutiva.'],
    ['devolutiva sem prioridade', () => setDebrief(open(), { decision: 'nao_emitir', reason: 'parar' }, 'rascunho', NOW), 'Feche a prioridade antes da devolutiva.'],
    ['oferta de outro gap', () => setDebrief(prioritized(), { decision: 'proposta_emitida', reason: 'seguir', offerId: 'video', depth: 'guiado', plan30: 'um passo' }, 'rascunho', NOW), 'A oferta precisa resolver o gap da prioridade.'],
    ['plano de 30 dias', () => setDebrief(prioritized(), { decision: 'proposta_emitida', reason: 'seguir', offerId: 'atendimento', depth: 'guiado', plan30: ' ' }, 'rascunho', NOW), 'Registre o próximo passo dos próximos 30 dias.'],
    ['profundidade inválida', () => setDebrief(prioritized(), { decision: 'proposta_emitida', reason: 'seguir', offerId: 'atendimento', depth: 'total', plan30: 'um passo' }, 'rascunho', NOW), 'Escolha guiado, piloto, junto ou para você.'],
    ['documentos sem devolutiva', () => attachDocuments(open(), docs(), NOW), 'Registre a devolutiva antes de gerar os documentos.'],
    ['par de documentos', () => attachDocuments(debriefed(), [docs()[0]], NOW), 'São dois documentos: relatório e plano.'],
    ['aprovar sem documento', () => approveDocuments(debriefed(), [], NOW), 'Gere os documentos antes de aprovar.'],
    ['aprovar com lint', () => approveDocuments(attachDocuments(debriefed(), docs(['ajuste']), NOW), ['hash-relatorio', 'hash-plano'], NOW), 'Corrija os problemas apontados na checagem antes de aprovar.'],
    ['entregar sem aprovação', () => recordDelivery(attachDocuments(debriefed(), docs(), NOW), { channel: 'manual', to: 'Dono' }, NOW), 'Aprove os documentos antes de entregar.'],
    ['destinatário vazio', () => recordDelivery(approveDocuments(attachDocuments(debriefed(), docs(), NOW), ['hash-relatorio', 'hash-plano'], NOW), { channel: 'manual', to: ' ' }, NOW), 'Informe para quem foi entregue.'],
    ['canal inválido', () => recordDelivery(approveDocuments(attachDocuments(debriefed(), docs(), NOW), ['hash-relatorio', 'hash-plano'], NOW), { channel: 'whatsapp', to: 'Dono' }, NOW), 'Canal de entrega inválido.'],
    ['encerrar sem devolutiva', () => closeCase(open(), NOW), 'Encerre só depois da devolutiva.'],
    ['encerrar proposta sem entrega', () => closeCase(debriefed(), NOW), 'Registre a entrega antes de encerrar.'],
    ['encerrar sem aprovar o não emitir', () => closeCase(setDebrief(prioritized(), { decision: 'nao_emitir', reason: 'parar' }, 'rascunho', NOW), NOW), 'Aprove os documentos antes de encerrar.'],
    ['execução cedo', () => startExecution(debriefed(), playbook, NOW), 'Execução só abre depois da proposta aceita.'],
    ['execução repetida', () => startExecution(startExecution(accepted(), playbook, NOW), playbook, LATER), 'A execução deste caso já começou.'],
    ['métrica sem execução', () => recordMetric(open(), { key: 'resposta', label: 'Resposta', value: 1, unit: 'h', at: NOW, moment: 'd0', source: 'dono' }), 'Abra a execução primeiro.'],
    ['d30 sem d0', () => recordMetric(startExecution(accepted(), playbook, NOW), { key: 'resposta', label: 'Resposta', value: 1, unit: 'h', at: NOW, moment: 'd30', source: 'dono' }), 'Registre a linha de base (d0) antes da medição de 30 dias.'],
    ['medição sem número', () => recordMetric(startExecution(accepted(), playbook, NOW), { key: 'resposta', label: 'Resposta', value: Number.NaN, unit: 'h', at: NOW, moment: 'd0', source: 'dono' }), 'A medição precisa de um número.'],
    ['passo sem execução', () => checkStep(open(), 1, { kind: 'nota', value: 'feito' }, playbook, NOW), 'Abra a execução primeiro.'],
    ['passo sem linha de base', () => checkStep(startExecution(accepted(), playbook, NOW), 1, { kind: 'nota', value: 'feito' }, playbook, NOW), 'Passo 0: registre a linha de base antes de executar.'],
    ['passo inexistente', () => checkStep(recordMetric(startExecution(accepted(), playbook, NOW), { key: 'resposta', label: 'Resposta', value: 1, unit: 'h', at: NOW, moment: 'd0', source: 'dono' }), 9, { kind: 'nota', value: 'feito' }, playbook, NOW), 'Passo inexistente neste playbook.'],
    ['passo anterior', () => checkStep(recordMetric(startExecution(accepted(), playbook, NOW), { key: 'resposta', label: 'Resposta', value: 1, unit: 'h', at: NOW, moment: 'd0', source: 'dono' }), 2, { kind: 'nota', value: 'feito' }, playbook, NOW), 'Prove o passo anterior primeiro.'],
    ['prova vazia', () => checkStep(recordMetric(startExecution(accepted(), playbook, NOW), { key: 'resposta', label: 'Resposta', value: 1, unit: 'h', at: NOW, moment: 'd0', source: 'dono' }), 1, { kind: 'nota', value: ' ' }, playbook, NOW), 'Anexe a prova do passo.'],
    ['passo repetido', () => checkStep(checkStep(recordMetric(startExecution(accepted(), playbook, NOW), { key: 'resposta', label: 'Resposta', value: 1, unit: 'h', at: NOW, moment: 'd0', source: 'dono' }), 1, { kind: 'nota', value: 'feito' }, playbook, NOW), 1, { kind: 'nota', value: 'de novo' }, playbook, LATER), 'Este passo já foi provado.'],
    ['fechar execução incompleta', () => closeExecution(checkStep(recordMetric(startExecution(accepted(), playbook, NOW), { key: 'resposta', label: 'Resposta', value: 1, unit: 'h', at: NOW, moment: 'd0', source: 'dono' }), 1, { kind: 'nota', value: 'feito' }, playbook, NOW), playbook, LATER), 'Ainda há passos sem prova.'],
  ] as const)('%s', (_name, fn, message) => {
    expectError(fn, message);
  });

  it('fechar a execução exige a medição de 30 dias', () => {
    let current = startExecution(accepted(), playbook, NOW);
    current = recordMetric(current, { key: 'resposta', label: 'Resposta', value: 1, unit: 'h', at: NOW, moment: 'd0', source: 'dono' });
    current = checkStep(current, 1, { kind: 'nota', value: 'feito' }, playbook, NOW);
    current = checkStep(current, 2, { kind: 'nota', value: 'feito' }, playbook, NOW);
    expectError(() => closeExecution(current, playbook, LATER), 'Registre a medição de 30 dias de todas as métricas.');
    const measured = recordMetric(current, { key: 'resposta', label: 'Resposta', value: 2, unit: 'h', at: LATER, moment: 'd30', source: 'dono' });
    expect(closeExecution(measured, playbook, LATER).execution?.closedAt).toBe(LATER);
  });

  it('grava e relê o caso na pasta temporária e recusa caminho fora dela', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-raiox-'));
    const created = open();
    writeCase(root, created);
    expect(readCase(root, created.id).company).toBe('Depósito Norte');
    expect(fs.readdirSync(path.join(root, 'casos', created.id)).some((name) => name.endsWith('.tmp'))).toBe(false);
    expect(() => caseDir(root, '../x')).toThrow(new RaioxError('Caso fora da pasta privada.'));
    expect(() => caseDir(root, 'RX-zzzz')).toThrow(new RaioxError('Caso fora da pasta privada.'));
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('a taxonomia tem 16 gaps únicos, com oferta vendável e etapa válida', () => {
    expect(RAIOX_GAPS).toHaveLength(16);
    expect(new Set(RAIOX_GAPS.map((gap) => gap.id)).size).toBe(16);
    for (const gap of RAIOX_GAPS) {
      expect(RAIOX_SELL_OFFERS).toContain(gap.offerId);
      expect(RAIOX_STAGES).toContain(gap.stage);
    }
  });

  it('o catálogo tem 17 itens, 13 entregas, ordenado por caixa', () => {
    expect(RAIOX_CATALOG).toHaveLength(17);
    expect(RAIOX_CATALOG.filter((item) => item.kind === 'entrega')).toHaveLength(13);
    const ranks = RAIOX_CATALOG.map((item) => item.cashRank);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });
});

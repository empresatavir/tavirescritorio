import { describe, expect, it } from 'vitest';
import { collectLocal, localMarkdown, nameScore, parseMapsUrl, wantsLocal, type FetchLike } from '../../src/main/raiox/localBusiness';

const caso: any = { id: 'RX-1', company: 'FB Depósito 2', segment: 'Depósito de bebidas', objective: 'Vender mais', decisionNeeded: 'Instagram ou Google', frontier: 'Instagram e Google', publicLink: 'https://instagram.com/x', physicalStore: true };

function fake(routes: Record<string, { status: number; body?: any }[]>): { fetch: FetchLike; calls: { path: string; key: string }[] } {
  const calls: { path: string; key: string }[] = [];
  const fetch: FetchLike = async (url, init) => {
    const u = new URL(url);
    calls.push({ path: u.pathname, key: init.headers['X-RapidAPI-Key'] });
    const queue = routes[u.pathname] || [];
    const next = queue.length > 1 ? queue.shift()! : queue[0] || { status: 404 };
    return { status: next.status, json: async () => next.body };
  };
  return { fetch, calls };
}

const place = { business_id: 'B1', name: 'FB DEPÓSITO', rating: 4.6, review_count: 31, type: 'Bar', subtypes: ['Bar', 'Depósito de bebidas'], full_address: 'Estr. do Tingui, 112', phone_number: '+55 21 0000-0000', latitude: -22.88, longitude: -43.61, verified: false, photo_count: 40, working_hours: { Monday: ['Fechado'], Friday: ['13:00–23:00'] } };

describe('Local Business Data', () => {
  it('casa o nome do caso e ignora resultado de outro negócio', () => {
    expect(nameScore('FB Depósito 2', 'FB DEPÓSITO')).toBeGreaterThanOrEqual(0.5);
    expect(nameScore('FB Depósito 2', 'Adega do Zé')).toBe(0);
  });

  it('só consulta quando o caso olha Google ou tem loja física', () => {
    expect(wantsLocal(caso)).toBe(true);
    expect(wantsLocal({ ...caso, physicalStore: false, frontier: 'Só o Instagram', decisionNeeded: 'conteúdo' })).toBe(false);
    expect(wantsLocal(caso, ['instagram'])).toBe(false);
  });

  it('sem chave não chama a API', async () => {
    const f = fake({});
    const r = await collectLocal(caso, { keys: () => [], fetch: f.fetch });
    expect(r.status).toBe('sem_chave');
    expect(f.calls).toHaveLength(0);
  });

  it('pula chave sem assinatura e traz ficha, avaliações e concorrentes', async () => {
    const f = fake({
      '/search': [{ status: 403 }, { status: 200, body: { status: 'OK', data: [place, { ...place, business_id: 'X', name: 'Adega do Zé' }] } }],
      '/business-details': [{ status: 200, body: { data: [{ ...place, website: 'https://instagram.com/fbdeposito' }] } }],
      '/business-reviews': [{ status: 200, body: { data: { reviews: [{ rating: 5, review_text: 'Ótimo | gelada', review_datetime_utc: '2026-10-01', author_name: 'Maria Silva', owner_answer: '' }, { rating: 3, review_text: '', review_datetime_utc: '2026-09-01', author_name: 'João', owner_answer: 'Obrigado' }] } } }],
      '/search-nearby': [{ status: 200, body: { data: [place, { ...place, business_id: 'C1', name: 'Adega Campo Grande', rating: 4.8, review_count: 210, latitude: -22.89, longitude: -43.62 }] } }],
    });
    const r = await collectLocal(caso, { keys: () => ['k1', 'k2'], fetch: f.fetch });
    expect(r.status).toBe('ok');
    expect(r.place?.name).toBe('FB DEPÓSITO');
    expect(r.place?.website).toBe('https://instagram.com/fbdeposito');
    expect(r.reviews[0].author).toBe('M.');
    expect(r.reviewStats).toMatchObject({ sample: 2, average: 4, answered: 1 });
    expect(r.competitors.map((c) => c.name)).toEqual(['Adega Campo Grande']);
    expect(r.competitors[0].distanceKm).toBeGreaterThan(0);
    expect(f.calls[0].key).toBe('k1');
    expect(f.calls[1].key).toBe('k2');
    expect(r.requests.total).toBe(5);
    const md = localMarkdown(r);
    expect(md).toContain('**Nota:** 4.6');
    expect(md).toContain('Adega Campo Grande');
    expect(md).not.toContain('k1');
    expect(JSON.stringify(r)).not.toContain('k2');
  });

  it('nome incompatível vira nao_encontrado com candidatos', async () => {
    const f = fake({ '/search': [{ status: 200, body: { data: [{ ...place, business_id: 'X', name: 'Adega do Zé' }] } }] });
    const r = await collectLocal(caso, { keys: () => ['k1'], fetch: f.fetch });
    expect(r.status).toBe('nao_encontrado');
    expect(r.candidates).toHaveLength(1);
  });

  it('todas as chaves sem assinatura dá erro claro', async () => {
    const f = fake({ '/search': [{ status: 403 }] });
    const r = await collectLocal(caso, { keys: () => ['k1', 'k2'], fetch: f.fetch });
    expect(r.status).toBe('erro');
    expect(r.message).toMatch(/assinatura/);
  });

  it('lê nome e pino do link do Maps', () => {
    const p = parseMapsUrl('https://www.google.com/maps/place/FB+DEP%C3%93SITO/@-22.8834885,-43.6169336,17z/data=!3m1!4b1!8m2!3d-22.8835!4d-43.6170!16s');
    expect(p).toEqual({ name: 'FB DEPÓSITO', lat: -22.8835, lng: -43.617 });
    expect(parseMapsUrl('https://instagram.com/x')).toBeNull();
  });

  it('com link escolhe a ficha no pino, não a homônima de outra cidade', async () => {
    const outra = { ...place, business_id: 'CF', name: 'FB Deposito De Bebidas', latitude: -22.87, longitude: -42.0 };
    const f = fake({ '/search': [{ status: 200, body: { data: [outra, place] } }], '/business-details': [{ status: 200, body: { data: [] } }], '/business-reviews': [{ status: 200, body: { data: [] } }], '/search-nearby': [{ status: 200, body: { data: [] } }] });
    const r = await collectLocal(caso, { keys: () => ['k1'], fetch: f.fetch, target: { mapsUrl: 'https://www.google.com/maps/place/FB+DEP%C3%93SITO/@-22.88,-43.61,17z', origin: 'carlos' } });
    expect(r.status).toBe('ok');
    expect(r.place?.id).toBe('B1');
    expect(r.matchedBy).toBe('link');
    expect(f.calls[0].path).toBe('/search');
  });

  it('sem link marca que a ficha veio só pelo nome', async () => {
    const f = fake({ '/search': [{ status: 200, body: { data: [place] } }], '/business-details': [{ status: 200, body: { data: [] } }], '/business-reviews': [{ status: 200, body: { data: [] } }], '/search-nearby': [{ status: 200, body: { data: [] } }] });
    const r = await collectLocal(caso, { keys: () => ['k1'], fetch: f.fetch });
    expect(r.matchedBy).toBe('nome');
    expect(localMarkdown(r)).toContain('Confira');
  });
});

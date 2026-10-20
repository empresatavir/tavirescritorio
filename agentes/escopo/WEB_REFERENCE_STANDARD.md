# Padrão de Referências Web Visuais — absorver com precisão, não copiar

> Regra pétrea: referência visual alimenta **direção de design**, não vira colagem.
> Fonte irmã: `.agents/DESIGN_PROOF_STANDARD.md`. Skill operacional:
> `skills/visual-reference-absorb/SKILL.md`.

## 1. Por que este padrão existe

Agentes de frontend tendem a (a) inventar estética genérica sem olhar o mercado, ou
(b) "inspirar-se" em um shot e reproduzir layout/asset quase literais. Os dois falham.

O caminho certo: **extrair estrutura mensurável** (hierarquia, ritmo, densidade, tipografia,
materialidade, motion) e **reescrever** com tokens da marca + restrições do brief.

## 2. Fontes canônicas (ordem de preferência)

| Fonte | Quando usar | Limite |
|-------|-------------|--------|
| **Dribbble** (`https://dribbble.com/`) | Direção visual de LP, hero, marketing, brand moments | Login wall / rate limit; shots são mockups, não código |
| **Awwwards / Land-book / Godly** | Sites vivos com motion e tipografia reais | Qualidade desigual; validar performance |
| **Mobbin / Refero** (quando disponível) | Product UI / fluxos de app | Padrões de produto, não marketing |
| **Sites de concorrentes reais do brief** | Prova de mercado do nicho | Não copiar copy nem assets |
| **shadcn/ui examples + registries** | Componentes de produto acessíveis | Defaults visuais são ponto de partida, nunca entrega |

Dribbble **não** substitui prova com o cliente. É combustível de direção para Yuri UX e
para skills de taste (`design-taste-frontend`, `high-end-visual-design`).

## 3. Protocolo de absorção (obrigatório)

Antes de gerar UI "bonita", produzir um **Reference Card** (markdown curto) no workspace
do projeto, tipicamente em `NN-prova-visual/referencias.md` ou anexo do `design-system.md`:

1. **Coletar** 3–7 referências (URLs ou screenshots). Preferir variedade: 1 tipografia,
   1 layout/hero, 1 densidade/lista, 1 motion/micro se aplicável.
2. **Capturar** cada shot (browser MCP / screenshot). Não depender de memória do modelo.
3. **Extrair** por referência (campos fixos):
   - Layout family (split, manifesto, bento, editorial…)
   - Type scale aproximada (display / body / meta)
   - Densidade e whitespace (gallery / daily / cockpit)
   - Paleta em proporções (não hex literais se a marca já tem tokens)
   - Materialidade (flat, glass, brutal, paper)
   - Motion cues (entrada, hover, scroll) — só o que comunica hierarquia
   - O que **não** copiar (asset, logo, copy, foto)
4. **Traduzir** em 1 linha de Design Read (mesmo contrato de `design-taste-frontend` §0.B).
5. **Implementar** só depois do Design Read + tokens de Marina (quando existirem).

Sem Reference Card em trabalhos de prova visual Nível 2 ou redesign visual: a entrega
está incompleta.

## 4. Regras legais e éticas

1. Inspiração estrutural é permitida; **reprodução pixel-a-pixel** de shot alheio não.
2. Não redistribuir assets do Dribbble (PNG/JPG do shot) como asset do cliente.
3. Fotos, ícones e fontes do cliente seguem licença comercial em `tokens.md`.
4. Se o cliente pediu "quero igual ao shot X", registre o gap: igual visual vs. viável
   na fábrica — confirme com CTO antes de prometer.

## 5. Acesso prático ao Dribbble (o que o agente deve fazer)

| Situação | Ação |
|----------|------|
| URL de shot fornecida | Abrir no browser, screenshot, extrair Reference Card |
| Só nicho ("fintech B2B", "clínica premium") | Buscar 3–5 shots; filtrar por relevância de layout, não por likes |
| Login wall / bloqueio | Pedir ao CEO 1–3 URLs, ou cair para Awwwards/Land-book/concorrentes |
| Shot é só mockup 3D sem UI legível | Descartar; não inventar UI a partir de fake phone art |

Queries úteis (adaptar ao brief): `saas landing`, `editorial portfolio`, `checkout ecommerce`,
`b2b dashboard`, `luxury brand homepage`, `clinic landing`, `fintech hero`.

## 6. Como isso entra na esteira

- **Yuri UX:** Reference Card alimenta design system e protótipo.
- **Construtores (Rafa/Lia/fábricas):** leem a spec já traduzida; não reabrem Dribbble
  para "melhorar" sem gate.
- **CTO:** decide se o nível visual prometido é sustentável na stack/prazo.
- **Skills:** `visual-reference-absorb` (extração), `design-taste-frontend` (anti-slop),
  `frontend-engineering-canon` (arquitetura de código), `ui-styling` (shadcn ownership).

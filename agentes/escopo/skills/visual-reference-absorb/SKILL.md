---
name: visual-reference-absorb
description: Absorve referências visuais de Dribbble, Awwwards, Land-book, Godly e sites reais com precisão estrutural. Produz Reference Cards mensuráveis (layout, tipo, densidade, material, motion) sem copiar assets. Use antes de prova visual Nível 2, redesigns, landings premium, ou quando o brief citar "Dribbble", "Awwwards", "quero esse look".
---

# Visual Reference Absorb — precisão sem plágio

> Padrão pétreo: `.agents/WEB_REFERENCE_STANDARD.md` (ou `agentes/escopo/WEB_REFERENCE_STANDARD.md`).
> Esta skill é o **modo operacional**. Taste/anti-slop: `design-taste-frontend`.

## 1. Objetivo

Sair de "vi um design legal" para um **contrato de direção** que outro agente (ou você)
consegue implementar sem adivinhar — e sem roubar o shot.

## 2. Quando disparar

- Prova visual Nível 2 (design system + protótipo)
- Landing / portfolio / redesign com ambição visual
- Cliente ou CEO mandou URL do Dribbble/Awwwards
- Brief vago ("moderno", "premium", "tipo Linear") — referências matam ambiguidade
- Pós-auditoria: UI genérica demais e precisa de direção externa

**Não dispare** para CRUD interno sem brand moment, nem para trocar cor de botão isolado.

## 3. Pipeline (ordem fixa)

```text
Coletar URLs → Capturar tela → Extrair Reference Card → Design Read → Só então UI/código
```

Pular captura e extrair "de memória" = falha. Modelos alucinam detalhes de shot.

### 3.A Coletar (3–7 refs)

| Papel na grade | Exemplo de busca |
|----------------|------------------|
| Hero / first viewport | `saas landing hero`, `luxury homepage` |
| Tipografia / editorial | `editorial web design`, `magazine layout` |
| Densidade / product | `b2b dashboard`, `settings ui` (Mobbin se product) |
| Motion / micro | shot com GIFs ou site Awwwards vivo |
| Nicho do cliente | `"clinic landing"`, `"fintech onboarding"` |

Fontes: Dribbble primeiro para direção; Awwwards/Land-book/Godly para realidade no browser;
concorrentes do brief para mercado.

### 3.B Capturar

1. Abrir a URL no browser (MCP browser / Chrome DevTools MCP).
2. Screenshot do viewport relevante (hero + 1 seção abaixo se necessário).
3. Se Dribbble bloquear: pedir 1–3 URLs ao usuário **ou** trocar fonte — não inventar.

### 3.C Reference Card (template obrigatório)

Salvar em `NN-prova-visual/referencias.md` (ou equivalente do projeto):

```markdown
# Reference Card — <projeto>

## Design Read
Reading this as: <page kind> for <audience>, <vibe>, leaning <family>.

## Grade (3–7)

### R1 — <título curto>
- URL:
- Fonte: dribbble | awwwards | live | other
- Layout family:
- Type (display / body / meta):
- Density (1–10):
- Palette ratios (não hex da marca): e.g. 70% neutro / 20% superfície / 10% acento
- Material: flat | glass | paper | brutal | soft-shadow
- Motion cues (só se motivados):
- Steal (estrutura): …
- Don't steal (asset/copy/logo): …

### R2 — …
```

### 3.D Design Read → dials

Depois do card, declarar dials de `design-taste-frontend` (§1) e seguir. Referência
**não** autoriza violar tokens da Marina nem a11y.

## 4. Extração cirúrgica (o que medir)

Foque em sinais implementáveis:

| Sinal | Pergunta |
|-------|----------|
| Hierarquia | O que é o único herói visual do first viewport? |
| Alinhamento | Centered vs split vs assimétrico? |
| Escala tipo | Display cabe em 2 linhas no desktop? |
| Ritmo | Seções usam famílias de layout diferentes? |
| Cartões | Cards são necessários ou é spacing? |
| Acento | Um acento ou arco-íris? |
| Motion | Anima hierarquia/feedback ou é decoração? |

Proibido no card: "fica clean e moderno". Isso não é extração.

## 5. Dribbble — truques de acesso

1. URL direta de shot > busca genérica.
2. Busca: combine nicho + artefato (`ecommerce product page`, não só `ecommerce`).
3. Prefira shots com UI legível (tipo real, não só 3D abstract).
4. GIFs: anote só loops que comunicam estado (hover, scroll story).
5. Se likes altos mas layout é o clichê 3-cards: **descarte** (anti-slop).
6. Coleções curadas do próprio CEO > explore infinito do agente.

### Alternativas quando Dribbble falhar

- https://www.awwwards.com/
- https://land-book.com/
- https://godly.website/
- Site vivo do concorrente (WebFetch + screenshot)

## 6. Tradução para código (sem plágio)

1. Mapear Layout family → bloco de `design-taste-frontend` §10 (vocabulário).
2. Mapear densidade → `VISUAL_DENSITY`.
3. Mapear material → tokens/CSS do projeto (não copiar CSS do shot).
4. Substituir fotos do shot por assets licenciados / image-gen / placeholders marcados.
5. Rodar Pre-Flight de `design-taste-frontend` §14.

## 7. Checklist

- [ ] 3–7 refs com URL ou screenshot no workspace
- [ ] Reference Card preenchido (Steal / Don't steal em cada uma)
- [ ] Design Read em uma linha
- [ ] Tokens de marca respeitados (ou conflito escrito para Marina/CEO)
- [ ] Nenhum asset do Dribbble redistribuído
- [ ] Nenhuma cópia pixel-level
- [ ] Viabilidade na fábrica checada se o look for extremo (CTO)

## 8. Handoff

- **Yuri UX** produz o card e a prova.
- **Construtores** consomem `design-system.md` / protótipo — não o Dribbble cru.
- **Marina** não redesenha UI a partir do shot; só valida se a marca ainda é ela.

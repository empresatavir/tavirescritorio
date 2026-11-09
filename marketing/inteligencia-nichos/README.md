# Inteligência de Marketing por Nicho

Base operacional compartilhada do braço `marketing/`. Ela transforma auditorias e análises
de canais em conhecimento reutilizável para planejamento, sem guardar mídia, transcrições,
relatórios integrais ou dados pessoais de clientes.

## Fluxo

```text
Instagram (Íris) ─┐
                  ├─ diagnóstico com evidências ─ promoção sanitizada ─ nicho ─ Sami/Gael/Nina/Tainá
YouTube (Yuri) ───┘                                             ▲                 │
                                                                 └── resultado ───┘
```

1. Íris ou Yuri conclui a análise no braço de origem.
2. O agente extrai **insights, decisões sugeridas e experimentos**, preservando fonte,
   evidência, confiança, condições e riscos.
3. O item recebe um nicho primário. Aplicações secundárias viram tags, não cópias.
4. Conteúdo público e já anonimizado pode ser promovido automaticamente. Conteúdo de
   cliente, conta privada ou material com PII exige aprovação explícita e anonimização.
5. Sami consulta o nicho antes de criar calendário ou peças. Conhecimento comum não
   substitui contexto, objetivos nem dados reais do cliente.
6. O resultado do experimento retorna à ficha do nicho como `VALIDADO`, `REFUTADO` ou
   `INCONCLUSIVO`, com data, amostra e métrica.

## O que entra

- padrões recorrentes sustentados por evidências;
- hipóteses transferíveis, claramente marcadas;
- decisões sugeridas com condição de uso;
- experimentos pequenos, mensuráveis e reversíveis;
- limites e práticas que não devem ser copiadas.

## O que não entra

- relatório ou transcrição integral;
- mídia baixada, cookies, credenciais ou PII;
- opinião solta sem fonte;
- números autodeclarados tratados como benchmark;
- regra de uma plataforma aplicada automaticamente a outra;
- promessa de alcance, venda, posicionamento ou prazo.

## Taxonomia e arquivos

- Um diretório por nicho em `niches/<slug>/`.
- `conhecimento.md` é o retrato atual e consolidado do nicho.
- `_INDEX.md` aponta os nichos disponíveis e sua cobertura.
- `_TEMPLATE.md` é o contrato mínimo de uma nova ficha.
- IDs são estáveis: `<canal>-<fonte>-<tipo>-NNN`.
- Status permitidos: `HIPOTESE`, `ADOTADO`, `VALIDADO`, `REFUTADO`, `INCONCLUSIVO`,
  `ARQUIVADO`.

## Hierarquia para planejar

1. objetivo, oferta, público e restrições do cliente;
2. dados reais da conta e análises recentes de Íris/Yuri;
3. decisões validadas no mesmo nicho;
4. hipóteses do mesmo nicho;
5. aprendizado de outros nichos, explicitamente tratado como hipótese.

Sami registra no rascunho interno quais IDs utilizou. A peça enviada ao cliente não precisa
expor a engenharia interna, mas nunca pode transformar hipótese em certeza.

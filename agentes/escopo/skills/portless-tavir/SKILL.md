---
name: portless-tavir
description: Padroniza URLs .localhost e o runtime local seguro de aplicações web Node.js da TAVIR. Use ao iniciar, testar, documentar ou diagnosticar um servidor de desenvolvimento local; não use para produção ou exposição pública.
---

# Portless TAVIR

Leia `.agents/DEVELOPMENT_RUNTIME_STANDARD.md` antes de agir. Aquele documento é a fonte de verdade
para aplicabilidade, gates e evidências.

## Resultado esperado

Quando aplicável, disponibilize o projeto em `https://<slug>.localhost`, preserve o comando direto
por porta como fallback e informe ambos no handoff. Use apenas a versão aprovada no padrão.

## Procedimento essencial

1. Verifique Node, Portless, comando real do projeto e conflitos de rota/porta.
2. Escolha slug estável e não sensível. Em monorepo, prefira `<servico>.<projeto>`.
3. Execute em loopback com `PORTLESS_SYNC_HOSTS=0`; nunca habilite exposição de rede por padrão.
4. Valide página, health check e HMR/WebSocket. Use `portless doctor` antes de tentar correções.
5. Se falhar, use imediatamente o comando original por porta e registre a causa; Portless não é
   critério de build nem gate de deploy.
6. Ao terminar, encerre aplicação e proxy ocioso. Nunca instale serviço de boot.

## Interrupção obrigatória

Peça autorização imediatamente antes do primeiro trust de CA, instalação global, alteração do
arquivo `hosts`, serviço/tarefa do Windows, TLD customizado, LAN, Tailscale, Funnel, ngrok,
wildcard, force, prune ou limpeza. A autorização da tarefa de desenvolvimento não cobre essas
mutações.

Não copie comandos opcionais da documentação upstream como se fossem padrão TAVIR. Nunca use
credenciais ou dados reais de produção no runtime local.

# TAVIR Escritório

Painel operacional local single-user para orquestração de agentes de IA, jobs, tarefas e conteúdo editorial.

## Requisitos

- **Node.js:** 24 LTS (para build do frontend)
- **Python:** 3.12+ (para backend FastAPI)
- **SQLite:** 3.x (embutido no Python)

## Estrutura

```
frontend/       # SolidJS + Vite (SPA)
backend/        # FastAPI (loopback only)
db/migrations/  # Migrações SQLite versionadas
tests/          # unit/, contract/, integration/, e2e/
docs/           # modules/, adr/, planning/
```

Ver [ARCHITECTURE.md](ARCHITECTURE.md) para detalhes completos.

## Como Executar o Escritório

Para iniciar ou gerenciar a aplicação local no Windows, utilize os scripts `.bat` na raiz do projeto:

### 1. Iniciar o Escritório Completo
Dê duplo clique em:
- **`iniciar_escritorio.bat`** (ou use o atalho **`run.bat`**)

O inicializador realiza automaticamente:
1. Verificação de pré-requisitos (Python 3.11+, Node.js 18+, npm);
2. Detecção automática de ambiente virtual (`.venv` ou `venv`), se houver;
3. Instalação de dependências do frontend (`npm install`) caso `node_modules` não exista;
4. Execução de migrações automáticas do banco SQLite (`alembic upgrade head`) caso `tavir.db` não exista;
5. Inicialização do Backend FastAPI na porta `9001` em janela própria;
6. Inicialização do Frontend SolidJS SPA na porta `9002` em janela própria;
7. Verificação de saúde e abertura automática do navegador em `http://localhost:9002/`;
8. Menu interativo no terminal para reabrir abas, testar ou encerrar os serviços.

### 2. Parar os Serviços
Dê duplo clique em:
- **`parar_escritorio.bat`**

Encerra com segurança e em um clique todos os processos ativos vinculados às portas `9001` (Backend) e `9002` (Frontend).

### 3. Executar Testes e Validação
Dê duplo clique em:
- **`testar_escritorio.bat`**

Roda a suíte completa de testes unitários/integração do backend (`pytest`) e valida a compilação do TypeScript/Vite (`npm run build`).

---

## URLs dos Serviços

- **Painel Operacional (Frontend):** `http://localhost:9002/`
- **Swagger API Docs (Backend):** `http://127.0.0.1:9001/docs`
- **OpenAPI JSON:** `http://127.0.0.1:9001/openapi.json`
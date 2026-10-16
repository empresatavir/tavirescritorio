# Captura de plataformas autenticadas

## Gate de acesso

Usar apenas a sessão do Chrome do Carlos e somente a organização/conta indicada.
Se a URL abrir login, pedir que ele autentique diretamente no navegador e avise
quando estiver pronto. MFA, CAPTCHA, consentimento e troca de perfil são humanos.
Nunca ler cookies, local storage, senhas, tokens ou gerenciador de credenciais.

## Navegação permitida

- abrir menus, links, abas, acordeões e paginação de leitura;
- usar busca/filtro apenas quando não grava estado relevante;
- alternar viewport ou inspecionar estado responsivo;
- visitar detalhes existentes sem editar.

Não clicar em ações com possibilidade de mutação: salvar, publicar, excluir,
cancelar, enviar, convidar, comprar, contratar, aprovar, disparar, desconectar ou
alterar configurações. Se uma jornada exigir submissão, parar antes do clique e
marcá-la como `PARCIAL — submissão não autorizada`.

## Registro mínimo por tela

Salvar um JSON em `coleta/autenticado/pages/NNN-<slug>.json`:

```json
{
  "url": "https://app.exemplo.com/rota",
  "title": "Nome da tela",
  "captured_at": "ISO-8601",
  "access_role": "papel informado pelo usuário",
  "journey": "objetivo da jornada",
  "visible_sections": ["resumo", "lista", "filtros"],
  "headings": [{"level": 1, "text": "Título"}],
  "buttons": ["Criar", "Exportar"],
  "forms": [{"purpose": "busca", "fields": ["termo"]}],
  "states": ["carregado"],
  "observations": ["fato observável"],
  "redactions": ["e-mail mascarado"],
  "screenshots": {"desktop": "screenshots/desktop/...png", "mobile": null}
}
```

Omitir valores de campos, nomes, e-mails, telefones, documentos, saldos e outros
dados pessoais quando eles não forem necessários para a evidência. Se aparecerem
em screenshot, recortar ou mascarar antes de usar no relatório entregue.

## Jornadas

Registrar em `controle/manifesto.json`:

```json
{
  "name": "consultar pedido",
  "access_role": "atendimento",
  "status": "observed|partial|blocked|unavailable",
  "steps": ["lista", "busca", "detalhe"],
  "summary": "resultado observável",
  "blocked_before": "salvar alteração",
  "evidence": ["coleta/autenticado/pages/001-lista.json"]
}
```

“Funcionalidade existe” exige uma tela ou estado observado. Item apenas citado em
menu ou documentação fica como `PARCIAL — entrada observada, execução não testada`.

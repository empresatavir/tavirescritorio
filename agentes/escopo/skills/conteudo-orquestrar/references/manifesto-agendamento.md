# Manifesto neutro de agendamento

O manifesto é uma fronteira entre criação e publicação. Ele pode alimentar DarkFlow no futuro,
mas não presume que qualquer adaptador exista.

```json
{
  "schema_version": "0.1-draft",
  "cycle_id": "TAVIR-C01",
  "items": [
    {
      "variant_id": "TAVIR-C01-P01-IG-C01",
      "channel": "instagram",
      "account_alias": "tavir-oficial",
      "format": "carousel",
      "caption_path": "relative/path/caption.md",
      "media": ["relative/path/slide-01.png"],
      "scheduled_at": null,
      "timezone": "America/Sao_Paulo",
      "status": "qa_approved",
      "approval": {"approved_by": null, "approved_at": null},
      "rights_checked": false,
      "ai_disclosure": "pending_review",
      "publish_mode": "dry_run"
    }
  ]
}
```

## Invariantes

- `account_alias` é apelido não secreto; nunca guardar token, cookie ou ID sensível.
- Caminhos são relativos à raiz do pacote e não podem sair dela.
- `scheduled_at` fica nulo até decisão humana.
- O primeiro uso de qualquer adaptador é `dry_run`.
- `publish_mode=live` exige aprovação humana, adaptador oficial, validação de conta e gate de
  segurança aplicável.
- Falha parcial não repete automaticamente itens já publicados; reconciliação usa o ID remoto.

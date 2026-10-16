from __future__ import annotations

import unittest

from finalize_report import build_summary, validate_full_report
from render_report import render_document


COMPLETE = """# Auditoria do Instagram — @teste

> **Requests RapidAPI usados:** 2

## Resumo executivo

Decisão principal.

## 1. Escopo e cobertura

Cobertura declarada.

## 2. Leitura do perfil

Leitura longa que não deve entrar no resumo.

## 11. Oportunidades priorizadas

Prioridade P1.

## 12. Plano de testes — 30 dias

Experimento.

## Limitações

Métricas privadas indisponíveis.
"""


class ReportVariantsTests(unittest.TestCase):
    def test_summary_keeps_decisions_and_omits_deep_section(self):
        summary = build_summary(COMPLETE)
        self.assertIn("Decisão principal", summary)
        self.assertIn("Prioridade P1", summary)
        self.assertIn("Métricas privadas", summary)
        self.assertNotIn("Leitura longa", summary)

    def test_validation_rejects_placeholder(self):
        with self.assertRaises(ValueError):
            validate_full_report(COMPLETE.replace("Decisão principal.", "A PREENCHER"))

    def test_renderer_neutralizes_untrusted_html(self):
        rendered = render_document(
            COMPLETE + "\n<script>alert(1)</script><img src=x onerror=alert(2)>\n",
            "Teste",
            "",
        )
        self.assertNotIn("<script>", rendered)
        self.assertNotIn("<img src=x", rendered)
        self.assertIn("&lt;script&gt;", rendered)


if __name__ == "__main__":
    unittest.main()

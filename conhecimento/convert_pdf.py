#!/usr/bin/env python3
"""
convert.py — Conversor de PDF para Markdown (compatível com marker-pdf v1.x)
Empresa Cognitiva | Fase 1 — Estruturação do Conhecimento

Uso:
  python convert.py livro.pdf
  python convert.py livro.pdf --autor "Robert Cialdini" --dominio psicologia
  python convert.py "pasta/com pdfs/" --batch --dominio psicologia
  python convert.py livro.pdf --output "C:/vault/raw/livros"
"""

import os
import sys
import re
import argparse
import unicodedata
from pathlib import Path
from datetime import datetime


# ── Configurações ─────────────────────────────────────────────────────────────

VAULT_RAW = Path("./raw/livros")

DOMINIOS_VALIDOS = [
    "psicologia", "copywriting", "negocios",
    "engenharia", "mercados", "frameworks",
]

IMPORTANCIA = {
    "psicologia": 8, "copywriting": 8, "negocios": 7,
    "engenharia": 7, "mercados": 6, "frameworks": 7,
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def slugify(texto: str) -> str:
    texto = unicodedata.normalize("NFKD", texto)
    texto = texto.encode("ascii", "ignore").decode("ascii")
    texto = re.sub(r"[^a-z0-9\s-]", "", texto.lower())
    return re.sub(r"[\s_]+", "-", texto.strip())


def detectar_dominio(titulo: str) -> str:
    t = titulo.lower()
    regras = {
        "psicologia":  ["psicolog", "influenc", "persuasao", "comportamento",
                        "cognitiv", "kahneman", "cialdini", "ariely", "hooked"],
        "copywriting": ["copy", "vendas", "oferta", "headline", "hormozi",
                        "schwartz", "ogilvy", "marketing", "conversao"],
        "negocios":    ["startup", "saas", "negoci", "lean", "produto",
                        "thiel", "ries", "fitzpatrick", "torres", "zero to one"],
        "engenharia":  ["software", "arquitetura", "api", "sistema", "codigo",
                        "backend", "database", "supabase"],
        "mercados":    ["mercado", "posicionamento", "concorrent", "pricing",
                        "dunford", "trout", "nicho"],
        "frameworks":  ["framework", "processo", "metodo", "playbook", "estrategia"],
    }
    for dominio, palavras in regras.items():
        if any(p in t for p in palavras):
            return dominio
    return "frameworks"


def gerar_frontmatter(titulo: str, autor: str, dominio: str, arquivo: str) -> str:
    hoje = datetime.now().strftime("%Y-%m-%d")
    return f"""---
title: "{titulo}"
aliases: []
type: livro
author: "{autor}"
year: ""
domain: {dominio}
importance: {IMPORTANCIA.get(dominio, 7)}
tags: []
pages_generated: []
source_file: "{arquivo}"
ingested: {hoje}
status: raw
---

# {titulo}

> ⚠️ Página gerada automaticamente. Complete os campos vazios após o ingest via Claude Code.

## Tese Central
*(preencher após leitura)*

## Por que é importante
*(preencher após leitura)*

## Conceitos gerados
*(o agente vai listar aqui após o ingest)*

## Limitações / Críticas
*(preencher após leitura)*

---
*Fonte original: `{arquivo}`*
"""


def limpar_markdown(texto: str) -> str:
    linhas = texto.split("\n")
    resultado, anterior = [], ""
    for linha in linhas:
        if re.match(r"^\s*\d{1,4}\s*$", linha):
            continue
        if linha.strip() == "" and anterior.strip() == "":
            continue
        if re.match(r"^[-_=]{3,}\s*$", linha):
            continue
        resultado.append(linha)
        anterior = linha
    return "\n".join(resultado)


# ── Conversor principal ───────────────────────────────────────────────────────

def converter_pdf(
    pdf_path: Path,
    output_dir: Path,
    autor: str = "",
    dominio: str = "",
    titulo_override: str = "",
    verbose: bool = True,
) -> Path:

    # Importa API correta da v1.x
    try:
        from marker.converters.pdf import PdfConverter
        from marker.models import create_model_dict
        from marker.output import text_from_rendered
    except ImportError as e:
        print(f"\n❌ Erro ao importar marker: {e}")
        print("   Execute: python -m pip install marker-pdf")
        sys.exit(1)

    nome_original = pdf_path.name
    titulo = titulo_override or pdf_path.stem.replace("-", " ").replace("_", " ").title()

    if not dominio:
        dominio = detectar_dominio(titulo)

    if verbose:
        print(f"\n📄 Convertendo: {nome_original}")
        print(f"   Título  : {titulo}")
        print(f"   Autor   : {autor or '(não informado)'}")
        print(f"   Domínio : {dominio}")
        print(f"   Destino : {output_dir}")
        print("   ⏳ Carregando modelos (aguarde na primeira vez)...")

    # Inicializa converter (v1.x API)
    converter = PdfConverter(artifact_dict=create_model_dict())

    if verbose:
        print("   ⚙️  Convertendo PDF...")

    rendered = converter(str(pdf_path))
    full_text, _, images = text_from_rendered(rendered)
    full_text = limpar_markdown(full_text)

    # Salva arquivos
    output_dir.mkdir(parents=True, exist_ok=True)
    slug = slugify(titulo)

    md_path = output_dir / f"{slug}.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(full_text)

    fonte_path = output_dir / f"{slug}--fonte.md"
    with open(fonte_path, "w", encoding="utf-8") as f:
        f.write(gerar_frontmatter(titulo, autor, dominio, nome_original))

    if images:
        assets_dir = output_dir / "assets" / slug
        assets_dir.mkdir(parents=True, exist_ok=True)
        for img_name, img_data in images.items():
            with open(assets_dir / img_name, "wb") as f:
                f.write(img_data if isinstance(img_data, bytes) else img_data.tobytes())
        if verbose:
            print(f"   🖼️  {len(images)} imagem(ns) salva(s) em assets/{slug}/")

    if verbose:
        kb = md_path.stat().st_size / 1024
        linhas = full_text.count("\n")
        print(f"\n   ✅ Concluído!")
        print(f"      Markdown : {md_path}")
        print(f"      Fonte    : {fonte_path}")
        print(f"      Tamanho  : {kb:.1f} KB | {linhas} linhas")

    return md_path


def converter_batch(pasta: Path, output_dir: Path,
                    dominio: str = "", verbose: bool = True) -> list:
    pdfs = sorted(pasta.glob("*.pdf"))
    if not pdfs:
        print(f"⚠️  Nenhum PDF encontrado em: {pasta}")
        return []

    print(f"\n📚 Batch — {len(pdfs)} PDF(s) encontrado(s) em {pasta}")
    resultados = []
    for i, pdf in enumerate(pdfs, 1):
        print(f"\n[{i}/{len(pdfs)}]", end="")
        md = converter_pdf(pdf, output_dir, dominio=dominio, verbose=verbose)
        resultados.append(md)

    print(f"\n\n✅ Batch concluído — {len(resultados)} arquivo(s) convertido(s)")
    return resultados


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Converte PDFs para Markdown (marker-pdf v1.x)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python convert.py influence.pdf --autor "Robert Cialdini" --dominio psicologia
  python convert.py "Psicologia & Comportamento/" --batch --dominio psicologia
  python convert.py influence.pdf --output "C:/vault/raw/livros"
        """,
    )
    parser.add_argument("entrada", help="Caminho do PDF ou pasta (com --batch)")
    parser.add_argument("--autor",   default="", help="Nome do autor")
    parser.add_argument("--dominio", choices=DOMINIOS_VALIDOS, default="",
                        help="Domínio do vault (detectado automaticamente se omitido)")
    parser.add_argument("--titulo",  default="", help="Título do livro")
    parser.add_argument("--output",  default=str(VAULT_RAW), help="Pasta de destino")
    parser.add_argument("--batch",   action="store_true",
                        help="Converte todos os PDFs da pasta")
    parser.add_argument("--quiet",   action="store_true", help="Menos output")

    args   = parser.parse_args()
    entrada = Path(args.entrada)
    output  = Path(args.output)
    verbose = not args.quiet

    if not entrada.exists():
        print(f"❌ Caminho não encontrado: {entrada}")
        sys.exit(1)

    if args.batch:
        if not entrada.is_dir():
            print("❌ --batch requer uma pasta como entrada")
            sys.exit(1)
        converter_batch(entrada, output, dominio=args.dominio, verbose=verbose)
    else:
        if entrada.suffix.lower() != ".pdf":
            print(f"❌ Arquivo não é um PDF: {entrada}")
            sys.exit(1)
        converter_pdf(entrada, output,
                      autor=args.autor,
                      dominio=args.dominio,
                      titulo_override=args.titulo,
                      verbose=verbose)


if __name__ == "__main__":
    main()
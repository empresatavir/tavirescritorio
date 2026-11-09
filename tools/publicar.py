#!/usr/bin/env python3
"""publicar.py — motor de publicação de documentos da agência.

Converte um .md APROVADO em HTML estilizado e depois em PDF, de forma
DETERMINÍSTICA (sem modelo de linguagem no meio — a política de modelos da casa
manda: o julgamento fica no conteúdo do .md; a diagramação é mecânica).

Fluxo:  .md  ──►  .html (tema por tipo de documento)  ──►  .pdf (navegador headless)

Uso:
    python tools/publicar.py <entrada.md> [opções]

Opções:
    --tipo <t>       proposta | contrato | requisito | relatorio | generico   (default: generico)
    --titulo "..."   título do <head> (default: 1º H1 do documento, senão o nome do arquivo)
    --out <dir>      pasta de saída (default: ao lado da entrada)
    --nome <base>    nome-base dos arquivos de saída (default: derivado da entrada)
    --publico        corta tudo a partir do marcador de conteúdo interno (ver abaixo) — versão p/ cliente
    --completo       força manter TODO o conteúdo (default; explícito p/ clareza)
    --so-html        gera só o HTML (não tenta o PDF)
    --logo <img>     caminho de uma imagem de logo p/ o topo (opcional)
    --marca tavir    aplica o sistema editorial oficial da TAVIR
    --logo-cliente   PNG local sanitizado para co-branding (somente com --marca tavir)
    --rotulo         etiqueta curta exibida acima do título no modo TAVIR

Marcador de conteúdo interno (para --publico): o corte acontece no primeiro
cabeçalho cujo texto casa com "anexo interno", "não enviar ao cliente" ou
"uso interno" (case-insensitive), OU num comentário HTML `<!-- CORTAR-PUBLICO -->`.
Assim o mesmo .md serve para a versão completa (interna) e a versão do cliente.

Saída: imprime um resumo (arquivos gerados, nº de páginas do PDF) e sai 0 em sucesso.
Requer `python -m pip install -r tools/requirements-publicar.txt` e um navegador Chromium
(Microsoft Edge ou Google Chrome) para o PDF.
"""
from __future__ import annotations

import argparse
import html as html_lib
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TAVIR_LOGO = ROOT / "TAVIR" / "brand-kit" / "logo" / "tavir-primary-transparent.png"
TAVIR_FONT_REGULAR = ROOT / ".agents" / "skills" / "ui-styling" / "canvas-fonts" / "InstrumentSans-Regular.ttf"
TAVIR_FONT_BOLD = ROOT / ".agents" / "skills" / "ui-styling" / "canvas-fonts" / "InstrumentSans-Bold.ttf"
TAVIR_MONO = ROOT / ".agents" / "skills" / "ui-styling" / "canvas-fonts" / "IBMPlexMono-Regular.ttf"

# ── Temas por tipo de documento (cor de destaque + rótulo) ───────────────────
TEMAS = {
    "proposta":  {"accent": "#0f766e", "accent2": "#115e59", "soft": "#f0fdfa", "bar": "#14b8a6"},
    "contrato":  {"accent": "#1e3a5f", "accent2": "#0f2942", "soft": "#eef2f7", "bar": "#3b82f6"},
    "requisito": {"accent": "#4338ca", "accent2": "#3730a3", "soft": "#eef2ff", "bar": "#6366f1"},
    "relatorio": {"accent": "#374151", "accent2": "#1f2937", "soft": "#f3f4f6", "bar": "#6b7280"},
    "generico":  {"accent": "#334155", "accent2": "#1e293b", "soft": "#f1f5f9", "bar": "#64748b"},
}

CORTE_RE = re.compile(r"(anexo\s+interno|n[ãa]o\s+enviar\s+ao\s+cliente|uso\s+interno)", re.I)
COMENTARIO_CORTE = "<!-- CORTAR-PUBLICO -->"


def cortar_interno(md: str) -> tuple[str, bool]:
    """Remove tudo a partir do 1º marcador de conteúdo interno. Retorna (md, cortou?)."""
    linhas = md.splitlines()
    for i, ln in enumerate(linhas):
        if COMENTARIO_CORTE in ln:
            return "\n".join(linhas[:i]).rstrip() + "\n", True
        if ln.lstrip().startswith("#") and CORTE_RE.search(ln):
            return "\n".join(linhas[:i]).rstrip() + "\n", True
    return md, False


def primeiro_h1(md: str) -> str | None:
    for ln in md.splitlines():
        m = re.match(r"#\s+(.+)", ln.strip())
        if m:
            return m.group(1).strip()
    return None


def _asset_uri(path: Path | None, *, somente_png: bool = False) -> str:
    """Aceita somente arquivo local regular; PNG de cliente recebe validação mínima de estrutura."""
    if path is None:
        return ""
    if path.is_symlink():
        raise ValueError("asset_local_invalido")
    path = path.resolve()
    if not path.is_file() or path.stat().st_size <= 0:
        raise ValueError("asset_local_invalido")
    if somente_png:
        if path.stat().st_size > 2 * 1024 * 1024:
            raise ValueError("logo_cliente_acima_do_limite")
        header = path.read_bytes()[:24]
        if (len(header) < 24 or header[:8] != b"\x89PNG\r\n\x1a\n" or
                header[12:16] != b"IHDR"):
            raise ValueError("logo_cliente_nao_e_png_sanitizado")
        width = int.from_bytes(header[16:20], "big")
        height = int.from_bytes(header[20:24], "big")
        if not (24 <= width <= 2048 and 24 <= height <= 2048):
            raise ValueError("logo_cliente_dimensoes_invalidas")
        try:
            from PIL import Image, UnidentifiedImageError  # noqa: PLC0415
        except ImportError as exc:
            raise ValueError("pillow_ausente_para_validar_logo") from exc
        try:
            with Image.open(path) as image:
                image.verify()
        except (OSError, SyntaxError, UnidentifiedImageError) as exc:
            raise ValueError("logo_cliente_png_corrompido") from exc
    return path.as_uri()


def _tavir_font_faces() -> str:
    fontes = []
    for family, path, weight in (
        ("Instrument Sans", TAVIR_FONT_REGULAR, 400),
        ("Instrument Sans", TAVIR_FONT_BOLD, 700),
        ("IBM Plex Mono", TAVIR_MONO, 400),
    ):
        if path.is_file() and not path.is_symlink():
            fontes.append(
                f'@font-face {{ font-family: "{family}"; src: url("{path.resolve().as_uri()}") '
                f'format("truetype"); font-weight: {weight}; font-style: normal; }}'
            )
    return "\n".join(fontes)


def extrair_metadados_formais(md: str) -> tuple[str, list[tuple[str, str]]]:
    """Extrai o bloco citado logo após o H1 para uma ficha formal de primeira página."""
    linhas = md.splitlines()
    h1 = next((i for i, linha in enumerate(linhas) if re.match(r"^#\s+", linha.strip())), -1)
    if h1 < 0:
        return md, []
    inicio = h1 + 1
    while inicio < len(linhas) and not linhas[inicio].strip():
        inicio += 1
    fim = inicio
    metadados: list[tuple[str, str]] = []
    padrao = re.compile(r"^>\s*\*\*([^*:\r\n]{1,48}):\*\*\s*(.{1,400}?)\s{0,2}$")
    while fim < len(linhas) and linhas[fim].lstrip().startswith(">"):
        match = padrao.match(linhas[fim].strip())
        if match:
            chave = re.sub(r"[`*_]+", "", match.group(1)).strip()
            valor = re.sub(r"[`*_]+", "", match.group(2)).strip()
            if chave and valor and len(metadados) < 9:
                metadados.append((chave, valor))
        fim += 1
    if not metadados:
        return md, []
    restante = linhas[:inicio] + linhas[fim:]
    return "\n".join(restante).strip() + "\n", metadados


def md_para_html(md: str, titulo: str, tema: dict, logo: Path | None, *,
                 marca: str = "", logo_cliente: Path | None = None,
                 rotulo: str = "") -> str:
    try:
        import markdown  # noqa: PLC0415
    except ImportError:
        sys.exit("ERRO: pacote 'markdown' ausente. Instale com: pip install markdown")
    metadados: list[tuple[str, str]] = []
    if marca == "tavir":
        md, metadados = extrair_metadados_formais(md)
    # Documentos podem conter texto vindo de IA/fontes externas. Raw HTML e imagens Markdown
    # são removidos antes do navegador local para impedir script e leitura de arquivo via file://.
    md_sem_imagens = re.sub(r"!\[([^\]]*)\]\([^\r\n)]*\)", r"\1", md)
    md_seguro = html_lib.escape(md_sem_imagens, quote=False)
    corpo = markdown.markdown(md_seguro, extensions=["tables", "sane_lists", "fenced_code"])
    if marca == "tavir":
        tavir_uri = html_lib.escape(_asset_uri(TAVIR_LOGO), quote=True)
        cliente_uri = html_lib.escape(_asset_uri(logo_cliente, somente_png=True), quote=True) \
            if logo_cliente else ""
        cliente_html = (
            '<div class="client-lockup"><span>EMPRESA ANALISADA</span>'
            '<div class="client-logo-frame">'
            f'<img src="{cliente_uri}" alt="Identidade da empresa analisada"></div></div>'
            if cliente_uri else '<div class="client-lockup client-lockup--text"><span>ANÁLISE SOB MEDIDA</span></div>'
        )
        rotulo_seguro = html_lib.escape(rotulo or "RAIO-X DE CRESCIMENTO")
        metadados_html = "".join(
            '<div class="meta-item">'
            f'<span>{html_lib.escape(chave)}</span><strong>{html_lib.escape(valor)}</strong></div>'
            for chave, valor in metadados
        )
        ficha_html = f'<section class="document-meta">{metadados_html}</section>' if metadados_html else ""
        cabecalho = (
            '<header class="tavir-hero"><div class="tavir-brand"><div class="tavir-logo-frame">'
            f'<img src="{tavir_uri}" alt="TAVIR"></div><span>INTELIGÊNCIA QUE ENTRA EM OPERAÇÃO.</span>'
            f'</div>{cliente_html}</header><div class="document-kicker">'
            f'<span class="document-label">{rotulo_seguro}</span><span>DOCUMENTO CONFIDENCIAL</span>'
            f'</div>{ficha_html}'
        )
        corpo_html = f'{cabecalho}<main class="tavir-content">{corpo}</main>'
        css = _css_tavir()
    else:
        logo_html = ""
        if logo:
            logo_uri = html_lib.escape(_asset_uri(logo), quote=True)
            logo_html = f'<img class="logo" src="{logo_uri}" alt="logo">'
        corpo_html = f"{logo_html}{corpo}"
        css = _css(tema)
    return (
        f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
        f"<title>{html_lib.escape(titulo)}</title><style>{css}</style></head>"
        f"<body>{corpo_html}</body></html>"
    )


def _css(t: dict) -> str:
    return f"""
@page {{ size: A4; margin: 18mm 16mm; }}
* {{ box-sizing: border-box; }}
body {{ font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1f2937;
  font-size: 10.5pt; line-height: 1.5; max-width: 800px; margin: 0 auto; }}
.logo {{ max-height: 54px; margin: 0 0 10px; }}
h1 {{ font-size: 20pt; color: {t['accent']}; border-bottom: 3px solid {t['accent']};
  padding-bottom: 8px; margin: 0 0 4px; }}
h2 {{ font-size: 13pt; color: {t['accent']}; margin-top: 22px; border-bottom: 1px solid #d1d5db;
  padding-bottom: 4px; page-break-after: avoid; }}
h3 {{ font-size: 11pt; color: {t['accent2']}; margin-top: 14px; page-break-after: avoid; }}
table {{ border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 9.5pt;
  page-break-inside: avoid; }}
th, td {{ border: 1px solid #d1d5db; padding: 6px 9px; text-align: left; vertical-align: top; }}
th {{ background: {t['soft']}; color: {t['accent']}; font-weight: 600; }}
tr:nth-child(even) td {{ background: #fafafa; }}
blockquote {{ border-left: 4px solid {t['bar']}; background: {t['soft']}; margin: 10px 0;
  padding: 8px 14px; color: #334155; font-size: 9.8pt; }}
strong {{ color: #0f172a; }}
hr {{ border: none; border-top: 1px solid #e5e7eb; margin: 18px 0; }}
ul {{ margin: 6px 0; padding-left: 20px; }}
li {{ margin: 3px 0; }}
code {{ background: #f1f5f9; padding: 1px 5px; border-radius: 3px; font-size: 9pt; }}
h1 + table td {{ border: none; padding: 2px 8px; }}
"""


def _css_tavir() -> str:
    return _tavir_font_faces() + r"""
@page { size: A4; margin: 14mm 16mm 20mm; }
@page :first { margin-top: 8mm; }
* { box-sizing: border-box; }
html { background: #F4F6F2; }
body { margin: 0 auto; color: #0B1220; background: #F4F6F2;
  font-family: "Instrument Sans", Arial, sans-serif; font-size: 10.4pt; line-height: 1.55;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.tavir-hero { margin: 0 0 5mm; padding: 5mm 7mm; min-height: 38mm;
  display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10mm;
  background: #0B1220; border-bottom: 2mm solid #B7F34A; break-inside: avoid-page; }
.tavir-brand { display: grid; grid-template-columns: 42mm minmax(0, 34mm); align-items: center;
  justify-items: start; gap: 5mm; min-width: 0; }
.tavir-logo-frame { width: 42mm; height: 27mm; padding: 2mm; display: flex;
  align-items: center; justify-content: center; overflow: visible; }
.tavir-brand img { display: block; width: 100%; height: 100%; object-fit: contain;
  object-position: center; }
.tavir-brand span { max-width: 34mm; color: #F4F6F2; font-family: "IBM Plex Mono", monospace;
  font-size: 6.2pt; line-height: 1.45; letter-spacing: .1em; }
.client-lockup { flex: 0 0 auto; display: flex; align-items: center; gap: 4mm; color: #F4F6F2; }
.client-lockup span { max-width: 19mm; text-align: right; font-family: "IBM Plex Mono", monospace;
  font-size: 6.4pt; line-height: 1.35; letter-spacing: .08em; }
.client-logo-frame { width: 27mm; height: 27mm; padding: 2mm; display: flex;
  align-items: center; justify-content: center; overflow: visible; background: #FFFFFF;
  border: .5mm solid #F4F6F2; border-radius: 2mm; }
.client-lockup img { display: block; width: 100%; height: 100%; object-fit: contain;
  object-position: center; border-radius: 0; }
.client-lockup--text { min-height: 27mm; padding-left: 6mm; border-left: .4mm solid #5E6878; }
.client-lockup--text span { max-width: 28mm; }
.document-kicker { display: flex; justify-content: space-between; align-items: center; margin: 0 0 3mm;
  color: #5E6878; font-family: "IBM Plex Mono", monospace; font-size: 6.5pt; letter-spacing: .1em; }
.document-label { color: #0B1220; font-size: 7.2pt; letter-spacing: .12em; }
.document-meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0 0 7mm;
  border-top: .55mm solid #0B1220; border-bottom: .3mm solid #CBD2CA; background: #EAF2EC;
  break-inside: avoid-page; }
.meta-item { min-height: 16mm; padding: 3mm 3.4mm; border-right: .25mm solid #CBD2CA;
  border-bottom: .25mm solid #CBD2CA; }
.meta-item:nth-child(3n) { border-right: 0; }
.meta-item span { display: block; margin-bottom: 1.2mm; color: #5E6878;
  font-family: "IBM Plex Mono", monospace; font-size: 6.3pt; line-height: 1.2;
  letter-spacing: .08em; text-transform: uppercase; }
.meta-item strong { display: block; color: #0B1220; font-size: 8.8pt; line-height: 1.3;
  overflow-wrap: anywhere; }
.tavir-content { padding-bottom: 3mm; }
.tavir-content h1 { margin: 0 0 7mm; max-width: 165mm; color: #0B1220; font-size: 24pt;
  line-height: 1.08; letter-spacing: -.025em; font-weight: 700; }
.tavir-content h1::after { content: ""; display: block; width: 17mm; height: 1.6mm;
  margin-top: 4mm; background: #B7F34A; }
.tavir-content h2 { margin: 8mm 0 3mm; padding-top: 1.5mm; color: #0B1220; font-size: 14pt;
  line-height: 1.2; border-top: .45mm solid #1BC5BD; break-after: avoid-page; }
.tavir-content h3 { margin: 5.5mm 0 2.2mm; color: #0B1220; font-size: 11.3pt;
  line-height: 1.3; break-after: avoid-page; }
.tavir-content p { margin: 0 0 3.2mm; orphans: 3; widows: 3; }
.tavir-content strong { color: #0B1220; font-weight: 700; }
.tavir-content ul, .tavir-content ol { margin: 2.5mm 0 4mm; padding-left: 6mm; }
.tavir-content li { margin: 1.1mm 0; padding-left: 1mm; }
.tavir-content li::marker { color: #1BC5BD; font-weight: 700; }
.tavir-content blockquote { margin: 4mm 0; padding: 4mm 5mm; color: #0B1220;
  background: #EAF2EC; border-left: 1.5mm solid #1BC5BD; break-inside: avoid-page; }
.tavir-content table { width: 100%; margin: 4mm 0 6mm; border-collapse: separate;
  border-spacing: 0; font-size: 8.6pt; line-height: 1.42; break-inside: avoid-page; }
.tavir-content th, .tavir-content td { padding: 2.6mm 3mm; text-align: left; vertical-align: top;
  border-right: .25mm solid #CBD2CA; border-bottom: .25mm solid #CBD2CA; }
.tavir-content th:first-child, .tavir-content td:first-child { border-left: .25mm solid #CBD2CA; }
.tavir-content thead th { color: #F4F6F2; background: #0B1220; border-color: #334052;
  font-weight: 700; }
.tavir-content thead th:first-child { border-top-left-radius: 1.8mm; }
.tavir-content thead th:last-child { border-top-right-radius: 1.8mm; }
.tavir-content tbody tr:nth-child(even) td { background: #EDF0EB; }
.tavir-content code { padding: .35mm 1.2mm; color: #0B1220; background: #E4E9E2;
  font-family: "IBM Plex Mono", monospace; font-size: 8.4pt; border-radius: .8mm; }
.tavir-content pre { padding: 4mm; color: #F4F6F2; background: #0B1220; border-radius: 2mm;
  white-space: pre-wrap; break-inside: avoid-page; }
.tavir-content pre code { padding: 0; color: inherit; background: transparent; }
.tavir-content hr { margin: 7mm 0; border: 0; border-top: .4mm solid #CBD2CA; }
"""


def numerar_paginas_tavir(pdf_path: Path) -> str | None:
    """Carimba paginação discreta depois do Chromium, sem habilitar cabeçalhos com URL local."""
    try:
        import pymupdf  # noqa: PLC0415
    except ImportError:
        return "pacote PyMuPDF ausente para paginação TAVIR"
    temporary = pdf_path.with_suffix(".numbered.tmp.pdf")
    try:
        document = pymupdf.open(pdf_path)
        total = len(document)
        for index, page in enumerate(document, start=1):
            rect = page.rect
            footer_y = rect.height - 35
            page.draw_line((45, footer_y), (rect.width - 45, footer_y),
                           color=(203 / 255, 210 / 255, 202 / 255), width=.65)
            page.insert_textbox(
                pymupdf.Rect(45, footer_y + 5, 250, rect.height - 17),
                "TAVIR  ·  DOCUMENTO CONFIDENCIAL", fontsize=6.5, fontname="helv",
                color=(94 / 255, 104 / 255, 120 / 255), align=0,
            )
            box = pymupdf.Rect(rect.width - 120, footer_y + 5, rect.width - 45, rect.height - 17)
            page.insert_textbox(box, f"{index:02d} / {total:02d}", fontsize=7,
                                fontname="helv", color=(94 / 255, 104 / 255, 120 / 255), align=2)
        document.save(temporary, garbage=4, deflate=True)
        document.close()
        os.replace(temporary, pdf_path)
        return None
    except (OSError, RuntimeError, ValueError) as exc:
        temporary.unlink(missing_ok=True)
        return f"paginação TAVIR falhou ({type(exc).__name__})"


def achar_navegadores() -> list[str]:
    """Localiza Chromiums para o print-to-pdf, preservando alternativas de fallback."""
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    candidatos = [
        str(Path(local_app_data) / "Google" / "Chrome" / "Application" / "chrome.exe") if local_app_data else "",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]
    encontrados = []
    for c in candidatos:
        if c and Path(c).exists() and c not in encontrados:
            encontrados.append(c)
    for nome in ("msedge", "google-chrome", "chromium", "chromium-browser", "chrome"):
        p = shutil.which(nome)
        if p and p not in encontrados:
            encontrados.append(p)
    return encontrados


def html_para_pdf(html_path: Path, pdf_path: Path) -> str | None:
    """Renderiza o PDF via navegador headless. Retorna None em sucesso, ou msg de erro."""
    navegadores = achar_navegadores()
    if not navegadores:
        return ("nenhum navegador Chromium encontrado (Edge/Chrome) para gerar o PDF — "
                "o HTML foi gerado; abra-o e use Ctrl+P → Salvar como PDF")
    # SEMPRE caminho absoluto: o --headless=new resolve --print-to-pdf relativo em relação
    # ao diretório do perfil, não ao cwd — com caminho relativo o PDF sai noutro lugar e a
    # verificação abaixo falha.
    pdf_abs = pdf_path.resolve()
    falhas = []
    for navegador in navegadores:
        pdf_abs.unlink(missing_ok=True)
        with tempfile.TemporaryDirectory() as tmp:
            # --headless=new imprime de forma SÍNCRONA. Um perfil efêmero evita encaminhar a
            # execução à janela interativa já aberta e o fallback cobre políticas por navegador.
            cmd = [navegador, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                   "--no-first-run", "--no-default-browser-check", f"--user-data-dir={tmp}",
                   f"--print-to-pdf={pdf_abs}", html_path.resolve().as_uri()]
            try:
                process = subprocess.run(cmd, capture_output=True, timeout=90, check=False)
                if process.returncode != 0:
                    falhas.append(f"{Path(navegador).name}: código {process.returncode}")
            except (subprocess.TimeoutExpired, OSError) as exc:
                falhas.append(f"{Path(navegador).name}: {type(exc).__name__}")
        if pdf_abs.exists() and pdf_abs.stat().st_size >= 500:
            return None
    return "nenhum navegador produziu um PDF válido (" + "; ".join(falhas) + ")"


def contar_paginas(pdf: Path) -> int:
    d = pdf.read_bytes()
    if not d.startswith(b"%PDF"):
        return 0
    return len(re.findall(rb"/Type\s*/Page[^s]", d)) or d.count(b"/Page")


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="Publica um .md aprovado em HTML + PDF.")
    ap.add_argument("entrada", help="arquivo .md de origem")
    ap.add_argument("--tipo", default="generico", choices=sorted(TEMAS))
    ap.add_argument("--titulo", default=None)
    ap.add_argument("--out", default=None, help="pasta de saída")
    ap.add_argument("--nome", default=None, help="nome-base dos arquivos de saída")
    ap.add_argument("--publico", action="store_true", help="corta o conteúdo interno")
    ap.add_argument("--completo", action="store_true", help="mantém todo o conteúdo (default)")
    ap.add_argument("--so-html", action="store_true", help="não gera PDF")
    ap.add_argument("--logo", default=None, help="imagem de logo p/ o topo")
    ap.add_argument("--marca", choices=("tavir",), default=None, help="sistema editorial de marca")
    ap.add_argument("--logo-cliente", default=None, help="PNG local sanitizado para co-branding")
    ap.add_argument("--rotulo", default=None, help="etiqueta curta do documento no modo de marca")
    a = ap.parse_args(argv)

    entrada = Path(a.entrada)
    if not entrada.exists():
        print(f"ERRO: entrada não encontrada: {entrada}", file=sys.stderr)
        return 1
    md = entrada.read_text(encoding="utf-8")

    cortou = False
    if a.publico and not a.completo:
        md, cortou = cortar_interno(md)
        if not cortou:
            print("AVISO: --publico pedido, mas nenhum marcador de conteúdo interno "
                  "encontrado (nada foi cortado).", file=sys.stderr)

    titulo = a.titulo or primeiro_h1(md) or entrada.stem
    tema = TEMAS[a.tipo]
    logo = Path(a.logo) if a.logo else None
    logo_cliente = Path(a.logo_cliente) if a.logo_cliente else None

    out_dir = Path(a.out) if a.out else entrada.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    base = a.nome or entrada.stem
    html_path = out_dir / f"{base}.html"
    pdf_path = out_dir / f"{base}.pdf"

    try:
        html = md_para_html(md, titulo, tema, logo, marca=a.marca or "",
                           logo_cliente=logo_cliente, rotulo=a.rotulo or "")
    except ValueError as exc:
        print(f"ERRO: asset de marca inválido ({exc})", file=sys.stderr)
        return 1
    html_path.write_text(html, encoding="utf-8", newline="\n")

    print(f"tipo:    {a.tipo}")
    print(f"título:  {titulo}")
    if a.publico:
        print(f"público: {'anexo interno cortado' if cortou else 'sem corte (marcador não achado)'}")
    print(f"HTML:    {html_path}")

    if a.so_html:
        return 0

    erro = html_para_pdf(html_path, pdf_path)
    if erro:
        print(f"PDF:     — ({erro})", file=sys.stderr)
        return 2
    if a.marca == "tavir":
        erro = numerar_paginas_tavir(pdf_path)
        if erro:
            print(f"PDF:     — ({erro})", file=sys.stderr)
            return 2
    paginas = contar_paginas(pdf_path)
    print(f"PDF:     {pdf_path}  ({paginas} página(s), {pdf_path.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

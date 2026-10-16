#!/usr/bin/env python3
"""Rastreia páginas públicas renderizadas, sem interação mutável."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import deque
from datetime import datetime
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser

from bs4 import BeautifulSoup
from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

USER_AGENT = "AtlasWebAudit/1.0 (+auditoria autorizada; leitura apenas)"
UNSAFE_PATHS = re.compile(r"/(logout|signout|logoff|delete-account|unsubscribe)(?:/|$)", re.I)


def validate_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("use uma URL http(s) completa")
    if parsed.username or parsed.password:
        raise ValueError("não inclua credenciais na URL")
    return normalize_url(value, keep_query=True)


def safe_slug(url: str, requested: str | None) -> str:
    value = requested or urlparse(url).hostname or "site"
    value = value.removeprefix("www.")
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return (value or "site")[:80]


def normalize_url(value: str, keep_query: bool) -> str:
    parsed = urlparse(value)
    query = urlencode(sorted(parse_qsl(parsed.query, keep_blank_values=True))) if keep_query else ""
    path = parsed.path or "/"
    return urlunparse((parsed.scheme.lower(), parsed.netloc.lower(), path, "", query, ""))


def same_host(candidate: str, start: str) -> bool:
    candidate_parsed = urlparse(candidate)
    start_parsed = urlparse(start)
    candidate_host = (candidate_parsed.hostname or "").lower().removeprefix("www.")
    start_host = (start_parsed.hostname or "").lower().removeprefix("www.")
    if candidate_host != start_host:
        return False
    if candidate_parsed.port is not None or start_parsed.port is not None:
        return candidate_parsed.port == start_parsed.port
    return True


def safe_candidate(candidate: str, start: str, include_query: bool) -> str | None:
    absolute = urljoin(start, candidate)
    parsed = urlparse(absolute)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or not same_host(absolute, start):
        return None
    if parsed.username or parsed.password or UNSAFE_PATHS.search(parsed.path):
        return None
    if parsed.query and not include_query:
        return None
    return normalize_url(absolute, keep_query=include_query)


def robots_policy(start_url: str) -> tuple[RobotFileParser | None, dict]:
    parsed = urlparse(start_url)
    robots_url = urlunparse((parsed.scheme, parsed.netloc, "/robots.txt", "", "", ""))
    status = {"url": robots_url, "available": False, "error": None}
    try:
        request = Request(robots_url, headers={"User-Agent": USER_AGENT})
        with urlopen(request, timeout=8) as response:
            body = response.read(1_000_000).decode("utf-8", errors="replace")
        parser = RobotFileParser()
        parser.set_url(robots_url)
        parser.parse(body.splitlines())
        status["available"] = True
        return parser, status
    except Exception as exc:  # disponibilidade de robots varia por site
        status["error"] = f"{type(exc).__name__}: {exc}"
        return None, status


def cleaned_text(soup: BeautifulSoup) -> str:
    clone = BeautifulSoup(str(soup), "html.parser")
    for tag in clone.select("script, style, noscript, svg, template"):
        tag.decompose()
    body = clone.body or clone
    lines = [re.sub(r"\s+", " ", line).strip() for line in body.get_text("\n").splitlines()]
    return "\n".join(line for line in lines if line)


def compact(value: str | None, limit: int = 500) -> str:
    return re.sub(r"\s+", " ", value or "").strip()[:limit]


def parse_document(html: str, page) -> tuple[dict, list[str], str]:
    soup = BeautifulSoup(html, "html.parser")
    text = cleaned_text(soup)
    meta = {}
    for tag in soup.find_all("meta"):
        key = tag.get("name") or tag.get("property") or tag.get("http-equiv")
        if key and tag.get("content"):
            meta[str(key).lower()] = compact(str(tag.get("content")), 1000)

    headings = [
        {"level": int(tag.name[1]), "text": compact(tag.get_text(" "), 300)}
        for tag in soup.select("h1, h2, h3, h4, h5, h6")
        if compact(tag.get_text(" "))
    ]
    links = []
    discovered = []
    for tag in soup.find_all("a", href=True):
        href = urljoin(page.url, str(tag.get("href")))
        links.append({"url": href, "text": compact(tag.get_text(" "), 200)})
        discovered.append(href)

    images = [
        {
            "src": urljoin(page.url, str(tag.get("src") or tag.get("data-src") or "")),
            "alt": compact(str(tag.get("alt") or ""), 300),
        }
        for tag in soup.find_all("img")
    ]
    forms = []
    for form in soup.find_all("form"):
        controls = []
        for control in form.select("input, select, textarea"):
            controls.append(
                {
                    "tag": control.name,
                    "type": str(control.get("type") or ""),
                    "name": str(control.get("name") or ""),
                    "autocomplete": str(control.get("autocomplete") or ""),
                    "required": control.has_attr("required"),
                    "label": compact(str(control.get("aria-label") or control.get("placeholder") or ""), 200),
                }
            )
        forms.append(
            {
                "method": str(form.get("method") or "get").lower(),
                "action": urljoin(page.url, str(form.get("action") or page.url)),
                "controls": controls,
                "buttons": [compact(b.get_text(" "), 200) for b in form.select("button, input[type=submit]")],
            }
        )

    jsonld_types = []
    for tag in soup.select('script[type="application/ld+json"]'):
        try:
            payload = json.loads(tag.string or "")
            items = payload if isinstance(payload, list) else [payload]
            for item in items:
                if isinstance(item, dict) and item.get("@type"):
                    jsonld_types.append(item["@type"])
        except (json.JSONDecodeError, TypeError):
            continue

    computed = page.evaluate(
        """() => {
          const pick = (selector) => {
            const el = document.querySelector(selector);
            if (!el) return null;
            const s = getComputedStyle(el);
            return {selector, fontFamily:s.fontFamily, fontSize:s.fontSize,
              fontWeight:s.fontWeight, lineHeight:s.lineHeight, color:s.color,
              backgroundColor:s.backgroundColor, borderRadius:s.borderRadius,
              padding:s.padding, boxShadow:s.boxShadow};
          };
          const root = getComputedStyle(document.documentElement);
          const vars = {};
          for (const key of root) {
            if (key.startsWith('--') && Object.keys(vars).length < 150) {
              const value = root.getPropertyValue(key).trim();
              if (value) vars[key] = value;
            }
          }
          const nav = performance.getEntriesByType('navigation')[0];
          return {
            samples: ['body','h1','h2','p','a','button','input'].map(pick).filter(Boolean),
            cssVariables: vars,
            viewport: {width: innerWidth, height: innerHeight},
            timing: nav ? {domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
              loadMs: Math.round(nav.loadEventEnd), transferSize: nav.transferSize || null} : null
          };
        }"""
    )

    lower_html = html.lower()
    technologies = []
    signatures = {
        "WordPress": ["wp-content", "wp-includes"],
        "Shopify": ["cdn.shopify.com", "shopify-section"],
        "Next.js": ["/_next/", "__next_data__"],
        "Nuxt": ["/_nuxt/", "__nuxt__"],
        "Webflow": ["webflow.css", "data-wf-page"],
        "Wix": ["wixstatic.com", "wix-code"],
        "Elementor": ["elementor-"],
        "Google Tag Manager": ["googletagmanager.com"],
    }
    for technology, needles in signatures.items():
        if any(needle in lower_html for needle in needles):
            technologies.append(technology)
    generator = meta.get("generator")
    if generator:
        technologies.append(f"Generator: {generator}")

    canonical = soup.find("link", rel=lambda value: value and "canonical" in value)
    stylesheet_urls = [urljoin(page.url, str(tag.get("href"))) for tag in soup.select('link[rel~="stylesheet"][href]')]
    script_urls = [urljoin(page.url, str(tag.get("src"))) for tag in soup.select("script[src]")]
    landmarks = {name: len(soup.select(name)) for name in ("header", "nav", "main", "aside", "footer")}
    missing_alt = sum(1 for image in images if not image["alt"])
    unlabeled = sum(
        1
        for form in forms
        for control in form["controls"]
        if control["type"] not in {"hidden", "submit", "button"} and not control["label"]
    )

    result = {
        "url": page.url,
        "title": page.title(),
        "language": str((soup.html or {}).get("lang", "")) if soup.html else "",
        "meta": meta,
        "canonical": urljoin(page.url, str(canonical.get("href"))) if canonical else None,
        "headings": headings,
        "links": links[:500],
        "images": images[:500],
        "forms": forms,
        "buttons": [compact(tag.get_text(" "), 200) for tag in soup.select("button")][:200],
        "landmarks": landmarks,
        "jsonld_types": jsonld_types,
        "stylesheets": stylesheet_urls[:100],
        "scripts": script_urls[:100],
        "computed_style": computed,
        "technology_signals": sorted(set(technologies)),
        "basic_checks": {
            "h1_count": sum(1 for h in headings if h["level"] == 1),
            "title_length": len(page.title()),
            "meta_description_length": len(meta.get("description", "")),
            "images_missing_alt": missing_alt,
            "controls_without_simple_label_signal": unlabeled,
            "html_language_missing": not bool(soup.html and soup.html.get("lang")),
        },
        "text_chars": len(text),
        "text_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
    }
    return result, discovered, text


def page_name(index: int, url: str) -> str:
    parsed = urlparse(url)
    hint = parsed.path.strip("/").split("/")[-1] or "home"
    hint = re.sub(r"[^a-z0-9]+", "-", hint.lower()).strip("-")[:40] or "pagina"
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:8]
    return f"{index:03d}-{hint}-{digest}"


def screenshot(page, path: Path, project: Path) -> str | None:
    try:
        page.screenshot(path=str(path), full_page=True, animations="disabled")
        return str(path.relative_to(project))
    except PlaywrightError:
        try:
            page.screenshot(path=str(path), full_page=False, animations="disabled")
            return str(path.relative_to(project))
        except PlaywrightError as exc:
            return f"ERRO: {type(exc).__name__}: {exc}"


def ensure_project(repo_root: Path, url: str, slug: str | None, output_root: Path | None) -> Path:
    root = (output_root or repo_root / "analise-web" / "projetos").resolve()
    project = root / safe_slug(url, slug)
    for relative in ("coleta/publico/pages", "screenshots/desktop", "screenshots/mobile", "processado", "relatorios", "controle"):
        (project / relative).mkdir(parents=True, exist_ok=True)
    manifest_path = project / "controle" / "manifesto.json"
    if not manifest_path.exists():
        manifest_path.write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "project_slug": project.name,
                    "requested_url": url,
                    "created_at": datetime.now().astimezone().isoformat(),
                    "requested_mode": "public",
                    "runs": [],
                    "authenticated_pages": [],
                    "journeys": [],
                    "limitations": [],
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
    return project


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    parser.add_argument("--slug")
    parser.add_argument("--output-root", type=Path)
    parser.add_argument("--max-pages", type=int, default=30)
    parser.add_argument("--max-depth", type=int, default=2)
    parser.add_argument("--screenshot-pages", type=int, default=8)
    parser.add_argument("--include-query", action="store_true")
    parser.add_argument("--timeout-ms", type=int, default=30000)
    parser.add_argument("--browser-channel", default="chrome", choices=["chrome", "chromium"])
    args = parser.parse_args()
    if not 1 <= args.max_pages <= 100:
        parser.error("--max-pages deve ficar entre 1 e 100")
    if not 0 <= args.max_depth <= 8:
        parser.error("--max-depth deve ficar entre 0 e 8")

    start_url = validate_url(args.url)
    repo_root = Path(__file__).resolve().parents[4]
    project = ensure_project(repo_root, start_url, args.slug, args.output_root)
    pages_dir = project / "coleta" / "publico" / "pages"
    desktop_dir = project / "screenshots" / "desktop"
    mobile_dir = project / "screenshots" / "mobile"
    manifest_path = project / "controle" / "manifesto.json"
    robots, robots_status = robots_policy(start_url)
    queue = deque([(start_url, 0, None)])
    queued = {start_url}
    visited: set[str] = set()
    records = []
    errors = []
    blocked = []

    with sync_playwright() as playwright:
        try:
            if args.browser_channel == "chrome":
                browser = playwright.chromium.launch(channel="chrome", headless=True)
            else:
                browser = playwright.chromium.launch(headless=True)
        except PlaywrightError as exc:
            raise SystemExit(
                "Não foi possível abrir o navegador. Rode setup_environment.py --with-chromium "
                "e repita com --browser-channel chromium. Detalhe: " + str(exc)
            ) from exc

        desktop = browser.new_context(viewport={"width": 1440, "height": 1000}, user_agent=USER_AGENT)
        mobile = browser.new_context(
            viewport={"width": 390, "height": 844},
            screen={"width": 390, "height": 844},
            is_mobile=True,
            device_scale_factor=1,
            user_agent=USER_AGENT,
        )
        page = desktop.new_page()
        mobile_page = mobile.new_page()

        while queue and len(records) < args.max_pages:
            requested_url, depth, referrer = queue.popleft()
            if requested_url in visited:
                continue
            visited.add(requested_url)
            if robots and not robots.can_fetch(USER_AGENT, requested_url):
                blocked.append(requested_url)
                continue
            index = len(records) + 1
            name = page_name(index, requested_url)
            try:
                response = page.goto(requested_url, wait_until="domcontentloaded", timeout=args.timeout_ms)
                page.wait_for_timeout(600)
                final_url = normalize_url(page.url, keep_query=args.include_query)
                if not same_host(final_url, start_url):
                    errors.append({"url": requested_url, "error": "redirecionamento para outro host", "final_url": final_url})
                    continue
                html = page.content()
                extracted, links, text = parse_document(html, page)
                extracted.update(
                    {
                        "requested_url": requested_url,
                        "final_url": final_url,
                        "referrer": referrer,
                        "depth": depth,
                        "status": response.status if response else None,
                        "captured_at": datetime.now().astimezone().isoformat(),
                    }
                )
                desktop_shot = None
                mobile_shot = None
                if index <= args.screenshot_pages:
                    desktop_shot = screenshot(page, desktop_dir / f"{name}.png", project)
                    try:
                        mobile_page.goto(final_url, wait_until="domcontentloaded", timeout=args.timeout_ms)
                        mobile_page.wait_for_timeout(400)
                        mobile_shot = screenshot(mobile_page, mobile_dir / f"{name}.png", project)
                    except (PlaywrightError, PlaywrightTimeoutError) as exc:
                        mobile_shot = f"ERRO: {type(exc).__name__}: {exc}"
                extracted["screenshots"] = {"desktop": desktop_shot, "mobile": mobile_shot}
                json_path = pages_dir / f"{name}.json"
                text_path = pages_dir / f"{name}-texto.md"
                json_path.write_text(json.dumps(extracted, ensure_ascii=False, indent=2), encoding="utf-8")
                text_path.write_text(f"# {extracted['title'] or final_url}\n\n- URL: {final_url}\n\n{text}\n", encoding="utf-8")
                records.append(
                    {
                        "id": name,
                        "url": final_url,
                        "status": extracted["status"],
                        "depth": depth,
                        "json": str(json_path.relative_to(project)),
                        "text": str(text_path.relative_to(project)),
                        "screenshots": extracted["screenshots"],
                    }
                )
                response_status = response.status if response else None
                if response_status == 429:
                    queue.clear()
                if depth < args.max_depth and (response_status is None or response_status < 400):
                    for href in links:
                        candidate = safe_candidate(href, start_url, args.include_query)
                        if candidate and candidate not in queued and candidate not in visited:
                            queued.add(candidate)
                            queue.append((candidate, depth + 1, final_url))
            except (PlaywrightTimeoutError, PlaywrightError, Exception) as exc:
                errors.append({"url": requested_url, "error": f"{type(exc).__name__}: {exc}"})

        desktop.close()
        mobile.close()
        browser.close()

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    run = {
        "type": "public_crawl",
        "started_url": start_url,
        "finished_at": datetime.now().astimezone().isoformat(),
        "settings": {
            "max_pages": args.max_pages,
            "max_depth": args.max_depth,
            "screenshot_pages": args.screenshot_pages,
            "include_query": args.include_query,
            "browser_channel": args.browser_channel,
        },
        "robots": robots_status,
        "pages": records,
        "blocked_by_robots": blocked,
        "errors": errors,
        "queue_remaining": len(queue),
    }
    manifest.setdefault("runs", []).append(run)
    manifest["updated_at"] = datetime.now().astimezone().isoformat()
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"project={project}")
    print(f"pages_collected={len(records)}")
    print(f"blocked_by_robots={len(blocked)}")
    print(f"errors={len(errors)}")
    if not records:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

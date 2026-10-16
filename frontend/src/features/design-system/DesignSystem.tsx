import { createSignal, For } from "solid-js";
import {
  Button,
  IconButton,
  Badge,
  Input,
  Select,
  Checkbox,
  Radio,
  Switch,
  InkPanel,
  Card,
  Tooltip,
  TvIcon,
  Dialog,
  Tabs,
} from "../../shared/components";

const COLORS = [
  { name: "Tinta Profunda", value: "#0B1220", var: "--bg-primary", desc: "Fundo estrutural e InkPanel" },
  { name: "Lima", value: "#B7F34A", var: "--accent-lima", desc: "Ação primária (contraste 14.2:1)" },
  { name: "Teal", value: "#1BC5BD", var: "--accent-teal", desc: "Acentos secundários e sucesso" },
  { name: "Nuvem Clara", value: "#F4F6F2", var: "--text-primary", desc: "Texto primário em dark mode" },
  { name: "Ardósia", value: "#5E6878", var: "--text-muted", desc: "Texto secundário e bordas" },
  { name: "Diurno", value: "oklch(0.80 0.155 78)", var: "--flow", desc: "Avisos e pendências" },
  { name: "Ember", value: "oklch(0.635 0.185 27)", var: "--ember", desc: "Erros críticos e falhas" },
];

const RADII = [
  { name: "Small", value: "8px", var: "--radius-sm" },
  { name: "Medium", value: "14px", var: "--radius-md" },
  { name: "Large", value: "18px", var: "--radius-lg" },
  { name: "Pill", value: "9999px", var: "--radius-pill" },
];

const SPACINGS = ["4px", "8px", "12px", "16px", "24px", "32px", "48px", "64px"];

export function DesignSystem() {
  const [checkboxVal, setCheckboxVal] = createSignal(true);
  const [radioVal, setRadioVal] = createSignal("opt1");
  const [switchVal, setSwitchVal] = createSignal(true);
  const [inputVal, setInputVal] = createSignal("Texto editável");
  const [selectVal, setSelectVal] = createSignal("sonnet");
  const [dialogOpen, setDialogOpen] = createSignal(false);
  const [tabKey, setTabKey] = createSignal("tab1");

  return (
    <div class="flex h-full flex-col gap-8 overflow-y-auto bg-[var(--surface-0)] p-6 text-[var(--cloud)]">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-[var(--cloud)]">Design System</h1>
        <p class="mt-1 text-sm text-[var(--t2,#cbd3de)]">
          Catálogo completo dos 14 componentes atômicos, tokens e paleta do TAVIR Escritório
        </p>
      </div>

      {/* Colors */}
      <section>
        <h2 class="mb-3 font-mono text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted,#aeb7c4)]">
          Cores & Tokens
        </h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <For each={COLORS}>
            {(color) => (
              <div class="rounded-xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-3.5">
                <div
                  class="mb-2 h-12 w-full rounded-lg border border-[rgba(244,246,242,.08)]"
                  style={{ "background-color": color.value }}
                />
                <p class="text-xs font-semibold text-[var(--cloud)]">{color.name}</p>
                <p class="font-mono text-[10px] text-[var(--muted,#aeb7c4)]">{color.value}</p>
                <p class="font-mono text-[10px] text-[var(--teal)]">var({color.var})</p>
                <p class="mt-1 text-[11px] text-[var(--t2,#cbd3de)]">{color.desc}</p>
              </div>
            )}
          </For>
        </div>
      </section>

      {/* 14 Atomic Components Showcase */}
      <section>
        <h2 class="mb-3 font-mono text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted,#aeb7c4)]">
          14 Componentes do Design System
        </h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* 1. Button */}
          <div class="rounded-xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-4">
            <p class="mb-2 font-mono text-[10px] uppercase text-[var(--muted,#aeb7c4)]">1. Button</p>
            <div class="flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm">Primário</Button>
              <Button variant="secondary" size="sm">Secundário</Button>
              <Button variant="ghost" size="sm">Ghost</Button>
            </div>
          </div>

          {/* 2. IconButton */}
          <div class="rounded-xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-4">
            <p class="mb-2 font-mono text-[10px] uppercase text-[var(--muted,#aeb7c4)]">2. IconButton</p>
            <div class="flex items-center gap-2">
              <IconButton icon={<TvIcon name="zap" />} size={36} aria-label="Zap" />
              <IconButton icon={<TvIcon name="bot" />} size={36} aria-label="Bot" />
              <IconButton icon={<TvIcon name="shield-check" />} size={36} aria-label="Shield" />
              <IconButton icon={<TvIcon name="sparkles" />} size={36} aria-label="Sparkles" />
            </div>
          </div>

          {/* 3. Badge */}
          <div class="rounded-xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-4">
            <p class="mb-2 font-mono text-[10px] uppercase text-[var(--muted,#aeb7c4)]">3. Badge</p>
            <div class="flex flex-wrap gap-1.5">
              <Badge tone="action">ação</Badge>
              <Badge tone="flow">fluxo</Badge>
              <Badge tone="neutral">neutro</Badge>
            </div>
          </div>

          {/* 4. Input */}
          <div class="rounded-xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-4">
            <p class="mb-2 font-mono text-[10px] uppercase text-[var(--muted,#aeb7c4)]">4. Input</p>
            <div class="flex flex-col gap-2">
              <Input
                value={inputVal()}
                onInput={(val) => setInputVal(val)}
                placeholder="Digite algo..."
              />
            </div>
          </div>

          {/* 5. Select */}
          <div class="rounded-xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-4">
            <p class="mb-2 font-mono text-[10px] uppercase text-[var(--muted,#aeb7c4)]">5. Select</p>
            <Select
              value={selectVal()}
              onChange={(val) => setSelectVal(val)}
              options={[
                { value: "sonnet", label: "Claude Sonnet 4" },
                { value: "opus", label: "Claude Opus 4" },
                { value: "gpt4o", label: "GPT-4o" },
              ]}
            />
          </div>

          {/* 6. Checkbox */}
          <div class="rounded-xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-4">
            <p class="mb-2 font-mono text-[10px] uppercase text-[var(--muted,#aeb7c4)]">6. Checkbox</p>
            <div class="flex flex-col gap-2">
              <Checkbox
                checked={checkboxVal()}
                onChange={setCheckboxVal}
                label="Habilitar checkpoint automático"
              />
            </div>
          </div>

          {/* 7. Radio */}
          <div class="rounded-xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-4">
            <p class="mb-2 font-mono text-[10px] uppercase text-[var(--muted,#aeb7c4)]">7. Radio</p>
            <div class="flex flex-col gap-1.5">
              <Radio
                name="demo-radio"
                checked={radioVal() === "opt1"}
                onChange={() => setRadioVal("opt1")}
                label="Opção A (Padrão)"
              />
              <Radio
                name="demo-radio"
                checked={radioVal() === "opt2"}
                onChange={() => setRadioVal("opt2")}
                label="Opção B (Avançado)"
              />
            </div>
          </div>

          {/* 8. Switch */}
          <div class="rounded-xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-4">
            <p class="mb-2 font-mono text-[10px] uppercase text-[var(--muted,#aeb7c4)]">8. Switch</p>
            <div class="flex items-center justify-between">
              <span class="text-xs text-[var(--cloud)]">Memória cognitiva ativa</span>
              <Switch checked={switchVal()} onChange={setSwitchVal} />
            </div>
          </div>

          {/* 9. Tooltip */}
          <div class="rounded-xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-4">
            <p class="mb-2 font-mono text-[10px] uppercase text-[var(--muted,#aeb7c4)]">9. Tooltip</p>
            <Tooltip label="Informação contextual de ajuda (hover)">
              <span class="inline-block cursor-help rounded-md border border-[rgba(244,246,242,.16)] bg-[#121c30] px-2.5 py-1 text-xs text-[var(--cloud)]">
                Passe o mouse aqui ⓘ
              </span>
            </Tooltip>
          </div>

          {/* 10. InkPanel */}
          <div class="rounded-xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-4">
            <p class="mb-2 font-mono text-[10px] uppercase text-[var(--muted,#aeb7c4)]">10. InkPanel</p>
            <InkPanel class="p-3 text-xs">
              <div class="font-mono text-[10px] text-[var(--lime)]">INK_PANEL_STRUCTURAL</div>
              <p class="mt-1 text-[var(--cloud)]">Preserva Tinta Profunda mesmo em modo claro</p>
            </InkPanel>
          </div>

          {/* 11. Card */}
          <div class="rounded-xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-4">
            <p class="mb-2 font-mono text-[10px] uppercase text-[var(--muted,#aeb7c4)]">11. Card</p>
            <Card class="p-3 text-xs">
              <div class="font-semibold text-[var(--cloud)]">Card Padrão</div>
              <div class="mt-1 text-[var(--t2,#cbd3de)]">Superfície com bordas e espaçamentos do DS</div>
            </Card>
          </div>

          {/* 12. TvIcon */}
          <div class="rounded-xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-4">
            <p class="mb-2 font-mono text-[10px] uppercase text-[var(--muted,#aeb7c4)]">12. TvIcon</p>
            <div class="flex items-center gap-3 text-[var(--teal)]">
              <TvIcon name="zap" class="h-5 w-5" />
              <TvIcon name="bot" class="h-5 w-5" />
              <TvIcon name="brain" class="h-5 w-5" />
              <TvIcon name="factory" class="h-5 w-5" />
              <TvIcon name="sparkles" class="h-5 w-5" />
            </div>
          </div>

          {/* 13. Tabs */}
          <div class="rounded-xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-4">
            <p class="mb-2 font-mono text-[10px] uppercase text-[var(--muted,#aeb7c4)]">13. Tabs</p>
            <Tabs
              active={tabKey()}
              onChange={setTabKey}
              items={[
                { value: "tab1", label: "Visão Geral" },
                { value: "tab2", label: "Métricas" },
              ]}
            />
          </div>

          {/* 14. Dialog */}
          <div class="rounded-xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-4">
            <p class="mb-2 font-mono text-[10px] uppercase text-[var(--muted,#aeb7c4)]">14. Dialog</p>
            <Button variant="secondary" size="sm" onClick={() => setDialogOpen(true)}>
              Abrir Dialog
            </Button>
            <Dialog
              open={dialogOpen()}
              onClose={() => setDialogOpen(false)}
              title="Demonstração do Dialog"
            >
              <div class="space-y-3 text-xs text-[var(--cloud)]">
                <p>Este é o componente modal padronizado com animação e foco acessível.</p>
                <div class="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" size="sm" onClick={() => setDialogOpen(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </Dialog>
          </div>
        </div>
      </section>

      {/* Typography */}
      <section>
        <h2 class="mb-3 font-mono text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted,#aeb7c4)]">
          Tipografia & Fontes OFL
        </h2>
        <div class="flex flex-col gap-3 rounded-xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-5">
          <div>
            <p class="mb-1 font-mono text-[10px] uppercase text-[var(--muted,#aeb7c4)]">Instrument Sans — UI/Body</p>
            <p class="text-2xl font-bold text-[var(--cloud)]">Heading H1 Bold — 24px</p>
            <p class="text-lg font-semibold text-[var(--cloud)]">Heading H2 Semibold — 18px</p>
            <p class="text-sm text-[var(--t2,#cbd3de)]">Body text regular — Instrument Sans 400 (13px / 1.5)</p>
          </div>
          <div class="border-t border-[rgba(244,246,242,.10)] pt-3">
            <p class="mb-1 font-mono text-[10px] uppercase text-[var(--muted,#aeb7c4)]">IBM Plex Mono — Dados/Labels</p>
            <p class="font-mono text-sm text-[var(--cloud)]">mono-label: STATUS_ACTIVE · 1.536 dims</p>
            <p class="font-mono text-xs text-[var(--muted,#aeb7c4)]">mono-caption: 2026-10-16T08:00:00Z · 45,5 M tokens</p>
          </div>
        </div>
      </section>

      {/* Spacing */}
      <section>
        <h2 class="mb-3 font-mono text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted,#aeb7c4)]">
          Espaçamento (Grade de 4px)
        </h2>
        <div class="flex flex-wrap items-end gap-3 rounded-xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-5">
          <For each={SPACINGS}>
            {(spacing) => (
              <div class="flex flex-col items-center gap-1">
                <div class="bg-[var(--teal)] opacity-60" style={{ width: spacing, height: spacing }} />
                <span class="font-mono text-[10px] text-[var(--muted,#aeb7c4)]">{spacing}</span>
              </div>
            )}
          </For>
        </div>
      </section>

      {/* Radii */}
      <section>
        <h2 class="mb-3 font-mono text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted,#aeb7c4)]">
          Raios de Borda
        </h2>
        <div class="flex flex-wrap gap-4 rounded-xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-5">
          <For each={RADII}>
            {(radius) => (
              <div class="flex flex-col items-center gap-2">
                <div
                  class="h-14 w-14 border-2 border-[var(--lime)] bg-[#121c30]"
                  style={{ "border-radius": radius.value }}
                />
                <span class="text-xs font-semibold text-[var(--cloud)]">{radius.name}</span>
                <span class="font-mono text-[10px] text-[var(--muted,#aeb7c4)]">{radius.value}</span>
              </div>
            )}
          </For>
        </div>
      </section>
    </div>
  );
}
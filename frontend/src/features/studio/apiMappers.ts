import type {
  StudioDecision,
  StudioPiece,
  StudioProfile,
} from "../../shared/api/client";
import type {
  ContentPiece,
  ContentProfile,
  DecisionCheckpoint,
  DecisionOption,
  SocialNet,
  StudioDesignSystem,
  StudioNetwork,
} from "./demoData";

const DS_FALLBACK = (accent = "#B7F34A"): StudioDesignSystem => ({
  primary: "#0B1220",
  secondary: "#F4F6F2",
  accent,
  fontDisplay: "Instrument Sans",
  fontBody: "Instrument Sans",
  toneOfVoice: "didático, direto e sem hype",
  doList: "Usar prova, números e CTA claro",
  dontList: "Prometer resultado financeiro garantido",
  visualNotes: "Alto contraste, tipografia forte, poucas cores",
});

function mapNet(n: string | null | undefined): SocialNet {
  if (n === "yt" || n === "li" || n === "ig") return n;
  return "ig";
}

export function mapStudioProfile(p: StudioProfile): ContentProfile {
  const dsRaw = (p.design_system || {}) as Partial<StudioDesignSystem>;
  const accent = p.color || dsRaw.accent || "#B7F34A";
  const nets: StudioNetwork[] = (p.networks || []).map((n) => ({
    net: mapNet(n.net),
    handle: n.handle || p.handle || p.name,
    url: n.url || "",
    followers: n.followers,
    engagement: n.engagement,
  }));
  return {
    id: p.id,
    name: p.name,
    handle: p.handle || `@${p.name.toLowerCase().replace(/\s+/g, "")}`,
    niche: p.niche || "Sem nicho",
    audience: p.audience || "",
    company: p.company || "",
    color: accent,
    initials: p.initials || p.name.slice(0, 2).toUpperCase(),
    nets,
    designSystem: { ...DS_FALLBACK(accent), ...dsRaw, accent },
    cycleGoal: p.cycle_goal ?? 12,
    cycleDone: p.cycle_done ?? 0,
    status: (p.status as ContentProfile["status"]) || "active",
  };
}

export function mapStudioPiece(pc: StudioPiece): ContentPiece {
  return {
    id: pc.id,
    num: pc.num || pc.id,
    profileId: pc.profile_id || "",
    net: mapNet(pc.net),
    stage: (pc.stage as ContentPiece["stage"]) || "idea",
    title: pc.title,
    subtitle: pc.subtitle || undefined,
    needs: pc.needs,
    progress: pc.progress ?? undefined,
    squad: pc.squad || undefined,
    caption: pc.caption || undefined,
    cta: pc.cta || undefined,
    tags: pc.tags || undefined,
    slides: pc.slides || undefined,
  };
}

export function mapStudioDecision(d: StudioDecision): DecisionCheckpoint {
  const options = (d.options || []) as DecisionOption[];
  return {
    id: d.id,
    profileId: d.profile_id,
    runId: d.run_id,
    kind: d.kind === "revisao" ? "revisao" : "pauta",
    title: d.title,
    subtitle: d.subtitle || "",
    waitingLabel: d.waiting_label || "aguardando você",
    ago: d.platform_label || d.run_id,
    platformLabel: d.platform_label || undefined,
    options: options.length ? options : undefined,
    selectedOptionId: d.selected_option_id || undefined,
    pieceId: d.piece_id || undefined,
  };
}

export function profileToCreatePayload(profile: ContentProfile) {
  return {
    id: profile.id,
    name: profile.name,
    handle: profile.handle,
    company: profile.company,
    niche: profile.niche,
    audience: profile.audience,
    tone: profile.designSystem.toneOfVoice,
    context: profile.audience,
    color: profile.color,
    initials: profile.initials,
    networks: profile.nets.map((n) => ({
      net: n.net,
      handle: n.handle,
      url: n.url,
      followers: n.followers ?? 0,
      engagement: n.engagement ?? 0,
    })),
    design_system: profile.designSystem,
    cycle_goal: profile.cycleGoal,
    cycle_done: profile.cycleDone,
    guidelines: profile.designSystem.doList,
    status: profile.status,
  };
}

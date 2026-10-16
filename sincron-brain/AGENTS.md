<!-- sincron-brain-memory:start -->
## Sincron Brain Memory

Use the `sincron-brain` MCP server as the project's long-term memory layer.

- Before answering questions that may depend on prior project/user context, inspect memory first:
  `list_major_tags()` or `search()` -> `list_tags()` -> `use_memories(ids)`.
- When using memory in a user-facing conversation, always inspect `soul` and `preferences`
  first with `list_tags("soul")` and `list_tags("preferences")`. If any identity or
  preference memory should shape the answer, fetch it through `use_memories(ids)` so it is
  injected into the working context and reactivated.
- Use `use_memories(ids)` when memory content is used in an answer. Do not use `read_memory()`
  for normal answers, because `use_memories()` queues reactivation for sleep-time scoring.
- Prefer `remember_turn(user_message, agent_response, memory_reason)` when both sides of a
  conversation turn are available. Use `remember()` for standalone durable facts, user
  preferences, project decisions, corrections, and information the user explicitly asks you
  to remember.
- When a single user message brings durable facts that belong to DIFFERENT canonical Major
  Tags, call `remember()` SEPARATELY for each Major Tag rather than packing them all into a
  single `remember_turn()`. Example: "Hi, I'm Massari, and I want you to be Adamastor,
  always cheerful" carries `user_profile` (the human's name) AND `soul` (the agent's
  persona) — queue two drafts, one per Major Tag, each with a focused content and hint_tags.
  Sleep will also decompose multi-major drafts as a safety net, but splitting at the agent
  is cheaper, more accurate, and avoids relying on the LLM judge to guess your intent.
- Multiple facts about the SAME subject stay in ONE `remember()`. "Massari lives in São
  Paulo and drinks coffee" is one user_profile memory, not two — same subject, same Major
  Tag, same memory.
- When the user explicitly reacts to the agent's USE of memory — praise ("you remembered
  well!", "great catch"), correction ("I already told you that"), reminder ("how come you
  forgot?"), appreciation for a pertinent recall, OR frustration / anger / cursing aimed at
  the recall ("you forgot again!", "what a mess, I told you this") — queue a draft via
  `remember_turn()` with `memory_reason` stating it is feedback about memory performance.
  Positive and negative reactions weigh the same: both raise the affected memories'
  `emotion_floor` so the lesson is durable. Do NOT queue this kind of draft for emotion
  inside the narrated fact itself ("that client frustrated me by being late" — that is
  content, not feedback about memory) or for cursing with no identifiable target. Without
  this draft, the reaction is silently lost.
- Do not store secrets, API keys, tokens, passwords, or unrelated transient chatter.
- Major Tags are primary retrieval routes, not free-form facets. Use one primary Major Tag
  whenever possible. Defaults: `soul`, `user_profile`, `preferences`, `projects`, `technical_context`, `external_access`, `workflows`, `decisions`, `business_context`, `people`, `organizations`, `references`, `schedule`.
- Common tags are noun-like retrieval labels inside a Major Tag. Before creating tags,
  inspect existing vocabulary with `list_common_tags(major_tag)` when useful. Reuse good
  existing tags, but create new snake_case singular tags when they add a useful search route.
  Avoid verbs, phrases, mini-summaries, singular/plural duplicates, and redundant synonyms.
- Create a new Major Tag only when no default category fits and the new category is generic,
  reusable across future memories, snake_case, and useful as a future search route. There is
  no separate registry command; a new Major Tag is registered when sleep indexes a memory
  with that Major Tag.
- `remember()` and `remember_turn()` only queue drafts. The sleep job indexes drafts later with
  `sleep_now()` or the configured sleep routine, compiling conversation turns into contextual
  memories rather than raw transcripts.
- When the user provides a judge API key (Anthropic, OpenAI, Gemini, Mistral, etc.), call
  `set_judge_key(api_key, provider=None)` to persist it. NEVER write the key to `.env`,
  `.mcp.json`, or any other file by hand — `set_judge_key` writes it to the vault `.env`,
  reloads config, and validates the credential with a live ping. Treat its `ready: false`
  response as a hard failure and report the `error`/`message` back to the user; do not
  pretend indexing will work.
- Run `verify_judge()` whenever the user asks "is the indexer working?" or before a costly
  `sleep_now()`. It surfaces silent regressions (revoked key, wrong model, network error)
  before tokens are spent.
<!-- sincron-brain-memory:end -->

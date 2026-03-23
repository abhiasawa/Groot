# TODOS

Items deferred from CEO plan review (2026-03-21). Priority: P1 (do next), P2 (do soon), P3 (do eventually).

---

## P1 — Do Next

### Test infrastructure setup
**What:** Set up Vitest (or Jest) with Supabase test helpers and LLM response mocking. Write initial test suite for core modules: `metadata-parser.ts`, `memory-router.ts`, `tracker.ts`, `analyze.ts`.
**Why:** Project has zero tests. Every prompt change and edge case is validated only in production. The plan adds 6+ new codepaths with branching logic.
**Effort:** M (human: ~1 week / CC: ~2 hours)
**Depends on:** Nothing

### Link summary fallback handling
**What:** Add try/catch around LLM summary generation in `src/lib/capture/link-processor.ts`. When the LLM returns malformed/empty summary text, fall back to "Link saved. Couldn't generate summary." instead of showing broken output to the user.
**Why:** Critical gap from eng review failure modes registry — no rescue, no test, user sees broken summary. Currently the only unhandled LLM failure path in the link capture pipeline.
**Effort:** S (human: ~2 hours / CC: ~5 min)
**Depends on:** Link capture re-enablement (Phase 5)

---

## P2 — Do Soon

### Monthly/quarterly synthesis reports
**What:** Extend weekly narrative report into monthly and quarterly summaries. Monthly synthesizes 4 weekly reports into life arcs. Quarterly identifies seasonal themes and long-term growth patterns.
**Why:** Weekly reports show micro-patterns; monthly/quarterly show the "whoa, I've grown" moments. This is the Month 3 vision from the platonic ideal.
**Effort:** M (human: ~1 week / CC: ~30 min)
**Depends on:** Narrative weekly report working well (Phase 4 of CEO plan). Needs ~4 weeks of weekly reports to have data.

### Amber contrast audit (a11y)
**What:** Audit all amber `#FFBB2C` on cream `#F0EFEB` usages across the mobile app for WCAG AA compliance. Fix any below 3:1 for non-text and 4.5:1 for text. Use darker amber `#D4960A` where needed (per the heatmap fix in the contextual intelligence plan).
**Why:** Design review found the accent color fails contrast on the primary background (1.7:1 ratio). The heatmap fix addresses new screens, but existing screens may have the same issue.
**Effort:** S (human: ~4 hours / CC: ~15 min)
**Depends on:** Nothing. Can run in parallel with any phase.

---

## P3 — Do Eventually

### Web portal sunset plan
**What:** Document sunset timeline for The Garden web portal. Options: (a) add deprecation banner pointing to mobile app, (b) remove entirely after mobile has habits + mood screens, (c) leave as-is indefinitely.
**Why:** Unmaintained UI creates confusion. Users might find it and think it's the real product. Code rot accumulates.
**Effort:** S for banner, M for removal (human: ~1 week / CC: ~1 hour)
**Depends on:** Mobile app Phase 6 (habits + mood screens) shipping first

### Knowledge graph from saved links
**What:** Build a connected knowledge base from saved links. Link articles to topics, people, and commitments mentioned in them. Enable browsing and discovery ("what articles did I save about leadership?").
**Why:** Without this, saved links are write-only — a bookmark dump, not a second brain. Retrieval is what makes link capture valuable long-term.
**Effort:** L (human: ~2 weeks / CC: ~2 hours)
**Depends on:** Link capture working (Phase 5), mobile sub-plan (Phase 6). Needs links accumulating for a few weeks.

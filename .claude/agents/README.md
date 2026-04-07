# Praxis Claude Code Agents (v3 — with Cogito)

28 subagents organized as 1 master, 4 leads, 20 specialists, 2 cross-cutting reviewers, and 1 cross-cutting verifier.

## Topology

```
master-orchestrator
├── research-lead
│   ├── research-data-ingest
│   ├── factor-library              ← OSAP/OSBAP wrapper (free academic factors)
│   ├── research-features
│   ├── research-causal
│   ├── research-labeling
│   ├── research-model
│   ├── research-backtest
│   ├── research-risk-portfolio
│   └── research-execution
├── backend-lead
│   ├── backend-api
│   ├── backend-data
│   ├── backend-mlops
│   └── backend-test
├── frontend-lead
│   ├── frontend-state
│   ├── frontend-ui
│   ├── frontend-charts
│   └── frontend-test
└── intel-lead                       (Cogito subsystem)
    ├── intel-crawler
    ├── intel-validator
    ├── phd-council                   ← multi-provider PhD panel
    └── pm-discretionary              ← discretionary PM (never auto-executes)

cross-cutting:
  code-reviewer       (after every engineering specialist)
  llm-verifier        (after every capital-affecting artifact)
```

## Pipelines

**Research cycle** (systematic alpha)
```
data-ingest → features → causal → labeling → model
            → backtest → llm-verifier → risk-portfolio
            → (human gate) → execution
```

**Backend feature**
```
backend-api → backend-data → backend-mlops? → backend-test
            → code-reviewer → llm-verifier?
```

**Frontend feature**
```
frontend-state → frontend-ui → frontend-charts? → frontend-test
               → code-reviewer
```

**Intelligence cycle** (Cogito)
```
intel-crawler → intel-validator → phd-council → pm-discretionary
              → llm-verifier → (human gate)
              ├── Mode A: hypothesis seed → research-lead → full pipeline
              └── Mode B: discretionary trade → discretionary sleeve (capped, human-approved)
```

## Cogito subsystem at a glance

- **PhD council**: 6 personas, each on a different LLM provider where possible (Claude, GPT, Gemini, custom). Red Team is forced to a different provider from the thesis author.
- **Validated claim graph**: every claim used by the council requires ≥2 *independent* sources. Two LLMs agreeing does not count as two sources.
- **Brier scorecard**: every persona's calibration is tracked over time. Underperformers are downweighted, never deleted.
- **Discretionary PM**: produces structured trade ideas with mandatory pre-mortem, mechanical kill criteria, Kelly × 0.5 sizing capped by conviction, hard sleeve caps. NEVER auto-executes.
- **Quantamental separation**: discretionary and systematic PnL are tracked in separate books. Discretionary cannot exceed 20% of portfolio gross.

## Promotion gates
**Systematic (research-backtest)**
- DSR probability ≥ 0.95
- PBO ≤ 0.5
- Net Sharpe (post-cost) ≥ 1.0
- Capacity ≥ user minimum
- No single year > 50% of total PnL
- 2-of-N llm-verifier approval
- Human approval logged in `audit/decisions.jsonl`

**Discretionary (pm-discretionary)**
- All hard sizing rules pass
- Pre-mortem written
- Kill criteria mechanical (script-checkable)
- No conflict with > 1% systematic position
- llm-verifier approved
- Human approval logged

## Install
```bash
unzip praxis-claude-agents.zip   # places .claude/agents/ + CLAUDE.md at the repo root
```
Then open the repo in Claude Code and address the master orchestrator directly.

## Example prompts
- *Research*: "Build a sector-neutral momentum strategy on Russell 1000 using dollar bars and PatchTST."
- *Backend*: "Add an SSE endpoint for live council activity."
- *Frontend*: "Build the /intelligence dashboard with the claim graph visualizer and persona scorecards."
- *Intelligence (Mode A)*: "Synthesize the case for a structural shift in global rare-earth supply and route it as a hypothesis seed."
- *Intelligence (Mode B)*: "Run the council on NVDA's earnings catalyst next week. If consensus is high-conviction, produce a discretionary trade idea for human review."

## Honest warnings
1. "PhD persona" is a stylistic prompt, not actual expertise. The Brier loop is what makes it honest.
2. Twitter/X is mostly poison post-2024. Use licensed vendors only.
3. LLM hallucination doesn't disappear with multi-LLM voting. Independent-source corroboration is the only real defense.
4. Discretionary overlays will destroy systematic alpha if you let them. The sleeve separation exists for this reason.
5. The system will produce confident-sounding wrong answers. The Red Team, kill criteria, and human gate exist specifically to compensate. Don't disable them when things are going well — that's when they matter most.

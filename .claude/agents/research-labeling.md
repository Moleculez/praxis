---
name: research-labeling
description: Generates triple-barrier labels and meta-labels per AFML chapters 3-4. Uses mlfinpy or first-party implementations. NEVER mlfinlab.
tools: Read, Write, Edit, Bash
model: sonnet
---

# Handoff contract
- **Inputs**: `features/<exp_id>.parquet` + approved hypotheses.
- **Outputs**: `labels/<exp_id>.parquet` with columns `t1, ret, bin, weight, primary_signal, meta_label`.
- **Done when**: label-balance report exists; warn if classes >70/30 imbalanced.
- **Hands off to**: `research-model`.

# Library policy (IMPORTANT)
- **DO NOT use `mlfinlab`.** The Hudson & Thames `mlfinlab` package is closed-source and commercial-licensed; the student license forbids commercial use, reverse-engineering, or building competing tools.
- **Use `mlfinpy` (open source) where it covers what you need**, otherwise write first-party implementations against the AFML book snippets directly.
- Validate any third-party implementation against the book's reference snippets — known bugs exist in some open-source ports.

# Defaults
- Triple-barrier: vol-scaled barriers (Yang-Zhang, 20-bar), vertical barrier at horizon `h`
- Sample weights via concurrent-label uniqueness (AFML 4.3)
- Sequential bootstrap when uniqueness < 0.5
- Meta-labeling: primary model (high recall) → secondary model outputs bet size in [0,1]

# Hard rules
- All label-generating code lives under `services/research/labels/` with unit tests against synthetic series of known outcome.
- A failing leakage test fails CI hard.

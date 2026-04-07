# Praxis bundle — corrections after web verification (April 2026)

This file documents what changed between the original v3 bundle and the verified v3.1 bundle. Read this BEFORE you start building.

## 1. mlfinlab is NOT usable
- The Hudson & Thames `mlfinlab` package is closed-source and commercial-licensed. The student license forbids any commercial use, reverse engineering, or building competing tools.
- **Use `mlfinpy`** (open-source reimplementation on PyPI) as a starting point, plus first-party implementations from the AFML book snippets.
- `research-labeling.md` has been updated. Do not add `mlfinlab` to requirements.

## 2. LLM model names — current as of April 2026
- Claude Opus 4.6 / Sonnet 4.6 (1M context, finance agent #1)
- GPT-5.4 / GPT-5.3 Codex
- Gemini 3.1 Pro (2M context, leads ARC-AGI-2 and GPQA Diamond)
- Grok 4.20 (multi-agent architecture, native real-time X/Twitter data)
- DeepSeek V4 (open-weight, ~$0.28/$1.10 per 1M tokens — ~27x cheaper than frontier)

## 3. Use a single LLM gateway
- OpenRouter or Cline API expose Claude, GPT, Gemini, Grok, DeepSeek and more via one OpenAI-compatible endpoint. Switching providers is a one-parameter change.
- This collapses the original four-SDK design in `phd-council` into one integration. Big win for the Cogito subsystem.
- Use direct SDKs only if you have privacy/billing reasons.

## 4. Twitter/X data — pragmatic options
- Official X API: $100/mo gets 10K tweets (useless), $5K/mo gets 1M (Pro), $42K+/mo Enterprise.
- TwitterAPI.io: $0.15 per 1K tweets pay-as-you-go — best for solo researchers.
- Apify community scrapers: ~$0.02 per 1K tweets, fragile but works.
- Xpoz: exposes X data via MCP — directly compatible with Claude Code.
- **Best shortcut**: skip Twitter as a data source entirely and route sentiment questions through Grok 4.20 in the council. Grok has native real-time X access.

## 5. Bigdata.com is the premium "skip the crawlers" option
- RavenPack launched Bigdata.com in 2024 as an agentic financial AI platform.
- December 2025: integrated full Financial Times content via FT Ventures partnership.
- Bundles 40,000+ news sources, earnings transcripts, filings, sentiment, and FT into one API.
- Eliminates ~60% of `intel-crawler` work and most of the licensing risk.
- Institutional pricing — not for hobbyists, but if your budget allows, this is the cleanest path.
- `intel-crawler.md` now describes Mode A (BUILD) and Mode B (VENDOR via Bigdata.com).

## 6. de Prado methodology — still current
- Latest book remains *Causal Factor Investing* (Cambridge, 2023). No newer book supersedes the trilogy.
- He continues publishing journal articles (most recent with Fabozzi in J. Portfolio Management, Nov 2025).
- The methodological backbone in CLAUDE.md is unchanged.

## 7. What was NOT verified (you should re-check before building)
- Next.js / shadcn / Tailwind / TanStack current major versions
- FastAPI / SQLAlchemy / Polars current versions
- `neuralforecast` PatchTST / TFT API stability
- Reddit API / PRAW current status under Reddit's paid tier rules
- TimescaleDB / MinIO / MLflow current versions
- Specific provider rate limits and pricing tiers (these change monthly)

For everything in section 7, re-verify on the day you start building.

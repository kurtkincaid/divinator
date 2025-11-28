# Copilot Instructions for Markdown in this Repository

Purpose: steer AI-generated and human-written Markdown toward consistent, high-quality docs across the project.

Applies to: all current and future Markdown files in this repo (README.md, docs/*.md, issues/PRs descriptions where reasonable).

## House style

- Voice: friendly, concise, and practical. Avoid hype and exclamations.
- Audience: developers and data-minded users; assume basic Node.js familiarity.
- Dates: ISO 8601 (YYYY-MM-DD). Include a “Last updated:” line near the top when relevant.
- Headings hierarchy: start with `# Title`, then `##`, `###`. Don’t skip levels.
- Line length: target ≤ 120 chars. Wrap naturally; do not hard-break code lines.
- Lists: prefer bullets for steps and concepts; use numbered lists only when order matters.
- Tables: use sparingly; add a header row and keep narrow.

## Code and commands

- Always specify a language on fenced code blocks.
  - Shell/CLI examples default to Windows PowerShell for this repo: use `powershell` code fences and one command per line.
  - If adding optional Bash equivalents, put them in a separate block labeled `bash` and make them clearly optional.
- JavaScript examples should be minimal, runnable, and avoid extraneous dependencies.
- When showing file or symbol names from the repo, wrap them in backticks (e.g., `index.js`, `docs/API_REFERENCE.md`).

## Links and references

- Prefer relative links to files in this repo (e.g., `docs/GETTING_STARTED.md`).
- Avoid bare URLs; use named links: `[label](https://example.com)`.
- Cross-reference sections using standard GitHub anchors (e.g., `#testing`).

## Structure and sections

- Start longer docs with a short purpose/summary paragraph.
- Include an optional mini-TOC if the document exceeds ~20 lines and has ≥ 3 sections.
- For guides and how-tos, include a brief checklist of steps up front.
- For documents with procedures or commands, add a “How to run” section with PowerShell commands.
- Where applicable, end with a short “Notes” or “Next steps”.

## Accuracy and verification

- Prefer concrete steps over vague advice.
- If suggesting commands or code that affect the project, ensure they map to existing files/exports.
- When citing algorithms/statistics, include a short note or reference link.

## Linting-friendly Markdown

- Provide a language for fenced blocks (addresses MD040).
- Avoid bare URLs (addresses MD034).
- Start with a top-level heading (addresses MD041).
- Keep lines reasonably short (MD013 guidance). Use soft wraps; do not break inside code.

## Do and Don’t

- Do: keep tone concise and helpful; use `##` and `###` headings; specify code fence languages; prefer PowerShell for CLI.
- Don’t: include heavy HTML, embed images without alt text, add unexplained acronyms, or use exclamation-heavy tone.

## Templates (snippets)

Short guide skeleton:

```markdown
# <Title>

Last updated: YYYY-MM-DD

Purpose: <one or two sentences>

## Checklist
- [ ] Step 1
- [ ] Step 2

## Steps
1. …
2. …

## How to run
```powershell
# one command per line
npm test
```

## Notes
- …
```

Long reference skeleton:

```markdown
# <Title>

Last updated: YYYY-MM-DD

## Overview

## Concepts

## Reference

## Examples

## Related
- docs/GETTING_STARTED.md
- docs/API_REFERENCE.md
```

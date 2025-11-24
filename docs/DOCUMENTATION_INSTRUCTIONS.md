# Documentation Instructions and Context

Last updated: 2025-08-29

This file defines requirements and shared context for all present and future project documentation.

## Scope

- Applies to all Markdown files in `docs/` and top-level docs like `README.md`.
- Complements `copilot-instructions.md` (house style and Markdown rules).

## Audience and goals

- Audience: developers and analysts using Node.js; some may be new to statistics.
- Goals: help users adopt the library quickly, understand APIs precisely, and contribute safely.

## Required sections by doc type

- Getting Started guides
  - Purpose paragraph
  - Short checklist of steps
  - Minimal runnable example
  - “How to run” section with PowerShell commands
  - Links to API reference and troubleshooting

- API references
  - Clear contracts for each export (inputs, outputs, error modes, notes)
  - Defaults and edge cases called out
  - Cross-links to related functions

- Architecture/design docs
  - Current state and target state
  - Rationale for trade-offs
  - Error-handling and performance notes

- Roadmaps/plans
  - Time horizons (near/mid/long term)
  - Risks with mitigations
  - Success metrics where possible

- Contributing/Testing/Security
  - Actionable steps; keep it short and specific

## Formatting and conventions

- PowerShell for CLI blocks by default (` ```powershell ` fences).
- Specify a language for all fenced code blocks.
- Use relative links within the repo (e.g., `API_REFERENCE.md`).
- Avoid bare URLs; use named links.
- Heading levels must be sequential (`#`, then `##`, `###`).
- Include “Last updated: YYYY-MM-DD” near the top when the content is expected to evolve.

## Accuracy and validation

- Verify examples compile or run against the current codebase.
- Keep API_REFERENCE.md synchronized with `index.js` exports.
- When adding new exports, update:
  - README.md (overview if user-facing)
  - docs/API_REFERENCE.md
  - docs/GETTING_STARTED.md examples (if applicable)
  - docs/TESTING.md (new test notes if applicable)
  - docs/TASKS.md (track follow-ups)

## Review checklist (for PRs that modify docs)

- [ ] Purpose and audience are clear
- [ ] Headings are consistent and sequential
- [ ] Fenced code blocks have languages
- [ ] Commands are PowerShell by default, one per line
- [ ] Links are relative and not bare URLs
- [ ] Examples are minimal and runnable
- [ ] API changes synchronized with API_REFERENCE.md
- [ ] “Last updated” refreshed if materially changed

## File naming

- Use UPPER_SNAKE_CASE for permanent references (API_REFERENCE.md, DEVELOPMENT_ROADMAP.md)
- Use Title Case for guides (Getting Started, Architecture)
- Keep names stable to avoid breaking links

## Ownership

- The maintainer listed in `package.json` is the default owner for docs decisions.
- Substantial changes to API or architecture docs require maintainer approval.

## Out of scope

- Do not include heavy assets in docs; link externally if needed.
- Avoid platform-specific instructions beyond the PowerShell default unless necessary.

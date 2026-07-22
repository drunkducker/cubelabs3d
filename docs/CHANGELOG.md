# Cube Labs 3D Changelog

This file records meaningful product, architecture, security, database, deployment, and documentation changes. Small mechanical edits may remain in Git history.

## 2026-07-22 — Documentation governance foundation

- Author: OpenAI GPT working with the project owner
- Branch: `main`
- Purpose: establish the permanent `/docs` source-of-truth structure and enforce correct documentation and change logging.
- Added: documentation index, project constitution, architecture rules, AI instructions, admin portal specification, and backup/migration strategy.
- Structural rule: contributors must follow the documented structure and log meaningful changes in the correct permanent documents.
- Testing: verified repository write access and successful GitHub commits for each new document.
- Deployment: documentation-only change; no runtime behavior changed.
- Known follow-up: add the remaining feature-specific documents and fold older checkpoint notes into permanent documents or an archive index.
- Rollback: revert the documentation commits; not recommended because these files define required project governance.

## Earlier project history summary

The repository history and existing checkpoint documents record earlier work including:

- mobile-first homepage and interactive hero cube;
- playable 3×3 and larger NxN cube work;
- solver and cube-rendering fixes;
- mobile viewport and high-DPI canvas fixes;
- Pyraminx implementation;
- Supabase database and authentication foundation;
- Cube ID profile and social platform foundation;
- early community, friendship, challenge, and leaderboard planning;
- Vercel branch deployments and environment configuration.

These entries will be expanded as older progress documents are reviewed and consolidated.
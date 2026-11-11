# Project Football Time — Shared Design System

Date: 2026-11-11  
Status: Phase 1 foundation, implemented on a feature branch  
Scope: visual tokens and shared component primitives only

## Design direction

- Dark navy/blue foundation with teal as the primary accent.
- Neutral, readable text and clear semantic success, warning, error and information colors.
- Consistent card radius, spacing, control height and focus treatment.
- Restrained motion with reduced-motion support.
- Token names are semantic so a future light palette can be added without rewriting components. A light-mode switch is not part of this phase.

## Token groups

| Group | Tokens | Intended use |
|---|---|---|
| Surfaces | `--ft-bg`, `--ft-surface`, `--ft-surface-raised`, `--ft-surface-inset` | App background, cards, nested surfaces and form controls |
| Borders | `--ft-border` | Shared control/card/table borders |
| Text | `--ft-text`, `--ft-text-muted` | Primary and secondary text |
| Accent | `--ft-accent`, `--ft-accent-strong`, `--ft-info` | Teal actions and blue information/focus |
| Status | `--ft-success`, `--ft-warning`, `--ft-danger` | Semantic result and quality states |
| Shape | `--ft-radius-sm`, `--ft-radius-md`, `--ft-radius-lg` | Shared corner radii |
| Spacing | `--ft-space-1` through `--ft-space-4` | 4px spacing scale |
| Controls | `--ft-control-height` | Comfortable touch target baseline |
| Elevation | `--ft-shadow` | Shared card shadow |

Compatibility aliases (`--bg`, `--panel`, `--muted`, `--line`, `--green`, `--blue`, `--gold`, `--shadow`) preserve the existing feature CSS while the system is introduced incrementally.

## Shared primitives covered

- Page background and header border.
- Cards and summary stat surfaces.
- Primary/secondary/detail/result buttons.
- Form inputs and select controls.
- Tags and result-status chips.
- Keyboard focus and disabled controls.
- Semantic result colors.
- Tables and four-item navigation styling.

Feature-specific layouts (team picker, search, match rows, database sub-navigation and analysis widgets) remain in their existing stylesheets. This avoids a broad rewrite and preserves their current behavior.

## Loading and offline behavior

- `index.html` loads `css/design-system.css?v=1` after the existing visual stylesheets so the shared layer is the final common-primitives override.
- `sw.js` precaches that exact versioned stylesheet URL.
- The service-worker cache is incremented from `football-time-v40` to `football-time-v41` so installed clients can receive the new asset.
- Existing CSS files and their order are otherwise preserved.

## Scope and preservation

This phase does not change:
- HTML page IDs, navigation event contracts or database tab IDs.
- JavaScript modules or calculations.
- Local Storage keys or serialized records.
- Football data, player data, probability snapshots or legacy records.
- API providers, polling, quotas, secrets or Supabase settings.
- Model coefficients or historical predictions.

No Production deployment or merge to `main` is included. Android visual acceptance and offline/cache validation remain required before merge.

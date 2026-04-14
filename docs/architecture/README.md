# Architecture Notes

Authoritative architecture decisions and acceptance criteria live in Linear.

Repo-local architecture notes should only explain how the checked-in implementation maps to those Linear decisions. The initial canonical documents are:

- Fort Island Signal Publishing Architecture and Delivery Spec
- Codex QA and Governance Model

Current repo-level implementation conventions include:

- `docs/architecture/asset-conventions.md`
- `docs/architecture/publishing-contracts.md`
- shared layout and content blocks under `components/layout/` and `components/blocks/`

## Integration conventions

- `docs/integrations/hubspot-cta-conventions.md` — HubSpot ownership boundary; CTA destination rules by asset family; UTM attribution conventions; URL composition pattern; anti-patterns
- `docs/integrations/squarespace-integration.md` — Squarespace link-out, teaser, and embed patterns; CTA placement rules; anti-patterns

## Architecture Decision Records

- `docs/architecture/adr-009-hosting-deployment-model.md` — hosting and deployment model; URL strategy; Squarespace and HubSpot ownership boundaries; Evidence Studio as an optional deployment target (FOR-262, FOR-263)

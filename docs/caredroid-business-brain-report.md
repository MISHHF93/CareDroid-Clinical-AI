# CareDroid Business Brain Report

## Goal

The CareDroid Business Brain creates a business intelligence layer that understands both platform operations and business operations. It aggregates analytics across SaaS, organization, workspace, asset, AI, automation, and simulation signals, then turns them into actionable business recommendations.

## Route

Business Brain is available at `/business-brain`.

## Aggregated Analytics

The Business Brain aggregates:

- SaaS analytics: product adoption, customer health, retention risk, expansion readiness, and portfolio value.
- Organization analytics: organization-level adoption, engagement, outcomes, and onboarding state.
- Workspace analytics: workspace usage, dependency, handoff, and silo-risk evidence.
- Asset analytics: asset launches, repeat usage, duration, abandonment, workflow completions, and merge candidates.
- AI analytics: AI launches, AI-assisted actions, accepted recommendations, human review, and governance signals.
- Automation analytics: workflow launches, completions, automation depth, friction, and dead ends.
- Simulation analytics: simulation readiness, completion, competency, and training signals.

## Generated Recommendations

The Business Brain generates recommendations for:

- Products to expand: products with strong adoption, ROI, health, engagement, and adjacent opportunity signals.
- Packs to retire: packs with low usage, low outcome contribution, or better replacement paths.
- Assets to merge: overlapping, underused, or redundant assets that should become one clearer experience.
- Customers needing onboarding: customers with weak activation, low adoption, or high retention risk.
- Departments needing training: departments with weak health scores, low simulation readiness, or workflow gaps.

## Business Brain Record

Each recommendation includes:

- `id`: stable recommendation identifier.
- `type`: expand product, retire pack, merge asset, onboard customer, or train department.
- `title`: recommendation summary.
- `priority`: high, medium, or low.
- `evidence`: analytics signals supporting the recommendation.
- `action`: concrete next business or platform operation.
- `owners`: suggested commercial, product, customer-success, clinical, or operations owners.

## Acceptance

CareDroid understands both platform operations and business operations when it can aggregate platform analytics into business recommendations that guide commercial expansion, product cleanup, customer success, asset governance, and department enablement.

## Verification

Verification should cover:

- SaaS, organization, workspace, asset, AI, automation, and simulation analytics are represented.
- Products to expand, packs to retire, assets to merge, customers needing onboarding, and departments needing training are generated.
- `/business-brain` renders analytics aggregates and recommendations.
- Tests cover recommendation generation and route/page rendering.

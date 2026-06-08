# Product Intelligence Layer Report

## Goal

The Product Intelligence Layer measures the success and value of each CareDroid SaaS product. It connects product packaging to actual usage and outcomes so commercial, product, clinical, and customer-success teams can evaluate whether each product is delivering measurable value.

## Route

Product intelligence is available at `/product-intelligence`.

## Value Chain

The intelligence layer tracks the full value chain:

`Product -> Pack -> Asset -> Usage -> Outcome`

Each product should expose:

- Product: commercial product or solution being evaluated.
- Pack: packaged asset bundle that enables the product.
- Asset: calculator, workflow, dashboard, simulation, AI tool, protocol, integration, or documentation artifact.
- Usage: launches, engagement, workflow completions, AI actions, searches, and repeat usage.
- Outcome: clinical, operational, financial, readiness, adoption, or governance signal tied to product value.

## Generated Metrics

The layer generates:

- Product adoption: enabled packs, activated assets, active departments, and adoption score.
- Product ROI: estimated value, implementation cost, ROI ratio, and payback signal.
- Product health: combined value score based on adoption, engagement, outcome strength, and risk.
- Product engagement: launches, usage depth, repeat usage, workflow completion, and AI-assisted engagement.

## Product Intelligence Record

Each product intelligence record includes:

- `id`: stable product identifier.
- `name`: product or solution name.
- `packs`: enabled or recommended packs.
- `assets`: product assets and asset types.
- `usage`: usage and engagement evidence.
- `outcomes`: measurable platform outcomes.
- `adoption`: adoption score and activation evidence.
- `roi`: ROI score and commercial value evidence.
- `health`: product health score and status.
- `engagement`: engagement score and activity evidence.

## Acceptance

Every SaaS product has measurable value when CareDroid can show how a product maps to packs, assets, usage, and outcomes, then generate adoption, ROI, health, and engagement metrics for product and customer-success decisions.

## Verification

Verification should cover:

- Product, pack, asset, usage, and outcome relationships are represented.
- Product adoption, ROI, health, and engagement are generated for every product.
- `/product-intelligence` renders product scorecards and value-chain evidence.
- Tests cover metric generation and route/page rendering.

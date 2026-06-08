# Customer Expansion Engine Report

## Goal

The customer expansion engine identifies commercial growth opportunities by matching current customer pack usage, organization type, and platform adoption signals to next-best pack recommendations.

## Route

Expansion opportunities are available at `/expansion-opportunities`.

## Expansion Signals

The first implementation uses privacy-safe commercial signals:

- Organization segment: hospital, university, government, or operations-focused customer.
- Current pack usage: enabled or adopted product/asset packs.
- Adjacent workflows: packs that naturally extend the customer's current operating model.
- Readiness evidence: usage, readiness, or governance signals that support the recommendation.
- Commercial motion: upsell, cross-sell, evaluation, or renewal expansion.

No patient identifiers, clinical notes, MRNs, raw prompts, or free-text PHI are used.

## Recommendation Examples

Hospital customer:

- Uses: Emergency Pack
- Recommend: ICU Pack
- Recommend: Simulation Pack

University customer:

- Uses: Education Pack
- Recommend: Research Pack
- Recommend: AI Evaluation Pack

## Opportunity Score

Each opportunity receives a score from 0 to 100 based on:

- Segment fit
- Pack adjacency
- Readiness evidence
- Expected outcome value
- Commercial priority

Opportunity bands:

- 85-100: high-confidence expansion
- 70-84: qualified expansion
- 50-69: nurture
- 0-49: monitor only

## Generated Views

The `/expansion-opportunities` page should generate:

- Customer segment cards.
- Current pack usage.
- Recommended next-best packs.
- Opportunity score and commercial motion.
- Evidence explaining why each recommendation is relevant.

## Acceptance

The platform can recommend commercial growth opportunities by showing clear upsell or cross-sell recommendations for each supported customer segment.

## Verification

Verification should cover:

- Hospitals using Emergency Pack receive ICU Pack and Simulation Pack recommendations.
- Universities using Education Pack receive Research Pack and AI Evaluation Pack recommendations.
- Each recommendation has an opportunity score, motion, and evidence.
- `/expansion-opportunities` renders customer expansion opportunities and route smoke coverage includes the page.

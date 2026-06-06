# Subscription Lifecycle Engine Report

## Goal

CareDroid should behave like a real SaaS product by enforcing subscription plans, lifecycle states, entitlement access, upgrade paths, downgrade paths, and trial conversion rules through a consistent lifecycle engine.

## Supported Plans

- Trial
- Starter
- Professional
- Enterprise
- Academic
- Government

## Supported States

- Active
- Suspended
- Expired
- Cancelled
- Pending

## Lifecycle Behaviors

- Active subscriptions grant entitlements for the current plan.
- Pending subscriptions are allowed during checkout, onboarding, or organization provisioning and should expose only pending-safe baseline access.
- Suspended subscriptions preserve the customer record but block paid entitlements until reactivated or paid.
- Expired subscriptions represent trials or term subscriptions that reached the end date and should require conversion or renewal.
- Cancelled subscriptions should retain account visibility but remove paid plan entitlements.

## Entitlement Engine

The entitlement engine should resolve a normalized subscription lifecycle for an organization/user and answer whether a requested feature, asset, pack, or billing action is available. It should combine:

- Plan tier
- Lifecycle state
- Trial end date
- Cancellation date
- Renewal/current period dates
- Feature requirements

## Upgrade Path

Upgrades should move customers from lower tiers to higher tiers without losing tenant context. Valid upgrade targets include:

- Trial to Starter, Professional, Enterprise, Academic, or Government
- Starter to Professional, Enterprise, Academic, or Government
- Professional to Enterprise, Academic, or Government
- Academic to Enterprise or Government when allowed by sales/compliance

## Downgrade Path

Downgrades should preserve tenant ownership while reducing entitlements at the next effective plan. Valid downgrade targets include:

- Enterprise to Professional, Starter, Academic, or Government
- Professional to Starter or Academic
- Academic to Starter
- Government to Enterprise only when migrating out of government compliance mode

## Trial Conversion

Trial subscriptions should convert to a paid or contracted plan before expiration. Conversion should:

- Require an active or pending trial.
- Select the requested target plan.
- Move lifecycle state to Active by default.
- Clear trial-specific expiration behavior.
- Preserve organization and tenant identifiers.

## Acceptance Mapping

The platform behaves like a real SaaS product when subscription state, plan movement, entitlement access, and trial conversion are enforced consistently across backend services and exposed through lifecycle-aware APIs.

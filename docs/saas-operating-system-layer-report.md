# SaaS Operating System Layer Report

## Goal

CareDroid should operate as a configurable Healthcare SaaS platform rather than a collection of disconnected features. The SaaS operating system layer should unify organization, subscription, products, asset packs, assets, workspaces, users, AI agents, and automations into one administrative view.

## Route

- `/platform-admin`

## SaaS Concept Chain

Organization → Subscription → Products → Asset Packs → Assets → Workspaces → Users → AI Agents → Automations

## Required Overviews

- Organization overview
- Product overview
- Asset overview
- Automation overview
- Tenant overview
- Health overview

## Implementation Scope

The first implementation should provide a tenant-aware frontend route that summarizes the connected SaaS layers from existing platform context, customer portal, success center, marketplace, readiness, and administrative surfaces. It should use stable concept ids and deterministic summary models so backend-backed operating system data can replace local aggregation later without changing the route contract.

## Safety Rules

- The operating system view must be organization and tenant aware.
- It must not expose cross-tenant information.
- Overview metrics should be explainable and derived from available platform context or deterministic defaults.
- Administrative links should route to existing owner surfaces for deeper configuration.

## Acceptance Mapping

CareDroid behaves as a configurable Healthcare SaaS platform when `/platform-admin` shows the connected operating model across organization, subscription, products, asset packs, assets, workspaces, users, AI agents, automations, tenant posture, and health in one place.

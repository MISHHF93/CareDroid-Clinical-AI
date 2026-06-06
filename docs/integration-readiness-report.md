# Integration Readiness Center Report

## Overview

The Integration Readiness Center adds a dedicated `/integration-readiness` route for tracking interoperability readiness without replacing the existing Integration Marketplace. The marketplace continues to expose its current `available`, `roadmap`, and `beta` statuses, while the readiness center normalizes those values into the requested readiness vocabulary.

## Required Integration Categories

The readiness projection returns the eight required categories in a stable order:

- FHIR
- HL7
- PACS
- LIS
- EMR/EHR
- Identity Providers
- Government APIs
- Scheduling Systems

Most rows reuse existing integration marketplace offerings. LIS maps to the existing laboratory integration category, and EMR/EHR now has its own seeded integration category and marketplace offering.

## Readiness Status Vocabulary

The readiness center uses only these statuses:

- `supported`
- `planned`
- `demo`
- `unavailable`

Existing marketplace statuses are preserved and translated as follows:

- `available` -> `supported`
- `roadmap` -> `planned`
- `beta` -> `demo`
- missing marketplace row -> `unavailable`

Each readiness row also includes `sourceStatus` so consumers can see the originating marketplace status when one exists.

## Backend Implementation

The backend adds `IntegrationReadinessStatus` and `IntegrationCategory.EMR_EHR` in the product catalog enums. Seed data now includes an `EMR/EHR Connector` row and keeps the existing marketplace rows for FHIR, HL7, LIS, PACS, Identity Providers, Government APIs, Scheduling Systems, and Telehealth.

`ProductCatalogService.getIntegrationReadiness()` builds the readiness projection from integration offerings and returns:

- `integrations`: the stable eight-row readiness list
- `summary`: counts for supported, planned, demo, and unavailable rows
- `statuses`: the allowed readiness statuses
- `generatedAt`: response timestamp

The API endpoint is `GET /api/integration-readiness`. The existing `GET /api/integrations-marketplace` endpoint remains unchanged.

## Frontend Implementation

The frontend adds `ProductCatalogApi.getIntegrationReadiness()` and a new `IntegrationReadinessPage` at `/integration-readiness`.

The page renders:

- summary cards for supported, planned, demo, and unavailable counts
- a card for each of the eight required integration types
- normalized readiness status and source marketplace status
- docs links and linked asset IDs when available
- a request enablement button that reuses the existing marketplace request API for rows with a marketplace slug

The route is registered in `App.jsx`, `routes.config.js`, and `navigation.config.js`.

## Verification

Targeted verification passed:

- `cd backend && npm test -- src/modules/product-catalog/product-catalog.service.spec.ts`
- `cd backend && npm run build`
- `npm run test:run -- src/pages/commercial/CommercialPages.test.jsx src/services/productCatalogApi.test.js src/routing/canonicalRouteRedirects.test.js`

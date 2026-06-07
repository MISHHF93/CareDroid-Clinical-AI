# Enterprise Readiness Center Report

## Goal

CareDroid should expose measurable enterprise readiness metrics that sales, implementation, and customer teams can use during customer conversations.

## Route

- `/enterprise-readiness`

## Readiness Dimensions

- SSO readiness
- RBAC readiness
- Tenant isolation
- Audit readiness
- Governance readiness
- Integration readiness
- Security readiness

## Generated Score

The readiness center should generate a 0-100 readiness score from weighted enterprise readiness dimensions. Each dimension should show status, score, evidence, and recommended next steps so teams can explain both strengths and gaps.

## Implementation Scope

The implementation should provide a customer-safe frontend route that summarizes enterprise posture using existing platform readiness surfaces where available, including integration readiness, governance, audit, security, tenant isolation, and role-based access control signals. The first implementation can use deterministic in-app readiness models and should keep stable metric ids so backend data sources can be attached later.

## Safety Rules

- Readiness output should be tenant and organization aware.
- Scores should be explainable and deterministic.
- Security and tenant-isolation findings should be phrased as readiness indicators, not as guarantees.
- Recommendations should be actionable for sales engineering, implementation, and customer administrators.

## Acceptance Mapping

Sales conversations can use measurable readiness metrics when `/enterprise-readiness` shows a generated score, scored readiness dimensions, evidence, and next steps for SSO, RBAC, tenant isolation, audit, governance, integrations, and security.

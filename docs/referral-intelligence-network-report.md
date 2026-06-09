# Referral Intelligence Network Report

## Goal

Referral Intelligence Network tracks all Emergency Workspace referrals so consult, transfer, specialty, and follow-up delays become measurable. The network turns referral work into a visible operating flow instead of scattered messages and manual status checks.

## Referral Flow

The canonical referral flow is:

1. Request
2. Classification
3. Department Queue
4. Review
5. Accepted
6. Closed

Every referral should have a current state, department owner, elapsed time, and delay status.

## Departments

The Emergency Workspace tracks referrals for:

- Cardiology
- Neurology
- Psychiatry
- Internal Medicine
- Surgery

## ReferralHub Contract

`ReferralHub` provides:

- canonical referral stages and department queues
- active referral rows with department, state, priority, elapsed time, and patient context
- delay detection by state and department
- referral metrics for total active referrals, delayed referrals, accepted referrals, and closed referrals
- recommendations that route staff to the queues most likely to delay disposition or follow-up

The hub does not send referrals, accept consults, close cases, or write to external systems. It measures status and prepares review context for humans.

## Dashboard Route

The dashboard is mounted at:

`/workspace/emergency/referrals`

The route stays inside the Emergency Workspace and should show department queues, referral flow state, measurable delays, and recommended next actions.

## Acceptance Mapping

Acceptance is met when referral delays are visible as metrics, department queues, delayed referral rows, and review recommendations on `/workspace/emergency/referrals`.

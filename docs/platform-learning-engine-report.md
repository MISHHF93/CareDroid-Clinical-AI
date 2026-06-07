# Platform Learning Engine Report

## Summary

The Platform Learning Engine helps CareDroid improve itself from usage patterns. It observes safe operational signals across workflows, simulations, searches, page engagement, and asset launches, then generates optimization suggestions that keep the platform relevant and easier to navigate.

The engine is a decision-support layer for platform optimization. It recommends changes for administrators and product owners to review; it does not automatically hide, merge, remove, or promote capabilities without human approval.

## Tracked Signals

| Signal | Purpose |
| --- | --- |
| Successful workflows | Identify repeatable workflows that should be promoted, packaged, or automated |
| Successful simulations | Identify training scenarios that produce high-value outcomes or role readiness |
| Common searches | Identify repeated discovery intent and missing navigation shortcuts |
| Abandoned pages | Identify surfaces that users open but leave without useful engagement |
| Failed launches | Identify tools, assets, routes, or workflows that fail to open or are blocked |

Tracked signals should be stored and processed as safe metadata: IDs, categories, counts, routes, timestamps, status, and short labels. Raw PHI, raw prompts, raw clinical notes, and raw search text are not required for optimization.

## Generated Optimization Suggestions

| Suggestion Type | Example |
| --- | --- |
| Merge tools | Combine overlapping tools when users repeatedly switch between them for the same workflow |
| Hide unused assets | Recommend hiding or deprioritizing assets with low usage and no recent launches |
| Promote high-value assets | Promote frequently successful workflows, simulations, tools, packs, or protocols |
| Improve discovery | Add shortcuts when common searches repeatedly lead to the same assets |
| Repair launches | Flag failed launches, blocked routes, and unsupported assets for remediation |

## Learning Loop

1. Capture safe usage signals from existing telemetry, user activity, memory, recommendations, simulations, workflows, and routing.
2. Normalize signals into asset, workflow, simulation, search, page, and launch summaries.
3. Score opportunities by impact, confidence, and operational value.
4. Present optimization suggestions with rationale and source signal counts.
5. Let humans review and apply changes through existing platform configuration, asset, pack, and navigation workflows.

## Acceptance

Acceptance is met when CareDroid can continuously surface optimization suggestions from platform usage, including suggestions to merge tools, hide unused assets, promote high-value assets, improve discovery, and repair failed launches.

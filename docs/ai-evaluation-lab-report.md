# AI Evaluation Lab Report

## Summary

The AI Evaluation Lab makes AI quality measurable across CareDroid. It tracks quality, safety, reliability, speed, and cost signals for AI runs, then compares models, prompts, agents, and RAG strategies before release or production promotion.

The lab is an evaluation and governance surface. It supports human review of AI quality trends and benchmark gates; it does not automatically approve clinical AI changes or replace clinical validation.

## Route

The canonical route is `/ai-evaluation`.

The legacy `/ai/evaluation` path should remain available as an alias so existing tool registry entries and bookmarked links continue to resolve.

## Tracked Metrics

| Metric | Purpose |
| --- | --- |
| Model quality | Composite quality signal across accuracy, retrieval, tool execution, workflow completion, hallucination, latency, and cost |
| Hallucination rate | Unsupported factual claims divided by total factual claims |
| Tool-call success | Successful tool executions divided by attempted tool executions |
| Workflow success | Completed AI-assisted workflows divided by attempted workflows |
| Latency | Median end-to-end response latency for evaluated runs |
| Cost | Inference, retrieval, and tool orchestration cost per evaluation run |

Additional supporting metrics such as accuracy, retrieval precision, and user satisfaction can remain visible because they explain the composite quality score.

## Comparison Dimensions

| Dimension | Examples |
| --- | --- |
| Models | Clinical assistant, MoE router, specialty model candidates |
| Prompts | System prompts, role prompts, refusal prompts, workflow prompts |
| Agents | Clinical assistant, documentation assistant, routing agent, command center agent |
| RAG strategies | Guideline RAG, hybrid retrieval, memory-augmented retrieval, citation-first retrieval |

Each comparison should show aggregate score, benchmark posture, and tradeoffs across hallucination rate, tool-call success, workflow success, latency, and cost.

## Evaluation Loop

1. Capture evaluation runs from curated datasets, raw scoring counters, AI workflow outcomes, tool-call logs, and retrieval tests.
2. Normalize runs into a shared metric contract.
3. Aggregate benchmark gates for release readiness.
4. Compare models, prompts, agents, and RAG strategies using the same metrics.
5. Surface quality gaps and tradeoffs for human review.

## Acceptance

Acceptance is met when AI quality becomes measurable: CareDroid can show benchmarked quality metrics and compare models, prompts, agents, and RAG strategies across model quality, hallucination rate, tool-call success, workflow success, latency, and cost.

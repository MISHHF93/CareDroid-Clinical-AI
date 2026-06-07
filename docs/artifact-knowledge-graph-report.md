# Artifact Knowledge Graph Report

## Summary

The Artifact Knowledge Graph turns captured CareDroid artifacts into a connected platform map for product, operational, clinical, AI, and integration discovery.

The graph is built from the existing artifact intelligence pipeline, mounted asset inventory, route registry, marketplace catalog, and AI model registry. It is designed to answer five questions:

- Which assets, packs, products, workspaces, organizations, roles, routes, simulations, workflows, AI agents, and integrations exist?
- How do they use, depend on, belong to, launch from, recommend, resemble, or compose each other?
- Which nodes are orphaned or duplicated?
- Which graph neighbors should be recommended for a selected node?
- Are all captured assets connected to the graph?

## Node Taxonomy

| Node Type | Source |
| --- | --- |
| `asset` | Mounted user-facing asset inventory and artifact catalog |
| `pack` | SaaS asset pack projection |
| `product` | SaaS product projection |
| `workspace` | Asset workspace ownership and pack workspace metadata |
| `organization` | Organization type metadata from asset access rules |
| `role` | Asset role metadata from segmentation and access rules |
| `route` | Canonical route records and asset launch paths |
| `simulation` | Captured simulation artifacts and marketplace simulations |
| `workflow` | Captured workflow artifacts and marketplace workflows |
| `ai-agent` | Marketplace AI agents and AI model registry dependencies |
| `integration` | Marketplace integrations and dependency metadata |

## Relationship Taxonomy

| Relationship | Meaning |
| --- | --- |
| `USES` | Source invokes or consumes the target capability |
| `DEPENDS_ON` | Source requires the target route, service, artifact, or dependency |
| `BELONGS_TO` | Source is owned by or categorized under the target |
| `RECOMMENDED_FOR` | Source is recommended for the target role, workspace, or organization |
| `SIMILAR_TO` | Source is textually or categorically similar to the target |
| `LAUNCHED_FROM` | Source is opened from the target route |
| `PART_OF` | Source composes into the target pack, product, workflow, or platform area |

## Explorer Features

- Graph explorer: search and filter typed nodes, select a node, and inspect direct neighbors.
- Relationship explorer: list normalized source, relationship, target, and rationale rows.
- Orphan detection: identify nodes without graph relationships, with the acceptance check focused on asset coverage.
- Duplicate detection: group nodes that share a normalized type and label.
- Recommendation engine: rank neighboring, similar, and role/workspace-relevant nodes for a selected node.

## Acceptance Invariant

Every mounted asset from `buildAssetInventoryProjection()` must be represented by an `asset` node and must have at least one graph edge.

The primary connectivity paths are:

- `asset BELONGS_TO pack`
- `pack PART_OF product`
- `asset LAUNCHED_FROM route`
- `asset RECOMMENDED_FOR role`
- `asset RECOMMENDED_FOR workspace`
- `asset DEPENDS_ON dependency`
- `asset SIMILAR_TO related artifact or asset`

## Implementation Notes

The graph should reuse current source-of-truth modules instead of introducing a parallel catalog. The frontend service owns local graph construction and analysis for offline/demo behavior, while the existing backend artifact graph remains available at `/api/artifacts/graph`.

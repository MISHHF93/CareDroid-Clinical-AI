import { describe, expect, it } from 'vitest';
import {
  buildKnowledgeGraphAiPrompt,
  buildKnowledgeGraphSnapshot,
  CLINICAL_KNOWLEDGE_GRAPH_EDGES,
  CLINICAL_KNOWLEDGE_GRAPH_NODES,
  getKnowledgeGraphNeighbors,
  KNOWLEDGE_GRAPH_NODE_TYPES,
  searchKnowledgeGraph,
} from './clinicalKnowledgeGraph';

describe('clinicalKnowledgeGraph', () => {
  it('covers calculators, protocols, simulations, labs, devices, and AI workflows', () => {
    const nodeTypes = new Set(CLINICAL_KNOWLEDGE_GRAPH_NODES.map((node) => node.type));

    expect([...nodeTypes].sort()).toEqual([...KNOWLEDGE_GRAPH_NODE_TYPES].sort());
    expect(CLINICAL_KNOWLEDGE_GRAPH_EDGES.length).toBeGreaterThan(0);
  });

  it('searches graph nodes and builds visible relationship snapshots', () => {
    const sepsisNodes = searchKnowledgeGraph('sepsis');
    const deviceNodes = searchKnowledgeGraph('', 'device');
    const snapshot = buildKnowledgeGraphSnapshot({ query: 'sepsis', selectedNodeId: 'protocol-sepsis' });

    expect(sepsisNodes.map((node) => node.id)).toContain('protocol-sepsis');
    expect(deviceNodes.every((node) => node.type === 'device')).toBe(true);
    expect(snapshot.selectedNode.id).toBe('protocol-sepsis');
    expect(snapshot.neighbors.map(({ node }) => node.id)).toEqual(
      expect.arrayContaining(['qsofa', 'lab-lactate', 'simulation-sepsis'])
    );
  });

  it('builds AI prompts from selected graph relationships', () => {
    const neighbors = getKnowledgeGraphNeighbors('ai-cds');
    const prompt = buildKnowledgeGraphAiPrompt(CLINICAL_KNOWLEDGE_GRAPH_NODES.find((node) => node.id === 'ai-cds'));

    expect(neighbors.length).toBeGreaterThan(0);
    expect(prompt).toMatch(/Clinical Decision Support Engine/i);
    expect(prompt).toMatch(/calculators, protocols, simulations, labs, devices, and AI workflows/i);
  });
});

import { describe, it, expect } from 'vitest';
import { integrationFabricService } from './integrationFabricService';

describe('CareDroid Frontend Integration Fabric Service', () => {
  it('should return all 12 Gateways with ONLINE health status and security policies', async () => {
    const gateways = await integrationFabricService.getGateways();
    expect(gateways.length).toBe(12);
    expect(gateways.every((g) => g.status === 'ONLINE')).toBe(true);

    const mcpGw = gateways.find((g) => g.gatewayId === 'MCP_GATEWAY');
    expect(mcpGw).toBeDefined();
    expect(mcpGw?.securityPoliciesEnforced).toContain('JSON-RPC 2.0 Spec');
  });

  it('should return fabric KPI stats with 12 online gateways', async () => {
    const stats = await integrationFabricService.getStats();
    expect(stats.gatewaysOnlineCount).toBe(12);
    expect(stats.totalConnectors).toBeGreaterThanOrEqual(6);
    expect(stats.averageLatencyMs).toBeGreaterThan(0);
  });

  it('should list connectors and filter by category', async () => {
    const all = await integrationFabricService.listConnectors();
    expect(all.length).toBeGreaterThanOrEqual(6);

    const mcpConnectors = await integrationFabricService.listConnectors('mcp');
    expect(mcpConnectors.every((c) => c.category === 'mcp_server')).toBe(true);

    const a2aConnectors = await integrationFabricService.listConnectors('a2a');
    expect(a2aConnectors.every((c) => c.category === 'a2a_agent')).toBe(true);
  });

  it('should simulate diagnostic test ping on connector', async () => {
    const res = await integrationFabricService.testConnector('conn-mcp-caredroid');
    expect(res.connectorId).toBe('conn-mcp-caredroid');
    expect(res.healthStatus).toBe('HEALTHY');
    expect(res.latencyMs).toBeGreaterThan(0);
  });

  it('should return approved CareDroid MCP tools and execute tool call', async () => {
    const tools = await integrationFabricService.getMcpTools();
    expect(tools.length).toBeGreaterThanOrEqual(7);

    const facilityTool = tools.find((t) => t.name === 'caredroid.facilities.search');
    expect(facilityTool).toBeDefined();

    const execResult = await integrationFabricService.executeMcpTool(
      'caredroid.facilities.search',
      {
        query: 'Metro',
      },
    );
    expect(execResult.content).toBeDefined();
    expect(execResult.content[0].text).toBeDefined();
  });

  it('should list 8 specialized A2A domain agents with skills', async () => {
    const agents = await integrationFabricService.listA2aAgents();
    expect(agents.length).toBe(8);
    const ids = agents.map((a) => a.id);
    expect(ids).toContain('a2a-healthcare-ops');
    expect(ids).toContain('a2a-medical-logistics');
    expect(ids).toContain('a2a-recognition-intel');
  });

  it('should parse HL7 v2 message and generate valid ACK', async () => {
    const sampleHl7 =
      'MSH|^~\\&|EPIC|HOSP|||20261009||ADT^A01|MSG-01|P|2.5\rPID|1||MRN-101||TEST^PATIENT';
    const result = await integrationFabricService.parseHl7v2(sampleHl7);
    expect(result.parsed.messageType).toBe('ADT^A01');
    expect(result.ackMessage).toContain('ACK^A01');
  });

  it('should manage 20-step medical logistics workflow executions', async () => {
    const executions = await integrationFabricService.listWorkflowExecutions();
    expect(executions.length).toBeGreaterThanOrEqual(1);

    const first = executions[0];
    expect(first.stepLogs.length).toBe(20);
    expect(first.payloadColdChainSnapshot.targetCelsius).toBe(4.0);
    expect(first.custodyTransferEvidence?.tamperSealIntact).toBe(true);
  });
});

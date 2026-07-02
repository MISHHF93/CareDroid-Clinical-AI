/**
 * CareDroid MCP server (stdio): exposes clinical tools, resources, and a prompt
 * aligned with the Model Context Protocol using @modelcontextprotocol/sdk.
 *
 * Configure Cursor / Claude Desktop with command: node
 * args: ["<repo>/mcp/src/server.mjs"]
 * env: CAREDROID_API_URL (default http://localhost:8000), CAREDROID_JWT (Bearer for /api/tools)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const CLINICAL_TOOLS = [
  {
    id: 'sofa-calculator',
    name: 'SOFA Score Calculator',
    description: 'Sequential Organ Failure Assessment for ICU organ dysfunction.',
  },
  {
    id: 'drug-interactions',
    name: 'Drug Interaction Checker',
    description: 'Drug–drug interactions; requires medications[] (at least two names).',
  },
  {
    id: 'lab-interpreter',
    name: 'Lab Results Interpreter',
    description: 'Interpret labValues[] with name, value, unit, referenceRange, status.',
  },
];

const README = `# CareDroid MCP bridge

This server speaks **MCP over stdio** and proxies tool calls to the Nest API:

- \`POST {CAREDROID_API_URL}/api/tools/:toolId/execute\` (global prefix \`api\`)

Environment:

| Variable | Default | Purpose |
|----------|---------|---------|
| CAREDROID_API_URL | http://localhost:8000 | App origin (Vite proxies /api to Nest) |
| CAREDROID_JWT | (empty) | \`Authorization: Bearer …\` for JWT-protected routes |

Clinical tool IDs match the backend registry: \`sofa-calculator\`, \`drug-interactions\`, \`lab-interpreter\`.
`;

async function executeOnBackend(toolId, parameters, conversationId) {
  const base = (process.env.CAREDROID_API_URL || 'http://localhost:8000').replace(/\/$/, '');
  const token = process.env.CAREDROID_JWT || '';
  const url = `${base}/api/tools/${encodeURIComponent(toolId)}/execute`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      parameters,
      conversationId: conversationId ?? 'mcp-session',
    }),
  });
  const raw = await res.text();
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    body = { raw };
  }
  if (!res.ok) {
    const msg =
      body && typeof body === 'object' && 'message' in body
        ? String(body.message)
        : `HTTP ${res.status}`;
    throw new Error(`${msg}: ${typeof raw === 'string' ? raw.slice(0, 500) : ''}`);
  }
  return body;
}

const server = new McpServer(
  { name: 'caredroid-clinical', version: '1.0.0' },
  {
    instructions:
      'CareDroid clinical MCP bridge. Use caredroid_execute_clinical_tool with a toolId and parameters. Requires a running backend; set CAREDROID_JWT unless your deployment exposes tools without auth.',
  },
);

server.registerTool(
  'caredroid_execute_clinical_tool',
  {
    title: 'Execute CareDroid clinical tool',
    description:
      'Runs SOFA calculator, drug interaction checker, or lab interpreter via the CareDroid Tool Orchestrator API.',
    inputSchema: {
      toolId: z.enum(['sofa-calculator', 'drug-interactions', 'lab-interpreter']),
      parameters: z.record(z.string(), z.unknown()),
      conversationId: z.string().optional(),
    },
  },
  async ({ toolId, parameters, conversationId }) => {
    try {
      const data = await executeOnBackend(toolId, parameters, conversationId);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: message }],
        isError: true,
      };
    }
  },
);

server.registerResource(
  'mcp-readme',
  'caredroid://clinical/mcp-readme',
  { description: 'How to configure this MCP server and call the backend', mimeType: 'text/markdown' },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: 'text/markdown', text: README }],
  }),
);

server.registerResource(
  'tool-registry',
  'caredroid://clinical/tool-registry',
  { description: 'Clinical tool identifiers mirrored from the backend registry', mimeType: 'application/json' },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify({ tools: CLINICAL_TOOLS }, null, 2),
      },
    ],
  }),
);

server.registerPrompt(
  'caredroid_clinical_tool_brief',
  {
    title: 'Clinical tool call brief',
    description: 'Structured reminder of tool IDs and parameter shapes before calling tools.',
    argsSchema: {
      intent: z.string().describe('What the clinician wants to compute or check'),
    },
  },
  async ({ intent }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Intent: ${intent}

Use tool caredroid_execute_clinical_tool with one of:
- sofa-calculator: hemodynamic / vent / labs fields per SOFA (see backend schema).
- drug-interactions: { "medications": ["Drug A","Drug B"], "severityFilter"?: "all"|... }
- lab-interpreter: { "labValues": [...], "patientAge"?, "patientSex"?, "clinicalContext"? }

Then call caredroid_execute_clinical_tool with the chosen toolId and parameters JSON.`,
        },
      },
    ],
  }),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

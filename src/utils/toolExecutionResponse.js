/**
 * Normalizes Nest ToolExecutionResponseDto JSON from POST /api/tools/:id/execute.
 * Top-level shape: { success, toolId, toolName, result: { success, data, errors?, ... }, executionTimeMs? }
 */
export function parseToolExecutionResponse(json) {
  if (!json || typeof json !== 'object') {
    return { ok: false, data: null, errors: ['Empty response'] };
  }

  if (json.result && typeof json.result === 'object') {
    const inner = json.result;
    const ok = Boolean(json.success !== false && inner.success !== false);
    return {
      ok,
      data: inner.data ?? null,
      errors: inner.errors || (ok ? [] : ['Tool execution failed']),
      toolId: json.toolId,
      toolName: json.toolName,
    };
  }

  if (json.data?.result && typeof json.data.result === 'object') {
    const inner = json.data.result;
    const ok = Boolean(json.data.success !== false && inner.success !== false);
    return {
      ok,
      data: inner.data ?? null,
      errors: inner.errors || [],
      toolId: json.data.toolId,
      toolName: json.data.toolName,
    };
  }

  return { ok: false, data: null, errors: ['Unexpected tool response shape'] };
}

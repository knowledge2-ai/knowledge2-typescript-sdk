import { BaseResource } from "./base-resource.js";

interface AgentCard {
  name: string;
  description: string;
  url: string;
  provider: { organization: string; url: string };
  version: string;
  capabilities: Record<string, unknown>;
  authentication: { schemes: string[] };
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: Array<{
    id: string;
    name: string;
    description: string;
    tags: string[];
  }>;
}

interface A2ATask {
  id: string;
  contextId: string;
  status: {
    state: "submitted" | "working" | "completed" | "failed" | "canceled";
    timestamp?: string;
    message?: unknown;
  };
  artifacts?: Array<{
    artifactId: string;
    name?: string;
    parts: Array<{ kind: string; text?: string; data?: unknown }>;
  }>;
  history?: unknown[];
  metadata?: Record<string, unknown>;
  kind?: "task";
}

interface JsonRpcResponse<T> {
  jsonrpc: "2.0";
  id: string;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

export class A2AResource extends BaseResource {
  /** Get the agent card for a Knowledge Agent. */
  async getAgentCard(agentId: string) {
    return this.client.request<AgentCard>(
      "GET",
      `/a2a/v1/knowledge-agents/${this.encodePath(agentId)}/.well-known/agent.json`,
    );
  }

  /** Send a JSON-RPC message/send to a Knowledge Agent. */
  async sendMessage(
    agentId: string,
    params: {
      message: {
        messageId: string;
        role: string;
        parts: Array<{ kind: string; text?: string; data?: unknown }>;
        metadata?: Record<string, unknown>;
        contextId?: string;
      };
      configuration?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    },
  ) {
    const envelope = {
      jsonrpc: "2.0" as const,
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
      method: "message/send" as const,
      params,
    };

    // Bypass BaseClient's deepCamelToSnake — A2A uses camelCase natively (JSON-RPC 2.0)
    const blob = new Blob([JSON.stringify(envelope)], { type: "application/json" });

    const response = await this.client.request<JsonRpcResponse<A2ATask>>(
      "POST",
      `/a2a/v1/knowledge-agents/${this.encodePath(agentId)}`,
      { body: blob },
    );

    if (!response?.result) {
      const err = response?.error;
      if (err) {
        throw new Error(
          `A2A JSON-RPC error ${err.code}: ${err.message}`,
        );
      }
      throw new Error("A2A JSON-RPC response missing result");
    }

    return response.result;
  }

  /** Convenience: send an "answer" operation to a Knowledge Agent. */
  async answer(
    agentId: string,
    query: string,
    options?: { contextId?: string; topK?: number; filters?: Record<string, unknown> },
  ) {
    const parts: Array<{ kind: string; text?: string; data?: unknown }> = [
      { kind: "text", text: query },
    ];
    const dataPayload: Record<string, unknown> = {};
    if (options?.topK !== undefined) dataPayload.top_k = options.topK;
    if (options?.filters !== undefined) dataPayload.filters = options.filters;
    if (Object.keys(dataPayload).length > 0) {
      parts.push({ kind: "data", data: dataPayload });
    }

    return this.sendMessage(agentId, {
      message: {
        messageId: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
        role: "user",
        parts,
        metadata: { operation: "answer" },
        ...(options?.contextId ? { contextId: options.contextId } : {}),
      },
    });
  }

  /** Convenience: send a "retrieve" operation to a Knowledge Agent. */
  async retrieve(
    agentId: string,
    query: string,
    options?: { contextId?: string; topK?: number; filters?: Record<string, unknown> },
  ) {
    const parts: Array<{ kind: string; text?: string; data?: unknown }> = [
      { kind: "text", text: query },
    ];
    const dataPayload: Record<string, unknown> = {};
    if (options?.topK !== undefined) dataPayload.top_k = options.topK;
    if (options?.filters !== undefined) dataPayload.filters = options.filters;
    if (Object.keys(dataPayload).length > 0) {
      parts.push({ kind: "data", data: dataPayload });
    }

    return this.sendMessage(agentId, {
      message: {
        messageId: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
        role: "user",
        parts,
        metadata: { operation: "retrieve" },
        ...(options?.contextId ? { contextId: options.contextId } : {}),
      },
    });
  }
}

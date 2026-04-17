import { BaseResource } from "./base-resource.js";

interface Agent {
  id: string;
  name: string;
  description?: string;
  corpusId: string;
  projectId?: string;
  status: "draft" | "active" | "archived";
  model?: string;
  systemPrompt?: string;
  queryCount?: number;
  lastInvokedAt?: string;
  taskType?: string;
  instructions?: string;
  sourceAgents?: Array<{ agentId: string; agentName?: string; mode: string }>;
  toolConfig?: Record<string, unknown>;
  parentAgentId?: string;
  createdAt: string;
  updatedAt: string;
}

interface AgentChatResponse {
  answer: string;
  model: string;
  results: Array<{
    chunkId: string;
    score?: number;
    rawScore?: number;
    text?: string;
    customMetadata?: Record<string, unknown>;
    systemMetadata?: Record<string, unknown>;
  }>;
  usedSources: string[];
  meta?: Record<string, unknown>;
}

interface AgentRunResponse {
  jobId: string;
  status: string;
}

interface AgentRun {
  id: string;
  agentId: string;
  status: string;
  taskType: string;
  createdAt: string;
  completedAt?: string;
}

interface AgentSubscription {
  id: string;
  agentId: string;
  feedId: string;
  feedName?: string;
  feedActivationStatus?: string;
  role: "input" | "output";
  createdAt: string;
}

interface TaskTypeInfo {
  id: string;
  name: string;
  description: string;
  outputSchema?: Record<string, unknown>;
  supportsChat: boolean;
}

export class AgentsResource extends BaseResource {
  /** Create a new agent. */
  async create(body: {
    name: string;
    description?: string;
    corpusId: string;
    projectId?: string;
    model?: string;
    systemPrompt?: string;
    taskType?: string;
    instructions?: string;
    sourceAgents?: Array<{ agentId: string; mode: string }>;
    toolConfig?: Record<string, unknown>;
  }) {
    return this.client.request<Agent>("POST", "/v1/agents", { body });
  }

  /** Get a single agent. */
  async get(agentId: string) {
    return this.client.request<Agent>(
      "GET",
      `/v1/agents/${this.encodePath(agentId)}`,
    );
  }

  /** List agents with manual pagination. */
  async list(options?: {
    projectId?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.client.request<{ agents: Agent[] }>("GET", "/v1/agents", {
      params: {
        limit: options?.limit ?? 100,
        offset: options?.offset ?? 0,
        ...(options?.projectId ? { project_id: options.projectId } : {}),
      },
    });
  }

  /** Iterate over all agents with automatic pagination. */
  async *listAll(options?: { limit?: number; projectId?: string }) {
    yield* this.client.paginate<Agent>("GET", "/v1/agents", "agents", {
      limit: options?.limit ?? 100,
      params: options?.projectId ? { project_id: options.projectId } : undefined,
    });
  }

  /** Update an agent. */
  async update(
    agentId: string,
    body: {
      name?: string;
      description?: string;
      model?: string;
      systemPrompt?: string;
      taskType?: string;
      instructions?: string;
      sourceAgents?: Array<{ agentId: string; mode: string }>;
      toolConfig?: Record<string, unknown>;
    },
  ) {
    return this.client.request<Agent>(
      "PATCH",
      `/v1/agents/${this.encodePath(agentId)}`,
      { body },
    );
  }

  /** Delete an agent. */
  async delete(agentId: string) {
    return this.client.request(
      "DELETE",
      `/v1/agents/${this.encodePath(agentId)}`,
    );
  }

  /** Chat with an agent. */
  async chat(agentId: string, body: { query: string; topK?: number }) {
    return this.client.request<AgentChatResponse>(
      "POST",
      `/v1/agents/${this.encodePath(agentId)}/chat`,
      { body },
    );
  }

  /** Run an agent task. */
  async run(
    agentId: string,
    body: {
      inputChunks: Array<{
        text: string;
        metadata?: Record<string, unknown>;
      }>;
      topK?: number;
    },
  ) {
    return this.client.request<AgentRunResponse>(
      "POST",
      `/v1/agents/${this.encodePath(agentId)}/run`,
      { body },
    );
  }

  /** List runs for an agent. */
  async listRuns(
    agentId: string,
    options?: { limit?: number; offset?: number },
  ) {
    return this.client.request<{ runs: AgentRun[]; total: number }>(
      "GET",
      `/v1/agents/${this.encodePath(agentId)}/runs`,
      {
        params: {
          limit: options?.limit ?? 100,
          offset: options?.offset ?? 0,
        },
      },
    );
  }

  /** List available task types. */
  async taskTypes() {
    return this.client.request<{ taskTypes: TaskTypeInfo[] }>(
      "GET",
      "/v1/agents/task-types",
    );
  }

  private _subscriptions:
    | {
        create(
          agentId: string,
          body: { feedId: string; role: "input" | "output" },
        ): Promise<AgentSubscription | undefined>;
        list(
          agentId: string,
        ): Promise<{ subscriptions: AgentSubscription[] } | undefined>;
        delete(
          agentId: string,
          subscriptionId: string,
        ): Promise<unknown | undefined>;
      }
    | undefined;

  /** Manage agent feed subscriptions. */
  get subscriptions() {
    if (!this._subscriptions) {
      this._subscriptions = {
        /** Create a feed subscription for an agent. */
        create: async (
          agentId: string,
          body: { feedId: string; role: "input" | "output" },
        ) => {
          return this.client.request<AgentSubscription>(
            "POST",
            `/v1/agents/${this.encodePath(agentId)}/subscriptions`,
            { body },
          );
        },

        /** List feed subscriptions for an agent. */
        list: async (agentId: string) => {
          return this.client.request<{
            subscriptions: AgentSubscription[];
          }>(
            "GET",
            `/v1/agents/${this.encodePath(agentId)}/subscriptions`,
          );
        },

        /** Delete a feed subscription. */
        delete: async (agentId: string, subscriptionId: string) => {
          return this.client.request(
            "DELETE",
            `/v1/agents/${this.encodePath(agentId)}/subscriptions/${this.encodePath(subscriptionId)}`,
          );
        },
      };
    }
    return this._subscriptions;
  }
}

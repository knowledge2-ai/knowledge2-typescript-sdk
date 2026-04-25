import { BaseResource } from "./base-resource.js";

interface Agent {
  id: string;
  name: string;
  description?: string;
  // The API allows `corpus_id` to be `null` (set via update(..., { corpusId: null }))
  // to detach an agent from its corpus. Narrowing to `string` here would let
  // consumers treat a cleared corpus as a string after update/get.
  corpusId: string | null;
  projectId?: string;
  status: "draft" | "active" | "archived";
  model?: string;
  systemPrompt?: string;
  queryCount?: number;
  lastInvokedAt?: string;
  taskType?: string;
  instructions?: string;
  // `intent_fallback` is present on every AgentResponse (default "broadcast")
  // in the OpenAPI spec. Exposing it here lets callers read back the value
  // they set via `update(..., { intentFallback })` without a type assertion.
  intentFallback?: IntentFallback;
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
  // `meta` is `dict | None` in the OpenAPI `AgentChatResponse` schema;
  // the backend returns `null` when no meta block is populated. Typing
  // as `| null` (not just `| undefined`) lets consumers branch on the
  // runtime null value without a type assertion.
  meta?: Record<string, unknown> | null;
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

type AgentSubscriptionMode = "always" | "explicit" | "nl_semantic";

interface AgentSubscription {
  id: string;
  agentId: string;
  feedId: string;
  feedName?: string;
  feedActivationStatus?: string;
  role: "input" | "output";
  // Note: `mode` and `threshold` are request-only inputs on
  // POST/PATCH subscription endpoints. The API's `SubscriptionResponse`
  // currently echoes back only `match_spec` / `match_spec_description`
  // (per the OpenAPI spec), so we do NOT expose them as response fields
  // here. Callers that need to round-trip a mode can store it server
  // side once the API response widens.
  //
  // `match_spec` and `match_spec_description` are `dict | None` /
  // `str | None` in the OpenAPI spec — the server returns `null` for
  // them on `mode="always"` subscriptions. Typing as `| null` (not just
  // `undefined`) lets consumers branch correctly on the null runtime
  // value instead of hitting a type mismatch when they try to read it.
  matchSpec?: Record<string, unknown> | null;
  matchSpecDescription?: string | null;
  createdAt: string;
}

type IntentFallback = "broadcast" | "empty" | "retry_wider";

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
      // `null` is the API-defined sentinel that clears `agent.corpus_id`.
      // `AgentUpdateRequest.corpus_id` is typed `string | null` in the
      // server OpenAPI spec; narrowing it to `string` here would block
      // the supported clear path at compile time.
      corpusId?: string | null;
      model?: string;
      systemPrompt?: string;
      taskType?: string;
      instructions?: string;
      sourceAgents?: Array<{ agentId: string; mode: string }>;
      toolConfig?: Record<string, unknown>;
      intentFallback?: IntentFallback;
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
  async chat(
    agentId: string,
    body: {
      query: string;
      topK?: number;
      filters?: Record<string, unknown>;
    },
  ) {
    return this.client.request<AgentChatResponse>(
      "POST",
      `/v1/agents/${this.encodePath(agentId)}/chat`,
      { body },
    );
  }

  /**
   * Chat against a draft or active agent for testing purposes.
   *
   * Preview: requires write access. Use `opts.version = "draft"` to force
   * testing the draft version, `"active"` to force the active version, or
   * omit to let the server pick (draft if it exists, else active).
   */
  async testChat(
    agentId: string,
    body: {
      query: string;
      topK?: number;
      filters?: Record<string, unknown>;
    },
    opts?: { version?: "draft" | "active" },
  ) {
    return this.client.request<AgentChatResponse>(
      "POST",
      `/v1/agents/${this.encodePath(agentId)}/test-chat`,
      {
        body,
        ...(opts?.version
          ? { params: { version: opts.version } }
          : {}),
      },
    );
  }

  /**
   * Activate a draft or archived agent.
   *
   * Validates that the agent's corpus is ready and the configured model is
   * available before transitioning to `active`.
   */
  async activate(agentId: string) {
    return this.client.request<Agent>(
      "POST",
      `/v1/agents/${this.encodePath(agentId)}/activate`,
    );
  }

  /** Archive an active agent (transitions status `active -> archived`). */
  async archive(agentId: string) {
    return this.client.request<Agent>(
      "POST",
      `/v1/agents/${this.encodePath(agentId)}/archive`,
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
          body: {
            feedId: string;
            role: "input" | "output";
            mode?: AgentSubscriptionMode;
            matchSpec?: Record<string, unknown>;
            matchSpecDescription?: string;
            threshold?: number;
          },
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
        /**
         * Create a feed subscription for an agent.
         *
         * `mode` chooses the authoring style:
         * - `"always"` matches every envelope (omit `matchSpec` and
         *   `matchSpecDescription`).
         * - `"explicit"` evaluates the provided `matchSpec` as-is.
         * - `"nl_semantic"` compiles `matchSpecDescription` into a semantic
         *   predicate on the server; `threshold` optionally tunes the cosine
         *   cutoff (server default `0.75`).
         *
         * Mutual-exclusion rules between `mode`, `matchSpec`, and
         * `matchSpecDescription` are enforced by the API (422 on violation);
         * the SDK passes fields through unchanged.
         */
        create: async (
          agentId: string,
          body: {
            feedId: string;
            role: "input" | "output";
            mode?: AgentSubscriptionMode;
            matchSpec?: Record<string, unknown>;
            matchSpecDescription?: string;
            threshold?: number;
          },
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

  private _drafts:
    | {
        create(agentId: string): Promise<Agent | undefined>;
        get(agentId: string): Promise<Agent | undefined>;
        discard(agentId: string): Promise<unknown | undefined>;
        activate(agentId: string): Promise<Agent | undefined>;
      }
    | undefined;

  /**
   * Manage the draft version of an agent.
   *
   * An agent may have at most one in-flight draft. The draft lifecycle is:
   * `create` -> edit (via `update`/other draft endpoints) -> `activate`
   * (promote draft to active) or `discard` (throw it away).
   */
  get drafts() {
    if (!this._drafts) {
      this._drafts = {
        /** Create a draft copy of the agent (201). */
        create: async (agentId: string) => {
          return this.client.request<Agent>(
            "POST",
            `/v1/agents/${this.encodePath(agentId)}/draft`,
          );
        },

        /** Fetch the current draft for an agent (200). */
        get: async (agentId: string) => {
          return this.client.request<Agent>(
            "GET",
            `/v1/agents/${this.encodePath(agentId)}/draft`,
          );
        },

        /** Discard the current draft (204, returns undefined). */
        discard: async (agentId: string) => {
          return this.client.request(
            "DELETE",
            `/v1/agents/${this.encodePath(agentId)}/draft`,
          );
        },

        /** Promote the current draft to the active version (200). */
        activate: async (agentId: string) => {
          return this.client.request<Agent>(
            "POST",
            `/v1/agents/${this.encodePath(agentId)}/draft/activate`,
          );
        },
      };
    }
    return this._drafts;
  }
}

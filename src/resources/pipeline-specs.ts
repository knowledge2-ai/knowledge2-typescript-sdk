import { BaseResource } from "./base-resource.js";

export interface CorpusNode {
  id?: string;
  name: string;
  description?: string;
}

export interface AgentNode {
  id?: string;
  name: string;
  description?: string;
  corpusRef?: string;
  taskType: string;
  instructions?: string;
  model?: string;
  toolConfig?: Record<string, unknown>;
}

export interface FeedNode {
  id?: string;
  name: string;
  query?: string;
  agentRef?: string;
  persistent?: boolean;
  targetCorpusRef?: string;
  reactive?: boolean;
  scheduleInterval?: string;
}

export interface SubscriptionNode {
  agentRef: string;
  feedRef: string;
  role: "input" | "output";
}

export interface TopologyDocument {
  corpora: CorpusNode[];
  agents: AgentNode[];
  feeds: FeedNode[];
  subscriptions: SubscriptionNode[];
  metadata?: Record<string, unknown>;
}

export interface PipelineSpec {
  id: string;
  orgId: string;
  projectId: string;
  name: string;
  description?: string | null;
  topology: TopologyDocument;
  status: string;
  hasDraft: boolean;
  parentPipelineSpecId?: string | null;
  createdBy?: string | null;
  boundEntityCount: number;
  bindingSummary: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationIssue {
  severity: string;
  code: string;
  message: string;
  path?: string;
}

export interface DryRunResult {
  valid: boolean;
  issues: ValidationIssue[];
  wouldCreateAgents: number;
  wouldCreateFeeds: number;
  wouldCreateCorpora: number;
  wouldBindExisting: number;
}

export interface ApplyResult {
  success: boolean;
  createdAgentIds: string[];
  createdFeedIds: string[];
  createdCorpusIds: string[];
  createdSubscriptionIds: string[];
  boundEntityIds: string[];
  issues: ValidationIssue[];
}

export interface SkippedEntity {
  entityType: string;
  entityId: string;
  entityName: string;
  reason: string;
  otherPipelineIds: string[];
}

export interface ArchiveResult {
  pipelineSpec: PipelineSpec;
  archivedAgents: string[];
  archivedFeeds: string[];
  deactivatedSubscriptions: string[];
  skippedEntities: SkippedEntity[];
}

export interface DraftActivateResult {
  success: boolean;
  createdAgentIds: string[];
  createdFeedIds: string[];
  createdCorpusIds: string[];
  createdSubscriptionIds: string[];
  removedBindingIds: string[];
  updatedEntityIds: string[];
  issues: ValidationIssue[];
}

export interface FieldDiff {
  field: string;
  specValue?: string;
  actualValue?: string;
}

export interface EntityDiff {
  entityType: string;
  entityId: string;
  entityName: string;
  driftStatus: string;
  fieldDiffs: FieldDiff[];
}

export interface DriftSummary {
  totalEntities: number;
  inSync: number;
  drifted: number;
  missing: number;
  untracked: number;
}

export interface DriftReport {
  pipelineSpecId: string;
  status: string;
  entityDiffs: EntityDiff[];
  summary: DriftSummary;
}

export interface GraphNode {
  id: string;
  type: "corpus" | "agent" | "feed";
  label: string;
  metadata: Record<string, unknown>;
  status: string | null;
  bindingRole: "created" | "existing" | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: "subscription" | "corpus_ref" | "target_corpus_ref" | "agent_ref";
  metadata: Record<string, unknown>;
}

export interface GraphResponse {
  pipelineSpecId: string;
  status: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface RefreshChanges {
  updatedEntities: string[];
  removedEntities: string[];
  unchangedEntities: string[];
}

export interface RefreshResult {
  draftId: string;
  changes: RefreshChanges;
}

export class PipelineSpecsResource extends BaseResource {
  // ------------------------------------------------------------------
  // CRUD
  // ------------------------------------------------------------------

  /** Create a new pipeline spec. */
  async create(body: {
    projectId: string;
    name: string;
    topology: TopologyDocument;
    description?: string;
  }) {
    return this.client.request<PipelineSpec>("POST", "/v1/pipeline-specs", {
      body,
    });
  }

  /** Get a single pipeline spec by ID. */
  async get(id: string) {
    return this.client.request<PipelineSpec>(
      "GET",
      `/v1/pipeline-specs/${this.encodePath(id)}`,
    );
  }

  /** List pipeline specs with optional project filter. */
  async list(options?: {
    projectId?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.client.request<{
      pipelineSpecs: PipelineSpec[];
      total: number;
      limit: number;
      offset: number;
    }>("GET", "/v1/pipeline-specs", {
      params: {
        limit: options?.limit ?? 100,
        offset: options?.offset ?? 0,
        ...(options?.projectId ? { project_id: options.projectId } : {}),
      },
    });
  }

  /** Iterate over all pipeline specs with automatic pagination. */
  async *listAll(options?: { projectId?: string; limit?: number }) {
    yield* this.client.paginate<PipelineSpec>(
      "GET",
      "/v1/pipeline-specs",
      "pipelineSpecs",
      {
        limit: options?.limit ?? 100,
        params: options?.projectId
          ? { project_id: options.projectId }
          : undefined,
      },
    );
  }

  /** Update a pipeline spec. */
  async update(
    id: string,
    body: {
      name?: string;
      description?: string;
      topology?: TopologyDocument;
    },
  ) {
    return this.client.request<PipelineSpec>(
      "PATCH",
      `/v1/pipeline-specs/${this.encodePath(id)}`,
      { body },
    );
  }

  /** Delete a pipeline spec. */
  async delete(id: string) {
    return this.client.request(
      "DELETE",
      `/v1/pipeline-specs/${this.encodePath(id)}`,
    );
  }

  /** Get the JSON schema for pipeline spec topology documents. */
  async getSchema() {
    return this.client.request<Record<string, unknown>>(
      "GET",
      "/v1/pipeline-specs/schema",
    );
  }

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------

  /** Validate a pipeline spec without applying changes (dry run). */
  async dryRun(id: string) {
    return this.client.request<DryRunResult>(
      "POST",
      `/v1/pipeline-specs/${this.encodePath(id)}/dry-run`,
    );
  }

  /** Apply a pipeline spec, creating and binding entities. */
  async apply(id: string, options?: { activateEntities?: boolean }) {
    return this.client.request<ApplyResult>(
      "POST",
      `/v1/pipeline-specs/${this.encodePath(id)}/apply`,
      {
        body: { activateEntities: options?.activateEntities ?? true },
      },
    );
  }

  /** Archive a pipeline spec and its bound entities. */
  async archive(id: string) {
    return this.client.request<ArchiveResult>(
      "POST",
      `/v1/pipeline-specs/${this.encodePath(id)}/archive`,
    );
  }

  /** Unarchive a previously archived pipeline spec. */
  async unarchive(id: string) {
    return this.client.request<PipelineSpec>(
      "POST",
      `/v1/pipeline-specs/${this.encodePath(id)}/unarchive`,
    );
  }

  // ------------------------------------------------------------------
  // Draft
  // ------------------------------------------------------------------

  /** Create a draft from the current pipeline spec. */
  async createDraft(id: string) {
    return this.client.request<PipelineSpec>(
      "POST",
      `/v1/pipeline-specs/${this.encodePath(id)}/draft`,
    );
  }

  /** Get the draft version of a pipeline spec. */
  async getDraft(id: string) {
    return this.client.request<PipelineSpec>(
      "GET",
      `/v1/pipeline-specs/${this.encodePath(id)}/draft`,
    );
  }

  /** Activate a draft, replacing the current spec and reconciling entities. */
  async activateDraft(
    id: string,
    options?: { activateEntities?: boolean },
  ) {
    return this.client.request<DraftActivateResult>(
      "POST",
      `/v1/pipeline-specs/${this.encodePath(id)}/draft/activate`,
      {
        body: { activateEntities: options?.activateEntities ?? true },
      },
    );
  }

  /** Discard a draft without applying changes. */
  async discardDraft(id: string) {
    return this.client.request(
      "DELETE",
      `/v1/pipeline-specs/${this.encodePath(id)}/draft`,
    );
  }

  // ------------------------------------------------------------------
  // Graph
  // ------------------------------------------------------------------

  /** Get the graph representation of the pipeline topology (nodes + edges). */
  async graph(id: string) {
    return this.client.request<GraphResponse>(
      "GET",
      `/v1/pipeline-specs/${this.encodePath(id)}/graph`,
    );
  }

  // ------------------------------------------------------------------
  // Drift
  // ------------------------------------------------------------------

  /** Compare bound entities against the spec and return a drift report. */
  async diff(id: string) {
    return this.client.request<DriftReport>(
      "GET",
      `/v1/pipeline-specs/${this.encodePath(id)}/diff`,
    );
  }

  /** Refresh the spec topology from current entity state, creating a draft. */
  async refresh(id: string) {
    return this.client.request<RefreshResult>(
      "POST",
      `/v1/pipeline-specs/${this.encodePath(id)}/refresh`,
    );
  }
}

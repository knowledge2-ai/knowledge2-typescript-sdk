import { BaseClient } from "./base-client.js";
import type { Knowledge2Options } from "./types/options.js";
import { AuthResource } from "./resources/auth.js";
import { OrgsResource } from "./resources/orgs.js";
import { ProjectsResource } from "./resources/projects.js";
import { CorporaResource } from "./resources/corpora.js";
import { DocumentsResource } from "./resources/documents.js";
import { IndexesResource } from "./resources/indexes.js";
import { SearchResource } from "./resources/search.js";
import { JobsResource } from "./resources/jobs.js";
import { ModelsResource } from "./resources/models.js";
import { TrainingResource } from "./resources/training.js";
import { DeploymentsResource } from "./resources/deployments.js";
import { AgentsResource } from "./resources/agents.js";
import { FeedsResource } from "./resources/feeds.js";
import { A2AResource } from "./resources/a2a.js";
import { PipelineSpecsResource } from "./resources/pipeline-specs.js";

/**
 * Knowledge2 SDK client.
 *
 * Main entry point for interacting with the Knowledge2 API.
 * Exposes resource instances for each API area via lazy-initialized getters.
 *
 * @example
 * ```ts
 * const client = new Knowledge2({ apiKey: "k2_..." });
 * const results = await client.search.query(corpusId, { query: "hello" });
 * ```
 */
export class Knowledge2 extends BaseClient {
  private _orgId: string | undefined;
  private _orgIdPromise: Promise<string> | undefined;

  // Lazy-initialized resource instances
  private _auth: AuthResource | undefined;
  private _orgs: OrgsResource | undefined;
  private _projects: ProjectsResource | undefined;
  private _corpora: CorporaResource | undefined;
  private _documents: DocumentsResource | undefined;
  private _indexes: IndexesResource | undefined;
  private _search: SearchResource | undefined;
  private _jobs: JobsResource | undefined;
  private _models: ModelsResource | undefined;
  private _training: TrainingResource | undefined;
  private _deployments: DeploymentsResource | undefined;
  private _agents: AgentsResource | undefined;
  private _feeds: FeedsResource | undefined;
  private _a2a: A2AResource | undefined;
  private _pipelineSpecs: PipelineSpecsResource | undefined;

  constructor(options: Knowledge2Options) {
    // Validate that at least one auth credential is provided
    if (!options.apiKey && !options.bearerToken && !options.adminToken) {
      throw new Error(
        "At least one authentication credential must be provided: apiKey, bearerToken, or adminToken",
      );
    }

    super(options);
    this._orgId = options.orgId;
  }

  // ------------------------------------------------------------------
  // Resource getters (lazy-initialized)
  // ------------------------------------------------------------------

  /** Authentication and API key management. */
  get auth(): AuthResource {
    return (this._auth ??= new AuthResource(this));
  }

  /** Organization management. */
  get orgs(): OrgsResource {
    return (this._orgs ??= new OrgsResource(this));
  }

  /** Project management. */
  get projects(): ProjectsResource {
    return (this._projects ??= new ProjectsResource(this));
  }

  /** Corpus management. */
  get corpora(): CorporaResource {
    return (this._corpora ??= new CorporaResource(this));
  }

  /** Document ingestion and management. */
  get documents(): DocumentsResource {
    return (this._documents ??= new DocumentsResource(this));
  }

  /** Index building and management. */
  get indexes(): IndexesResource {
    return (this._indexes ??= new IndexesResource(this));
  }

  /** Search, generate, and embeddings. */
  get search(): SearchResource {
    return (this._search ??= new SearchResource(this));
  }

  /** Job management. */
  get jobs(): JobsResource {
    return (this._jobs ??= new JobsResource(this));
  }

  /** Model management. */
  get models(): ModelsResource {
    return (this._models ??= new ModelsResource(this));
  }

  /** Training data and tuning runs. */
  get training(): TrainingResource {
    return (this._training ??= new TrainingResource(this));
  }

  /** Deployment management. */
  get deployments(): DeploymentsResource {
    return (this._deployments ??= new DeploymentsResource(this));
  }

  /** Agent management. */
  get agents(): AgentsResource {
    return (this._agents ??= new AgentsResource(this));
  }

  /** Feed management. */
  get feeds(): FeedsResource {
    return (this._feeds ??= new FeedsResource(this));
  }

  /** A2A (Agent-to-Agent) protocol. */
  get a2a(): A2AResource {
    return (this._a2a ??= new A2AResource(this));
  }

  /** Pipeline spec management. */
  get pipelineSpecs(): PipelineSpecsResource {
    return (this._pipelineSpecs ??= new PipelineSpecsResource(this));
  }

  // ------------------------------------------------------------------
  // Org resolution
  // ------------------------------------------------------------------

  /**
   * Resolve the organization ID.
   *
   * If `orgId` was provided at construction, returns it immediately.
   * Otherwise, calls `GET /v1/auth/whoami` and caches the result.
   */
  async resolveOrgId(): Promise<string> {
    if (this._orgId) return this._orgId;

    if (!this._orgIdPromise) {
      this._orgIdPromise = this._fetchOrgId().catch((err) => {
        this._orgIdPromise = undefined; // Allow retry on next call
        throw err;
      });
    }
    return this._orgIdPromise;
  }

  private async _fetchOrgId(): Promise<string> {
    const data = await this.request<{ orgId: string }>("GET", "/v1/auth/whoami");
    const orgId = data?.orgId;
    if (!orgId) {
      throw new Error(
        "Could not determine organization ID from /v1/auth/whoami. Please provide orgId explicitly.",
      );
    }
    this._orgId = orgId;
    return orgId;
  }

  /** Enable or disable debug logging for all SDK requests. */
  static setDebug(enabled = true): void {
    BaseClient.debug = enabled;
  }
}

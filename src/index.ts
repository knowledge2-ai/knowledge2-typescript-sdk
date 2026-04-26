// Client
export { Knowledge2 } from "./client.js";
export { BaseClient } from "./base-client.js";

// Resources
export { AuthResource } from "./resources/auth.js";
export { OrgsResource } from "./resources/orgs.js";
export { ProjectsResource } from "./resources/projects.js";
export type {
  ProjectArchiveResult,
  ProjectRestoreResult,
  ProjectDeletionRequest,
  ProjectDeletionConfirmation,
} from "./resources/projects.js";
export { CorporaResource } from "./resources/corpora.js";
export { DocumentsResource } from "./resources/documents.js";
export { IndexesResource } from "./resources/indexes.js";
export { SearchResource } from "./resources/search.js";
export { JobsResource } from "./resources/jobs.js";
export { ModelsResource } from "./resources/models.js";
export { TrainingResource } from "./resources/training.js";
export { DeploymentsResource } from "./resources/deployments.js";
export { AgentsResource } from "./resources/agents.js";
export { FeedsResource } from "./resources/feeds.js";
export { A2AResource } from "./resources/a2a.js";
export { PipelineSpecsResource } from "./resources/pipeline-specs.js";
export { ExtractionTemplatesResource } from "./resources/extraction-templates.js";
export type {
  ExtractionTemplate,
  ExtractionTemplateListResponse,
  FieldSchemaEntry,
} from "./resources/extraction-templates.js";
export type {
  PipelineSpec,
  TopologyDocument,
  CorpusNode,
  AgentNode,
  FeedNode,
  SubscriptionNode,
  ValidationIssue,
  DryRunResult,
  ApplyResult,
  ArchiveResult,
  SkippedEntity,
  DraftActivateResult,
  DriftReport,
  DriftSummary,
  EntityDiff,
  FieldDiff,
  RefreshResult,
  RefreshChanges,
  GraphNode,
  GraphEdge,
  GraphResponse,
} from "./resources/pipeline-specs.js";

// Errors
export {
  Knowledge2Error,
  APIError,
  AuthenticationError,
  PermissionDeniedError,
  FeatureNotEnabledError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  QuotaExceededError,
  ServerError,
  APIConnectionError,
  APITimeoutError,
} from "./errors.js";

// Types
export type {
  Knowledge2Options,
  RequestOptions,
  PaginateOptions,
  PollOptions,
} from "./types/index.js";

// Version
export { VERSION } from "./version.js";

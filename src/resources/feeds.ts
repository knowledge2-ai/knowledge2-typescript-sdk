import { BaseResource } from "./base-resource.js";

interface Feed {
  id: string;
  projectId: string;
  sourceAgentId: string;
  name: string;
  executionMode: string;
  persistent: boolean;
  reactive: boolean;
  targetCorpusId?: string;
  scheduleInterval?: string;
  scheduleHour?: number;
  startFrom?: string;
  activationStatus: string;
  lastCheckedSeq: number;
  lastRunAt?: string;
  lastRunResultCount?: number;
  subscriptions: Array<{
    id?: string;
    agentId: string;
    agentName?: string;
    role: string;
  }>;
  parentFeedId?: string;
  hasDraft: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface FeedRunResponse {
  newContent: boolean;
  results?: Array<Record<string, unknown>>;
  resultCount: number;
  truncated: boolean;
  ingestionJobId?: string;
  dryRun: boolean;
  wouldIngestCount?: number;
  feedRunId?: string;
}

export class FeedsResource extends BaseResource {
  /** Create a new feed. */
  async create(body: {
    projectId: string;
    name: string;
    sourceAgentId: string;
    executionMode?: "retrieve" | "answer";
    persistent?: boolean;
    targetCorpus?: { existing?: string; createNew?: boolean };
    reactive?: boolean;
    scheduleInterval?: string;
    scheduleHour?: number;
    startFrom?: string;
  }) {
    return this.client.request<Feed>("POST", "/v1/feeds", { body });
  }

  /** List feeds with optional project filter. */
  async list(options?: {
    projectId?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.client.request<{ feeds: Feed[]; total: number; limit: number; offset: number }>("GET", "/v1/feeds", {
      params: {
        limit: options?.limit ?? 100,
        offset: options?.offset ?? 0,
        ...(options?.projectId ? { project_id: options.projectId } : {}),
      },
    });
  }

  /** Get a single feed. */
  async get(feedId: string) {
    return this.client.request<Feed>(
      "GET",
      `/v1/feeds/${this.encodePath(feedId)}`,
    );
  }

  /** Update a feed. */
  async update(
    feedId: string,
    body: {
      name?: string;
      executionMode?: "retrieve" | "answer";
      reactive?: boolean;
      scheduleInterval?: string;
      scheduleHour?: number;
    },
  ) {
    return this.client.request<Feed>(
      "PATCH",
      `/v1/feeds/${this.encodePath(feedId)}`,
      { body },
    );
  }

  /** Delete a feed. */
  async delete(feedId: string) {
    return this.client.request(
      "DELETE",
      `/v1/feeds/${this.encodePath(feedId)}`,
    );
  }

  /** Run a feed. */
  async run(
    feedId: string,
    options?: { returnResults?: boolean; dryRun?: boolean },
  ) {
    return this.client.request<FeedRunResponse>(
      "POST",
      `/v1/feeds/${this.encodePath(feedId)}/run`,
      {
        params: {
          ...(options?.returnResults !== undefined ? { returnResults: options.returnResults } : {}),
          dryRun: options?.dryRun ?? false,
        },
      },
    );
  }
}

import { BaseResource } from "./base-resource.js";

interface FeedSubscriptionView {
  id?: string;
  agentId: string;
  agentName?: string;
  role: string;
  matchSpec?: Record<string, unknown> | null;
  matchSpecDescription?: string | null;
}

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
  subscriptions: FeedSubscriptionView[];
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

interface FeedFeedbackSubmitResponse {
  message: string;
  feedbackId: string;
}

interface FeedFeedbackStatsResponse {
  feedId: string;
  total: number;
  positive: number;
  negative: number;
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

  // --------------------------------------------------------------
  // Draft lifecycle
  // --------------------------------------------------------------

  /** Create an editable draft of a feed. */
  async createDraft(feedId: string) {
    return this.client.request<Feed>(
      "POST",
      `/v1/feeds/${this.encodePath(feedId)}/draft`,
    );
  }

  /** Retrieve the draft for a feed, if one exists. */
  async getDraft(feedId: string) {
    return this.client.request<Feed>(
      "GET",
      `/v1/feeds/${this.encodePath(feedId)}/draft`,
    );
  }

  /**
   * Activate a draft: copy its config onto the parent feed and delete
   * the draft. Returns the updated parent feed (not the draft).
   */
  async activateDraft(feedId: string) {
    return this.client.request<Feed>(
      "POST",
      `/v1/feeds/${this.encodePath(feedId)}/draft/activate`,
    );
  }

  /** Discard a feed's draft without applying its config. */
  async discardDraft(feedId: string) {
    return this.client.request(
      "DELETE",
      `/v1/feeds/${this.encodePath(feedId)}/draft`,
    );
  }

  // --------------------------------------------------------------
  // Subscriptions (read from feed side)
  // --------------------------------------------------------------

  /**
   * List subscriptions attached to a feed. Subscriptions are agent-scoped
   * server-side; this helper reads the subscription view embedded in the
   * feed record. To create a subscription, use `agents.createSubscription`.
   */
  async listSubscriptions(feedId: string): Promise<FeedSubscriptionView[]> {
    const feed = await this.get(feedId);
    return (feed?.subscriptions ?? []) as FeedSubscriptionView[];
  }

  // --------------------------------------------------------------
  // Feedback
  // --------------------------------------------------------------

  /** Submit thumbs up/down feedback on a result produced by a feed run. */
  async submitFeedback(
    feedId: string,
    body: { rating: 0 | 1; chunkId: string; feedRunId: string },
  ) {
    if (body.rating !== 0 && body.rating !== 1) {
      throw new Error("rating must be 0 (not relevant) or 1 (relevant)");
    }
    return this.client.request<FeedFeedbackSubmitResponse>(
      "POST",
      `/v1/feeds/${this.encodePath(feedId)}/feedback`,
      { body },
    );
  }

  /** Get aggregated feedback stats for a feed, optionally scoped to a run. */
  async getFeedbackStats(feedId: string, options?: { feedRunId?: string }) {
    return this.client.request<FeedFeedbackStatsResponse>(
      "GET",
      `/v1/feeds/${this.encodePath(feedId)}/feedback`,
      {
        params: {
          ...(options?.feedRunId ? { feedRunId: options.feedRunId } : {}),
        },
      },
    );
  }
}

import { BaseResource } from "./base-resource.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QualityMetrics {
  corpus_id: string;
  window_days: number;
  k: number;
  total_queries: number;
  engagement_rate: number | null;
  positive_engagement_rate: number | null;
  routing_hit_rate: number | null;
  /** Proxy precision@k: among engaged queries, fraction with positive outcome. */
  precision_at_k: number | null;
  /** Proxy recall@k: positive engagements / total queries. */
  recall_at_k: number | null;
  /** MRR approximation: rank assumed = 1 for all positive outcomes. */
  mrr: number | null;
  /**
   * Avg precision with filter applied minus avg precision without filter.
   * Positive = filter helping; negative = filter over-restricting.
   */
  filter_delta_precision: number | null;
  /**
   * Histogram of intent_envelope confidence values in 5 equal-width buckets.
   * Keys: '0.0-0.2', '0.2-0.4', '0.4-0.6', '0.6-0.8', '0.8-1.0'.
   * Null when no intent envelopes exist in the window.
   */
  intent_confidence_histogram: Record<string, number> | null;
}

export interface SchemaEvolutionProposal {
  id: string;
  corpus_id: string;
  org_id: string;
  proposal_type: "promote" | "demote";
  field_key: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  rationale: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
  expires_at: string;
}

export interface ProposalResolveResponse extends SchemaEvolutionProposal {
  /** True when the accepted proposal requires a corpus schema update (v1: informational only). */
  schema_update_required: boolean;
}

export interface ProposalListResponse {
  items: SchemaEvolutionProposal[];
  total: number;
  next_cursor: string | null;
}

export interface EngagementRequest {
  retrieval_outcome_id: string;
  event_type: "click" | "save" | "downstream" | "thumbs_up" | "thumbs_down";
}

// ---------------------------------------------------------------------------
// Resource class
// ---------------------------------------------------------------------------

export class QualityResource extends BaseResource {
  /**
   * Get quality metrics for a corpus over a rolling time window.
   *
   * Not feature-gated — returns zero/null data to orgs without
   * `schema_evolution_enabled`.
   */
  async getMetrics(
    corpusId: string,
    options: { windowDays?: number; k?: number } = {},
  ) {
    const params = new URLSearchParams();
    if (options.windowDays !== undefined) {
      params.set("window_days", String(options.windowDays));
    }
    if (options.k !== undefined) {
      params.set("k", String(options.k));
    }
    const qs = params.toString();
    return this.client.request<QualityMetrics>(
      "GET",
      `/v1/corpora/${this.encodePath(corpusId)}/quality-metrics${qs ? `?${qs}` : ""}`,
    );
  }

  /**
   * Record a user engagement event for a retrieval outcome.
   *
   * Feature-gated: returns 402 if `schema_evolution_enabled` is off for the org.
   */
  async postEngagement(
    corpusId: string,
    body: EngagementRequest,
  ): Promise<void> {
    await this.client.request<void>(
      "POST",
      `/v1/corpora/${this.encodePath(corpusId)}/engagement`,
      { body },
    );
  }

  /**
   * List schema evolution proposals for a corpus.
   *
   * Feature-gated (402 if off). Requires admin role.
   */
  async listProposals(
    corpusId: string,
    options: {
      status?: "pending" | "accepted" | "rejected";
      limit?: number;
      cursor?: string;
    } = {},
  ) {
    const params = new URLSearchParams();
    if (options.status) params.set("status", options.status);
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.cursor) params.set("cursor", options.cursor);
    const qs = params.toString();
    return this.client.request<ProposalListResponse>(
      "GET",
      `/v1/corpora/${this.encodePath(corpusId)}/proposals${qs ? `?${qs}` : ""}`,
    );
  }

  /**
   * Accept or reject a schema evolution proposal.
   *
   * Feature-gated (402 if off). Requires admin role.
   */
  async resolveProposal(
    corpusId: string,
    proposalId: string,
    action: "accept" | "reject",
  ) {
    return this.client.request<ProposalResolveResponse>(
      "PATCH",
      `/v1/corpora/${this.encodePath(corpusId)}/proposals/${this.encodePath(proposalId)}`,
      { body: { action } },
    );
  }
}

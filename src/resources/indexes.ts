import { Knowledge2Error } from "../errors.js";
import { BaseResource } from "./base-resource.js";

interface OptimizeEnqueueResponse {
  jobId: string;
  jobType: "optimize_retrieval";
}

interface JobPollResult {
  status: string;
  jobId: string;
  result?: Record<string, unknown>;
  errorMessage?: string;
}

interface OptimizeOptions {
  exampleQueries?: string[];
  queryCount?: number;
  topK?: number;
  metric?: "ndcg" | "mrr" | "recall";
  force?: boolean;
  idempotencyKey?: string;
  wait?: boolean;
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export class IndexesResource extends BaseResource {
  /**
   * Build indexes for a corpus.
   *
   * When `wait` is true (default), polls until the build job completes.
   */
  async build(
    corpusId: string,
    options?: {
      dense?: boolean;
      sparse?: boolean;
      sparseMetadata?: Record<string, unknown>;
      mode?: "full" | "incremental";
      graph?: boolean;
      idempotencyKey?: string;
      wait?: boolean;
      pollIntervalMs?: number;
      timeoutMs?: number;
    },
  ) {
    const {
      idempotencyKey,
      wait = true,
      pollIntervalMs,
      timeoutMs,
      ...body
    } = options ?? {};

    const result = await this.client.request<{ jobId: string }>(
      "POST",
      `/v1/corpora/${this.encodePath(corpusId)}/indexes:build`,
      {
        body: { dense: true, sparse: true, mode: "full", ...body },
        headers: idempotencyKey
          ? { "Idempotency-Key": idempotencyKey }
          : undefined,
      },
    );

    if (wait) {
      if (!result?.jobId) {
        throw new Knowledge2Error("Server response missing jobId — cannot poll for completion");
      }
      return this.client.pollJob(result.jobId, { pollIntervalMs, timeoutMs });
    }
    return result;
  }

  /** Get the index status for a corpus. */
  async status(corpusId: string) {
    return this.client.request<{
      denseStatus: string;
      sparseStatus: string;
      graphStatus?: string;
      lastBuildAt?: string;
    }>("GET", `/v1/corpora/${this.encodePath(corpusId)}/indexes/status`);
  }

  /**
   * Rebuild indexes for a corpus.
   *
   * When `wait` is true (default), polls until the rebuild job completes.
   */
  async rebuild(
    corpusId: string,
    options?: {
      dense?: boolean;
      sparse?: boolean;
      sparseMetadata?: Record<string, unknown>;
      graph?: boolean;
      idempotencyKey?: string;
      wait?: boolean;
      pollIntervalMs?: number;
      timeoutMs?: number;
    },
  ) {
    const {
      idempotencyKey,
      wait = true,
      pollIntervalMs,
      timeoutMs,
      ...body
    } = options ?? {};

    const result = await this.client.request<{ jobId: string }>(
      "POST",
      `/v1/corpora/${this.encodePath(corpusId)}/indexes:rebuild`,
      {
        body: { dense: true, sparse: true, ...body },
        headers: idempotencyKey
          ? { "Idempotency-Key": idempotencyKey }
          : undefined,
      },
    );

    if (wait) {
      if (!result?.jobId) {
        throw new Knowledge2Error("Server response missing jobId — cannot poll for completion");
      }
      return this.client.pollJob(result.jobId, { pollIntervalMs, timeoutMs });
    }
    return result;
  }

  /**
   * Optimize retrieval defaults for a corpus.
   *
   * When `wait` is true (default), polls until the optimization job completes.
   */
  async optimize(
    corpusId: string,
    options: OptimizeOptions & { wait: false },
  ): Promise<OptimizeEnqueueResponse>;
  async optimize(
    corpusId: string,
    options?: OptimizeOptions & { wait?: true },
  ): Promise<JobPollResult>;
  async optimize(
    corpusId: string,
    options?: OptimizeOptions,
  ): Promise<OptimizeEnqueueResponse | JobPollResult> {
    const {
      idempotencyKey,
      wait = true,
      pollIntervalMs,
      timeoutMs,
      ...body
    } = options ?? {};

    const result = await this.client.request<OptimizeEnqueueResponse>(
      "POST",
      `/v1/corpora/${this.encodePath(corpusId)}/indexes:optimize`,
      {
        body: { force: false, ...body },
        headers: idempotencyKey
          ? { "Idempotency-Key": idempotencyKey }
          : undefined,
      },
    );

    if (!result) {
      throw new Knowledge2Error("Server response missing body");
    }

    if (wait) {
      if (!result.jobId) {
        throw new Knowledge2Error("Server response missing jobId — cannot poll for completion");
      }
      return this.client.pollJob<JobPollResult>(result.jobId, {
        pollIntervalMs,
        timeoutMs,
      });
    }
    return result;
  }

  /** Compact indexes for a corpus. */
  async compact(
    corpusId: string,
    options?: {
      dense?: boolean;
      sparse?: boolean;
      graph?: boolean;
      keep?: number;
    },
  ) {
    return this.client.request(
      "POST",
      `/v1/corpora/${this.encodePath(corpusId)}/indexes:compact`,
      {
        body: { dense: true, sparse: true, graph: true, keep: 1, ...options },
      },
    );
  }
}

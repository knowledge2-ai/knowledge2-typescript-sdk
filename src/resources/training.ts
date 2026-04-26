import { BaseResource } from "./base-resource.js";

interface TrainingData {
  id: string;
  corpusId: string;
  status: string;
  createdAt: string;
}

interface TuningRun {
  id: string;
  corpusId: string;
  status: string;
  createdAt: string;
  completedAt?: string;
}

interface EvalRun {
  id: string;
  status: string;
  createdAt: string;
}

export class TrainingResource extends BaseResource {
  /** Build training data for a corpus. */
  async buildTrainingData(
    corpusId: string,
    options?: { idempotencyKey?: string },
  ) {
    return this.client.request(
      "POST",
      `/v1/corpora/${this.encodePath(corpusId)}/training-data:build`,
      {
        body: {},
        headers: options?.idempotencyKey
          ? { "Idempotency-Key": options.idempotencyKey }
          : undefined,
      },
    );
  }

  /** List training data with manual pagination. */
  async listTrainingData(
    corpusId: string,
    options?: { limit?: number; offset?: number },
  ) {
    return this.client.request<{ datasets: TrainingData[] }>(
      "GET",
      `/v1/corpora/${this.encodePath(corpusId)}/training-data`,
      {
        params: {
          limit: options?.limit ?? 100,
          offset: options?.offset ?? 0,
        },
      },
    );
  }

  /** Iterate over all training data for a corpus. */
  async *listAllTrainingData(corpusId: string, options?: { limit?: number }) {
    yield* this.client.paginate<TrainingData>(
      "GET",
      `/v1/corpora/${this.encodePath(corpusId)}/training-data`,
      "datasets",
      { limit: options?.limit ?? 100 },
    );
  }

  /** List tuning runs with manual pagination. */
  async listTuningRuns(
    corpusId: string,
    options?: { limit?: number; offset?: number },
  ) {
    return this.client.request<{ runs: TuningRun[] }>(
      "GET",
      `/v1/corpora/${this.encodePath(corpusId)}/tuning-runs`,
      {
        params: {
          limit: options?.limit ?? 100,
          offset: options?.offset ?? 0,
        },
      },
    );
  }

  /** Iterate over all tuning runs for a corpus. */
  async *listAllTuningRuns(corpusId: string, options?: { limit?: number }) {
    yield* this.client.paginate<TuningRun>(
      "GET",
      `/v1/corpora/${this.encodePath(corpusId)}/tuning-runs`,
      "runs",
      { limit: options?.limit ?? 100 },
    );
  }

  /** Create a new tuning run. */
  async createTuningRun(
    corpusId: string,
    options?: { idempotencyKey?: string },
  ) {
    return this.client.request<TuningRun>(
      "POST",
      `/v1/corpora/${this.encodePath(corpusId)}/tuning-runs`,
      {
        body: {},
        headers: options?.idempotencyKey
          ? { "Idempotency-Key": options.idempotencyKey }
          : undefined,
      },
    );
  }

  /**
   * Build training data and start a tuning run.
   *
   * When `wait` is true (default), polls until the tuning run completes.
   */
  async buildAndStartTuningRun(
    corpusId: string,
    options?: {
      idempotencyKey?: string;
      wait?: boolean;
      pollIntervalMs?: number;
      timeoutMs?: number;
    },
  ) {
    const { idempotencyKey, wait = true, pollIntervalMs, timeoutMs } = options ?? {};
    const result = await this.client.request<{ jobId: string }>(
      "POST",
      `/v1/corpora/${this.encodePath(corpusId)}/tuning-runs:build`,
      {
        body: {},
        headers: idempotencyKey
          ? { "Idempotency-Key": idempotencyKey }
          : undefined,
      },
    );

    if (wait && result?.jobId) {
      return this.client.pollJob(result.jobId, { pollIntervalMs, timeoutMs });
    }
    return result;
  }

  /** Get a tuning run by ID. */
  async getTuningRun(runId: string) {
    return this.client.request<TuningRun>(
      "GET",
      `/v1/tuning-runs/${this.encodePath(runId)}`,
    );
  }

  /** Get tuning run logs. */
  async getTuningRunLogs(runId: string, options?: { tail?: number }) {
    return this.client.request<{ logs: string }>(
      "GET",
      `/v1/tuning-runs/${this.encodePath(runId)}/logs`,
      {
        params: { tail: options?.tail ?? 200 },
      },
    );
  }

  /** Cancel a tuning run. */
  async cancelTuningRun(runId: string) {
    return this.client.request("POST", `/v1/tuning-runs/${this.encodePath(runId)}:cancel`, { body: {} });
  }

  /** Promote a completed tuning run's model. */
  async promoteTuningRun(runId: string) {
    return this.client.request("POST", `/v1/tuning-runs/${this.encodePath(runId)}:promote`, { body: {} });
  }

  /** Get an eval run by ID. */
  async getEvalRun(evalId: string) {
    return this.client.request<EvalRun>("GET", `/v1/eval-runs/${this.encodePath(evalId)}`);
  }
}

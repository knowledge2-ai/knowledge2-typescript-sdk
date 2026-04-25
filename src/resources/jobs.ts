import { Knowledge2Error } from "../errors.js";
import { BaseResource } from "./base-resource.js";

interface Job {
  id: string;
  type: string;
  status: string;
  corpusId?: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

function assertJobId(jobId: string): void {
  if (!jobId || !jobId.trim()) {
    throw new Knowledge2Error("jobId must be a non-empty string");
  }
}

export class JobsResource extends BaseResource {
  /** Get a job by ID. */
  async get(jobId: string) {
    assertJobId(jobId);
    return this.client.request<Job>("GET", `/v1/jobs/${this.encodePath(jobId)}`);
  }

  /** List jobs with manual pagination. */
  async list(options?: {
    corpusId?: string;
    jobType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.client.request<{ jobs: Job[] }>(
      "GET",
      "/v1/jobs",
      {
        params: {
          corpusId: options?.corpusId,
          jobType: options?.jobType,
          status: options?.status,
          limit: options?.limit ?? 100,
          offset: options?.offset ?? 0,
        },
      },
    );
  }

  /** Iterate over all jobs with automatic pagination. */
  async *listAll(options?: {
    corpusId?: string;
    jobType?: string;
    status?: string;
    limit?: number;
  }) {
    const { limit, ...params } = options ?? {};
    yield* this.client.paginate<Job>("GET", "/v1/jobs", "jobs", {
      limit: limit ?? 100,
      params: params as Record<string, string | number | boolean | undefined>,
    });
  }

  /** Cancel a running job. */
  async cancel(jobId: string) {
    assertJobId(jobId);
    return this.client.request("POST", `/v1/jobs/${this.encodePath(jobId)}:cancel`);
  }

  /** Retry a failed job. */
  async retry(jobId: string) {
    assertJobId(jobId);
    return this.client.request("POST", `/v1/jobs/${this.encodePath(jobId)}:retry`);
  }

  /** Reconcile jobs (admin). */
  async reconcile() {
    return this.client.request("POST", "/v1/jobs:reconcile");
  }
}

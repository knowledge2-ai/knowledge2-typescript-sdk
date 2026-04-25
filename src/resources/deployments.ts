import { BaseResource } from "./base-resource.js";

interface Deployment {
  id: string;
  corpusId: string;
  modelId: string;
  trafficPct: number;
  createdAt: string;
}

export class DeploymentsResource extends BaseResource {
  /** Create a new deployment. */
  async create(
    corpusId: string,
    modelId: string,
    options?: { trafficPct?: number; reindex?: boolean },
  ) {
    return this.client.request<Deployment>(
      "POST",
      `/v1/corpora/${this.encodePath(corpusId)}/deployments`,
      {
        body: {
          modelId,
          trafficPct: options?.trafficPct ?? 100,
          reindex: options?.reindex ?? true,
        },
      },
    );
  }

  /** List deployments with manual pagination. */
  async list(
    corpusId: string,
    options?: { limit?: number; offset?: number },
  ) {
    return this.client.request<{ deployments: Deployment[] }>(
      "GET",
      `/v1/corpora/${this.encodePath(corpusId)}/deployments`,
      {
        params: {
          limit: options?.limit ?? 100,
          offset: options?.offset ?? 0,
        },
      },
    );
  }

  /** Iterate over all deployments for a corpus. */
  async *listAll(corpusId: string, options?: { limit?: number }) {
    yield* this.client.paginate<Deployment>(
      "GET",
      `/v1/corpora/${this.encodePath(corpusId)}/deployments`,
      "deployments",
      { limit: options?.limit ?? 100 },
    );
  }
}

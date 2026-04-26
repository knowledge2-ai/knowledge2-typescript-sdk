import { BaseResource } from "./base-resource.js";

interface Model {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

export class ModelsResource extends BaseResource {
  /** List models with manual pagination. */
  async list(options?: { limit?: number; offset?: number }) {
    return this.client.request<{ models: Model[] }>(
      "GET",
      "/v1/models",
      {
        params: {
          limit: options?.limit ?? 100,
          offset: options?.offset ?? 0,
        },
      },
    );
  }

  /** Iterate over all models with automatic pagination. */
  async *listAll(options?: { limit?: number }) {
    yield* this.client.paginate<Model>("GET", "/v1/models", "models", {
      limit: options?.limit ?? 100,
    });
  }

  /** Delete a model. */
  async delete(modelId: string, options?: { force?: boolean }) {
    return this.client.request("DELETE", `/v1/models/${this.encodePath(modelId)}`, {
      params: { force: options?.force },
    });
  }
}

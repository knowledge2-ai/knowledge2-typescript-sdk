import { BaseResource } from "./base-resource.js";

interface Corpus {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  extractionTemplateId?: string | null;
  reExtractionPolicy?: string;
}

interface CorpusStatus {
  id: string;
  documentCount: number;
  chunkCount: number;
  indexStatus: string;
}

export class CorporaResource extends BaseResource {
  /** Create a new corpus. */
  async create(
    projectId: string,
    name: string,
    description?: string,
  ) {
    return this.client.request<Corpus>("POST", "/v1/corpora", {
      body: { projectId, name, description },
    });
  }

  /** List corpora with manual pagination. */
  async list(options?: { limit?: number; offset?: number; projectId?: string }) {
    return this.client.request<{ corpora: Corpus[] }>(
      "GET",
      "/v1/corpora",
      {
        params: {
          limit: options?.limit ?? 100,
          offset: options?.offset ?? 0,
          ...(options?.projectId ? { project_id: options.projectId } : {}),
        },
      },
    );
  }

  /** Iterate over all corpora with automatic pagination. */
  async *listAll(options?: { limit?: number; projectId?: string }) {
    yield* this.client.paginate<Corpus>("GET", "/v1/corpora", "corpora", {
      limit: options?.limit ?? 100,
      ...(options?.projectId ? { project_id: options.projectId } : {}),
    });
  }

  /** Get a single corpus. */
  async get(corpusId: string) {
    return this.client.request<Corpus>("GET", `/v1/corpora/${this.encodePath(corpusId)}`);
  }

  /** Get corpus status (document count, index status, etc.). */
  async getStatus(corpusId: string) {
    return this.client.request<CorpusStatus>(
      "GET",
      `/v1/corpora/${this.encodePath(corpusId)}/status`,
    );
  }

  /** Update a corpus. */
  async update(
    corpusId: string,
    updates: {
      name?: string;
      description?: string;
      chunkingConfig?: Record<string, unknown>;
      graphRagPolicy?: Record<string, unknown>;
      extractionTemplateId?: string | null;
      reExtractionPolicy?: "lazy" | "eager";
    },
  ) {
    return this.client.request<Corpus>(
      "PATCH",
      `/v1/corpora/${this.encodePath(corpusId)}`,
      { body: updates },
    );
  }

  /** Delete a corpus. */
  async delete(corpusId: string, options?: { force?: boolean }) {
    return this.client.request(
      "DELETE",
      `/v1/corpora/${this.encodePath(corpusId)}`,
      {
        params: { force: options?.force },
      },
    );
  }

  /** List models associated with a corpus. */
  async listModels(
    corpusId: string,
    options?: { limit?: number; offset?: number },
  ) {
    return this.client.request<{
      models: Array<{
        id: string;
        name: string;
        type: string;
        status: string;
      }>;
    }>("GET", `/v1/corpora/${this.encodePath(corpusId)}/models`, {
      params: {
        limit: options?.limit ?? 100,
        offset: options?.offset ?? 0,
      },
    });
  }

  /** Iterate over all models for a corpus. */
  async *listAllModels(corpusId: string, options?: { limit?: number }) {
    yield* this.client.paginate<{
      id: string;
      name: string;
      type: string;
      status: string;
    }>("GET", `/v1/corpora/${this.encodePath(corpusId)}/models`, "models", {
      limit: options?.limit ?? 100,
    });
  }
}

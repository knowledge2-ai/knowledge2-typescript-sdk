import { BaseResource } from "./base-resource.js";

interface SearchResult {
  chunkId: string;
  documentId: string;
  score: number;
  text: string;
  metadata?: Record<string, unknown>;
}

interface SearchResponse {
  results: SearchResult[];
  meta?: Record<string, unknown>;
}

interface SearchGenerateResponse {
  answer: string;
  model?: string;
  thinkingBudget?: number;
  results?: SearchResult[];
  meta?: Record<string, unknown>;
  usedSources?: string[];
}

export class SearchResource extends BaseResource {
  /** Search a corpus. */
  async query(
    corpusId: string,
    options: {
      query: string;
      topK?: number;
      filters?: Record<string, unknown>;
      hybrid?: Record<string, unknown>;
      graphRag?: Record<string, unknown>;
      rerank?: Record<string, unknown>;
      returnConfig?: Record<string, unknown>;
    },
  ) {
    const { returnConfig, ...rest } = options;
    return this.client.request<SearchResponse>(
      "POST",
      `/v1/corpora/${this.encodePath(corpusId)}/search`,
      {
        body: { topK: 10, ...rest, ...(returnConfig !== undefined ? { return: returnConfig } : {}) },
      },
    );
  }

  /** Batch search — multiple queries in one request. */
  async queryBatch(
    corpusId: string,
    queries: string[],
    options?: {
      topK?: number;
      filters?: Record<string, unknown>;
      hybrid?: Record<string, unknown>;
      graphRag?: Record<string, unknown>;
      rerank?: Record<string, unknown>;
      returnConfig?: Record<string, unknown>;
    },
  ) {
    const { returnConfig, ...rest } = options ?? {};
    return this.client.request<{ responses: SearchResponse[] }>(
      "POST",
      `/v1/corpora/${this.encodePath(corpusId)}/search:batch`,
      {
        body: { queries, topK: 10, ...rest, ...(returnConfig !== undefined ? { return: returnConfig } : {}) },
      },
    );
  }

  /** Search and generate an answer. */
  async generate(
    corpusId: string,
    options: {
      query: string;
      topK?: number;
      filters?: Record<string, unknown>;
      hybrid?: Record<string, unknown>;
      graphRag?: Record<string, unknown>;
      rerank?: Record<string, unknown>;
      returnConfig?: Record<string, unknown>;
      generation?: Record<string, unknown>;
    },
  ) {
    const { returnConfig, ...rest } = options;
    return this.client.request<SearchGenerateResponse>(
      "POST",
      `/v1/corpora/${this.encodePath(corpusId)}/search:generate`,
      {
        body: { topK: 10, ...rest, ...(returnConfig !== undefined ? { return: returnConfig } : {}) },
      },
    );
  }

  /** Generate embeddings. */
  async embeddings(
    model: string,
    inputs: string[],
    embedType: "query" | "document" = "query",
  ) {
    return this.client.request<{
      embeddings: number[][];
      model: string;
      usage: { totalTokens: number };
    }>("POST", "/v1/embeddings", {
      body: { model, inputs, embedType },
    });
  }

  /** Submit search feedback. */
  async createFeedback(
    corpusId: string,
    options: {
      query: string;
      clickedChunkIds?: string[];
      rating?: number;
      abstained?: boolean;
    },
  ) {
    return this.client.request(
      "POST",
      `/v1/corpora/${this.encodePath(corpusId)}/feedback`,
      { body: options },
    );
  }
}

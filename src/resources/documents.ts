import { Knowledge2Error } from "../errors.js";
import { BaseResource } from "./base-resource.js";
import { camelToSnake } from "../utils/case-conversion.js";

interface Document {
  id: string;
  corpusId: string;
  filename?: string;
  status: string;
  sourceUri?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface Chunk {
  id: string;
  documentId: string;
  text: string;
  metadata?: Record<string, unknown>;
}

interface DocumentUploadFormat {
  key: string;
  label: string;
  extensions: string[];
}

interface DocumentUploadCapabilities {
  advertisedFormats: DocumentUploadFormat[];
}

export class DocumentsResource extends BaseResource {
  /**
   * Upload a single document to a corpus.
   *
   * Provide one of: `filePath`, `fileBytes`, `rawText`, or `sourceUri`.
   */
  async upload(
    corpusId: string,
    options: {
      filePath?: string;
      fileBytes?: Buffer | Uint8Array;
      file?: Blob | File;
      filename?: string;
      rawText?: string;
      sourceUri?: string;
      metadata?: Record<string, unknown>;
      autoIndex?: boolean;
      chunkStrategy?: string;
      chunking?: Record<string, unknown>;
      idempotencyKey?: string;
    },
  ) {
    const { idempotencyKey, file, metadata, ...rest } = options;

    const form = new FormData();

    if (file) {
      form.append("file", file);
    }

    if (metadata !== undefined) {
      form.append("metadata", JSON.stringify(metadata));
    }

    // Append remaining scalar fields as snake_case form fields
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined && value !== null) {
        form.append(camelToSnake(key), String(value));
      }
    }

    return this.client.request<Document>(
      "POST",
      `/v1/corpora/${this.encodePath(corpusId)}/documents`,
      {
        body: form,
        headers: idempotencyKey
          ? { "Idempotency-Key": idempotencyKey }
          : undefined,
      },
    );
  }

  /**
   * Upload a batch of documents.
   *
   * When `wait` is true (default), polls until the batch job completes.
   */
  async uploadBatch(
    corpusId: string,
    documents: Array<Record<string, unknown>>,
    options?: {
      idempotencyKey?: string;
      autoIndex?: boolean;
      chunkStrategy?: string;
      chunking?: Record<string, unknown>;
      wait?: boolean;
      pollIntervalMs?: number;
      timeoutMs?: number;
    },
  ) {
    const { idempotencyKey, wait = true, pollIntervalMs, timeoutMs, ...rest } = options ?? {};
    const result = await this.client.request<{ jobId: string; batchId: string; count: number }>(
      "POST",
      `/v1/corpora/${this.encodePath(corpusId)}/documents:batch`,
      {
        body: { documents, ...rest },
        headers: idempotencyKey
          ? { "Idempotency-Key": idempotencyKey }
          : undefined,
      },
    );

    if (wait) {
      if (!result?.jobId) {
        throw new Knowledge2Error("Server response missing jobId — cannot poll for completion");
      }
      if (!result?.batchId) {
        throw new Knowledge2Error("Server response missing batchId — cannot fetch batch status");
      }
      try {
        await this.client.pollJob(result.jobId, { pollIntervalMs, timeoutMs });
      } catch (error) {
        const status = await this.getBatch(corpusId, result.batchId);
        if (
          status &&
          ["succeeded", "failed", "partial_failed", "canceled"].includes(status.status)
        ) {
          return status;
        }
        throw error;
      }
      return this.getBatch(corpusId, result.batchId);
    }
    return result;
  }

  async getBatch(corpusId: string, batchId: string) {
    return this.client.request<{
      batchId: string;
      jobId: string;
      status: string;
      count: number;
      processedCount: number;
      succeededCount: number;
      failedCount: number;
      docIds: string[];
      idempotentReplay?: boolean;
      errors?: Array<{ index: number; error: string }>;
    }>(
      "GET",
      `/v1/corpora/${this.encodePath(corpusId)}/document_batches/${this.encodePath(batchId)}`,
    );
  }

  /**
   * Upload a batch of files.
   *
   * When `wait` is true (default), polls until the batch job completes.
   */
  async uploadFilesBatch(
    corpusId: string,
    files: Array<Blob | File>,
    options?: {
      idempotencyKey?: string;
      autoIndex?: boolean;
      chunkStrategy?: string;
      chunking?: Record<string, unknown>;
      wait?: boolean;
      pollIntervalMs?: number;
      timeoutMs?: number;
    },
  ) {
    const { idempotencyKey, wait = true, pollIntervalMs, timeoutMs, ...rest } = options ?? {};

    const form = new FormData();

    for (const file of files) {
      form.append("files", file);
    }

    // Append remaining scalar/JSON options as snake_case form fields
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined && value !== null) {
        form.append(
          camelToSnake(key),
          typeof value === "object" ? JSON.stringify(value) : String(value),
        );
      }
    }

    const result = await this.client.request<{ jobId: string }>(
      "POST",
      `/v1/corpora/${this.encodePath(corpusId)}/documents:upload_batch`,
      {
        body: form,
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
   * Ingest documents from URLs.
   *
   * When `wait` is true (default), polls until the ingestion job completes.
   */
  async ingestUrls(
    corpusId: string,
    urls: string[],
    options?: {
      idempotencyKey?: string;
      autoIndex?: boolean;
      chunkStrategy?: string;
      chunking?: Record<string, unknown>;
      wait?: boolean;
      pollIntervalMs?: number;
      timeoutMs?: number;
    },
  ) {
    const { idempotencyKey, wait = true, pollIntervalMs, timeoutMs, ...rest } = options ?? {};
    const result = await this.client.request<{ jobId: string }>(
      "POST",
      `/v1/corpora/${this.encodePath(corpusId)}/documents:ingest_urls`,
      {
        body: { urls, ...rest },
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

  /** Ingest documents from a manifest URI. */
  async ingestManifest(
    corpusId: string,
    manifestUri: string,
    options?: {
      maxDocuments?: number;
      idempotencyKey?: string;
      autoIndex?: boolean;
      chunkStrategy?: string;
      chunking?: Record<string, unknown>;
    },
  ) {
    const { idempotencyKey, ...rest } = options ?? {};
    return this.client.request(
      "POST",
      `/v1/corpora/${this.encodePath(corpusId)}/documents:ingest_manifest`,
      {
        body: { manifestUri, ...rest },
        headers: idempotencyKey
          ? { "Idempotency-Key": idempotencyKey }
          : undefined,
      },
    );
  }

  /** Get the backend-advertised upload formats for a corpus. */
  async getUploadCapabilities(corpusId: string) {
    return this.client.request<DocumentUploadCapabilities>(
      "GET",
      `/v1/corpora/${this.encodePath(corpusId)}/documents:capabilities`,
    );
  }

  /** List documents in a corpus with manual pagination. */
  async list(
    corpusId: string,
    options?: {
      limit?: number;
      offset?: number;
      q?: string;
      status?: string;
      source?: string;
      tag?: string;
    },
  ) {
    return this.client.request<{ documents: Document[]; total: number }>(
      "GET",
      `/v1/corpora/${this.encodePath(corpusId)}/documents`,
      {
        params: {
          limit: options?.limit ?? 100,
          offset: options?.offset ?? 0,
          q: options?.q,
          status: options?.status,
          source: options?.source,
          tag: options?.tag,
        },
      },
    );
  }

  /** Iterate over all documents in a corpus with automatic pagination. */
  async *listAll(
    corpusId: string,
    options?: {
      limit?: number;
      q?: string;
      status?: string;
      source?: string;
      tag?: string;
    },
  ) {
    const { limit, ...params } = options ?? {};
    yield* this.client.paginate<Document>(
      "GET",
      `/v1/corpora/${this.encodePath(corpusId)}/documents`,
      "documents",
      { limit: limit ?? 100, params: params as Record<string, string | number | boolean | undefined> },
    );
  }

  /** Get a single document by ID. */
  async get(docId: string) {
    return this.client.request<Document>("GET", `/v1/documents/${this.encodePath(docId)}`);
  }

  /** Update document metadata. */
  async updateMetadata(docId: string, metadata: Record<string, unknown>) {
    return this.client.request(
      "PATCH",
      `/v1/documents/${this.encodePath(docId)}/metadata`,
      { body: { metadata } },
    );
  }

  /** Delete a document from a corpus. */
  async delete(corpusId: string, docId: string, options?: { reindex?: boolean }) {
    return this.client.request(
      "DELETE",
      `/v1/corpora/${this.encodePath(corpusId)}/documents/${this.encodePath(docId)}`,
      {
        params: { reindex: options?.reindex },
      },
    );
  }

  /** List chunks in a corpus with manual pagination. */
  async listChunks(
    corpusId: string,
    options?: { limit?: number; offset?: number },
  ) {
    return this.client.request<{ chunks: Chunk[]; total: number }>(
      "GET",
      `/v1/corpora/${this.encodePath(corpusId)}/chunks`,
      {
        params: {
          limit: options?.limit ?? 100,
          offset: options?.offset ?? 0,
        },
      },
    );
  }

  /** Iterate over all chunks in a corpus with automatic pagination. */
  async *listAllChunks(corpusId: string, options?: { limit?: number }) {
    yield* this.client.paginate<Chunk>(
      "GET",
      `/v1/corpora/${this.encodePath(corpusId)}/chunks`,
      "chunks",
      { limit: options?.limit ?? 100 },
    );
  }
}

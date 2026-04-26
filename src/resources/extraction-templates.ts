import { BaseResource } from "./base-resource.js";

interface FieldSchemaEntry {
  name: string;
  type?: string;
  required?: boolean;
  strategy?: "regex" | "llm" | "both";
  regexPatterns?: string[];
  description?: string;
}

interface ExtractionTemplate {
  id: string;
  ownerOrgId: string | null;
  name: string;
  description?: string | null;
  domain: string;
  isSeed: boolean;
  forkedFromId?: string | null;
  version: number;
  fieldSchema: FieldSchemaEntry[];
  llmPrompt?: string | null;
  piiScrubBeforeLlm: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ExtractionTemplateListResponse {
  items: ExtractionTemplate[];
  total: number;
}

export class ExtractionTemplatesResource extends BaseResource {
  /** List extraction templates accessible to the current org. */
  async list() {
    return this.client.request<ExtractionTemplateListResponse>(
      "GET",
      "/v1/extraction-templates",
    );
  }

  /** Get a single extraction template by ID. */
  async get(templateId: string) {
    return this.client.request<ExtractionTemplate>(
      "GET",
      `/v1/extraction-templates/${this.encodePath(templateId)}`,
    );
  }

  /** Create a new org-scoped extraction template. */
  async create(body: {
    name: string;
    domain?: string;
    forkFrom?: string;
    description?: string;
    fieldSchema?: FieldSchemaEntry[];
    llmPrompt?: string;
    piiScrubBeforeLlm?: boolean;
  }) {
    return this.client.request<ExtractionTemplate>(
      "POST",
      "/v1/extraction-templates",
      { body },
    );
  }

  /** Update an org-owned extraction template. */
  async update(
    templateId: string,
    updates: {
      name?: string;
      description?: string;
      fieldSchema?: FieldSchemaEntry[];
      llmPrompt?: string;
      piiScrubBeforeLlm?: boolean;
    },
  ) {
    return this.client.request<ExtractionTemplate>(
      "PATCH",
      `/v1/extraction-templates/${this.encodePath(templateId)}`,
      { body: updates },
    );
  }

  /** Soft-delete an org-owned extraction template. */
  async delete(templateId: string) {
    return this.client.request<void>(
      "DELETE",
      `/v1/extraction-templates/${this.encodePath(templateId)}`,
    );
  }
}

export type {
  ExtractionTemplate,
  ExtractionTemplateListResponse,
  FieldSchemaEntry,
};

import { BaseResource } from "./base-resource.js";

/** Counts of child resources archived with a project. */
export interface ProjectArchiveResult {
  archived_agents: number;
  archived_feeds: number;
  archived_pipelines: number;
}

/** Counts of child resources restored with a project. */
export interface ProjectRestoreResult {
  restored_agents: number;
  restored_feeds: number;
  restored_pipelines: number;
}

/** Deletion request with confirmation code. */
export interface ProjectDeletionRequest {
  deletion_request_id: string;
  confirmation_code: string | null;
  expires_at: string;
}

/** Confirmation that a project has been permanently deleted. */
export interface ProjectDeletionConfirmation {
  project_id: string;
  message: string;
}

export class ProjectsResource extends BaseResource {
  /** Create a new project. */
  async create(name: string, options?: { orgId?: string; orgName?: string }) {
    return this.client.request<{
      id: string;
      name: string;
      orgId: string;
      createdAt: string;
    }>("POST", "/v1/projects", {
      body: { name, ...options },
    });
  }

  /** List projects with manual pagination. */
  async list(options?: {
    limit?: number;
    offset?: number;
    includeArchived?: boolean;
    status?: string;
  }) {
    const params: Record<string, string | number | boolean | undefined> = {
      limit: options?.limit ?? 100,
      offset: options?.offset ?? 0,
    };
    if (options?.includeArchived) {
      params.include_archived = true;
    }
    if (options?.status) {
      params.status = options.status;
    }
    return this.client.request<{
      projects: Array<{
        id: string;
        name: string;
        orgId: string;
        status: string;
        archivedAt: string | null;
        createdAt: string;
      }>;
    }>("GET", "/v1/projects", { params });
  }

  /** Iterate over all projects with automatic pagination. */
  async *listAll(options?: { limit?: number }) {
    yield* this.client.paginate<{
      id: string;
      name: string;
      orgId: string;
      status: string;
      archivedAt: string | null;
      createdAt: string;
    }>("GET", "/v1/projects", "projects", {
      limit: options?.limit ?? 100,
    });
  }

  /** Archive a project and its child resources. */
  async archive(projectId: string): Promise<ProjectArchiveResult | undefined> {
    return this.client.request<ProjectArchiveResult>(
      "POST",
      `/v1/projects/${projectId}/archive`,
    );
  }

  /** Restore an archived project and its child resources. */
  async unarchive(projectId: string): Promise<ProjectRestoreResult | undefined> {
    return this.client.request<ProjectRestoreResult>(
      "POST",
      `/v1/projects/${projectId}/unarchive`,
    );
  }

  /** Request deletion of an archived project. Returns a confirmation code. */
  async requestDeletion(
    projectId: string,
  ): Promise<ProjectDeletionRequest | undefined> {
    return this.client.request<ProjectDeletionRequest>(
      "POST",
      `/v1/projects/${projectId}/delete`,
    );
  }

  /** Confirm deletion with the code from requestDeletion. */
  async confirmDeletion(
    projectId: string,
    confirmationCode: string,
  ): Promise<ProjectDeletionConfirmation | undefined> {
    return this.client.request<ProjectDeletionConfirmation>(
      "POST",
      `/v1/projects/${projectId}/delete/confirm`,
      { body: { confirmation_code: confirmationCode } },
    );
  }
}

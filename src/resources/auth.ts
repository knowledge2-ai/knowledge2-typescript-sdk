import { BaseResource } from "./base-resource.js";

export class AuthResource extends BaseResource {
  /** Get the current user/API key identity. */
  async whoami() {
    return this.client.request<{
      orgId: string;
      userId?: string;
      email?: string;
      role?: string;
      scopes?: string[];
    }>("GET", "/v1/auth/whoami");
  }

  /** Create a new API key. */
  async createApiKey(orgId: string, name: string, scopes?: string[]) {
    return this.client.request<{
      id: string;
      key: string;
      name: string;
      scopes: string[];
      createdAt: string;
    }>("POST", "/v1/auth/api-keys", {
      body: { orgId, name, scopes },
    });
  }

  /** List all API keys. */
  async listApiKeys() {
    return this.client.request<{
      keys: Array<{
        id: string;
        name: string;
        scopes: string[];
        createdAt: string;
        lastUsedAt?: string;
      }>;
    }>("GET", "/v1/auth/api-keys");
  }

  /** Revoke an API key. */
  async revokeApiKey(keyId: string) {
    return this.client.request("POST", `/v1/auth/api-keys/${this.encodePath(keyId)}:revoke`);
  }

  /** Rotate an API key. */
  async rotateApiKey(keyId: string) {
    return this.client.request<{ id: string; key: string }>(
      "POST",
      `/v1/auth/api-keys/${this.encodePath(keyId)}:rotate`,
    );
  }
}

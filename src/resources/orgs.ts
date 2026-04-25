import { BaseResource } from "./base-resource.js";

export class OrgsResource extends BaseResource {
  /** Create a new organization. */
  async create(name: string, contactEmail?: string) {
    return this.client.request<{
      id: string;
      name: string;
      contactEmail?: string;
      createdAt: string;
    }>("POST", "/v1/orgs", {
      body: { name, contactEmail },
    });
  }
}

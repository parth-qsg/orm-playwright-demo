import { APIRequestContext } from "@playwright/test";

export class BaseApiClient {
  protected request: APIRequestContext;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  private mergeHeaders(
    customHeaders: Record<string, string> = {}
  ): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...customHeaders,
    };
  }

  protected async getRequest(url: string, params?: { [p: string]: unknown }) {
    return this.request.get(url, {
      ...params,
      headers: this.mergeHeaders(params?.headers as Record<string, string>),
    });
  }

  protected async postRequest(url: string, params?: { [p: string]: unknown }) {
    return this.request.post(url, {
      ...params,
      headers: this.mergeHeaders(params?.headers as Record<string, string>),
    });
  }

  protected async putRequest(url: string, params?: { [p: string]: unknown }) {
    return this.request.put(url, {
      ...params,
      headers: this.mergeHeaders(params?.headers as Record<string, string>),
    });
  }

  protected async deleteRequest(
    url: string,
    params?: { [p: string]: unknown }
  ) {
    return this.request.delete(url, {
      ...params,
      headers: this.mergeHeaders(params?.headers as Record<string, string>),
    });
  }
}

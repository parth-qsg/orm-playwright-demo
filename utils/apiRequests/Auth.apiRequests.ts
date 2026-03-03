import { APIResponse, expect } from "@playwright/test";
import { BaseApiClient } from "./Base.apiRequests";
import { UserData } from "~/types/user.types";

export class AuthApi extends BaseApiClient {
  async register(incidentType: UserData) {
    return this.postRequest(`${process.env.API_URL}/api/v1/users/register`, {
      multipart: {
        incidentType: JSON.stringify(incidentType),
      },
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN}`,
        "Content-Type": "application/text",
      },
    });
  }

  async assertUserRegistered(response: APIResponse, expectedEmail: string) {
    if (!response.ok()) throw new Error("Response failed");
    if (response.status() !== 201)
      throw new Error(`Expected 201, got ${response.status()}`);

    const body = await response.json();
    expect(body.data.user.email).toBe(expectedEmail);
  }
}

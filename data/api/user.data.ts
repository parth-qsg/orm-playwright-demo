import { UserData } from "~/types/user.types";

export const baseNewUser = async (
  overrides?: Partial<UserData>
): Promise<UserData> => {
  const { faker } = await import("@faker-js/faker");

  const timestamp = Date.now();

  const base: UserData = {
    email: `user.${timestamp}@domain.com`,
    password: `Test@${faker.string.alphanumeric(10)}`,
    role: "ADMIN",
    username: `user${faker.internet.username().toLowerCase()}${timestamp}`,
  };

  return { ...base, ...overrides };
};

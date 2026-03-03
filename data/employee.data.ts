import { EmployeeData } from "../types/employee.types";

export const baseNewEmployee = async (
  overrides?: Partial<EmployeeData>
): Promise<EmployeeData> => {
  const { faker } = await import("@faker-js/faker");
  const employeeId = faker.string.numeric(6);
  const password = `Auto@${faker.string.alphanumeric(10)}`;
  const photoPath = "data/uploadFile/bot.png";
  const base: EmployeeData = {
    firstName: faker.person.firstName(),
    middleName: faker.person.middleName(),
    lastName: faker.person.lastName(),
    employeeId,
    photoPath: photoPath,
    createLogin: {
      username: faker.internet.username().toLowerCase() + employeeId,
      password: password,
      confirmPassword: password,
    },
  };

  return { ...base, ...overrides };
};

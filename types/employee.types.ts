export interface EmployeeData {
  firstName: string;
  middleName?: string;
  lastName: string;
  employeeId: string;
  photoPath?: string;
  createLogin?: { username: string; password: string; confirmPassword?: string };
}

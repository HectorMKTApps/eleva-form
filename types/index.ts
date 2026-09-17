export interface LineOfBusinessOption {
  value: string;
  sortOrder: number;
}

export interface ConfigResponse {
  linesOfBusiness: string[];
}

export interface ApplicationFormValues {
  name: string;
  phone: string;
  email: string;
  referredBy: string;
  cityAndDepartment: string;
  lineOfBusiness: string;
}

export type ApplicationFieldErrors = Partial<
  Record<keyof ApplicationFormValues | "voiceNote" | "resume", string>
>;

export interface SubmitApplicationSuccess {
  success: true;
  submissionId: string;
}

export interface SubmitApplicationFailure {
  success: false;
  message: string;
  fieldErrors?: ApplicationFieldErrors;
}

export type SubmitApplicationResponse =
  | SubmitApplicationSuccess
  | SubmitApplicationFailure;

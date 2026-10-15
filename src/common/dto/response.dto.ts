export class ApiResponseDto<T> {
  success: boolean;
  data: T;
  message: string;

  constructor(data: T, message: string) {
    this.success = true;
    this.data = data;
    this.message = message;
  }
}

export class ApiErrorResponseDto {
  success: boolean;
  message: string;
  error: string;

  constructor(message: string, error: string) {
    this.success = false;
    this.message = message;
    this.error = error;
  }
}

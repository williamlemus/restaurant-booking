export class CustomError extends Error {
    public statusCode: number;
    public message: string;
    constructor(status: number, message: string) {
      super(message);
      Object.setPrototypeOf(this, CustomError.prototype);
      this.statusCode = status;
      this.message = message;
    }
  }
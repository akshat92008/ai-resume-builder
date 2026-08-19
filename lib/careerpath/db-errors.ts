export class DatabaseUnavailableError extends Error {
  constructor(operation: string) {
    super(`Database unavailable during ${operation}`);
    this.name = "DatabaseUnavailableError";
  }
}

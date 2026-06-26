export function parseJsonBody(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { error: "INVALID_JSON" };
  }
}

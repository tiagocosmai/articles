export function routerBasename(baseUrl: string): string | undefined {
  const trimmed = baseUrl.replace(/\/$/, "");
  if (trimmed === "" || trimmed === "/") {
    return undefined;
  }
  return trimmed;
}

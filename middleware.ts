import { NextResponse, type NextRequest } from "next/server";
import { storageAccessResponseHeaders } from "./src/auth/storageAccess";

export function middleware(request: NextRequest) {
  const headers = storageAccessResponseHeaders({
    access: request.headers.get("sec-fetch-storage-access"),
    destination: request.headers.get("sec-fetch-dest"),
    method: request.method,
  });
  if (!headers) return NextResponse.next();
  const response = NextResponse.next();
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

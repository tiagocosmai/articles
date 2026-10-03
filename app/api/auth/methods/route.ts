import { listAuthMethods } from "../../../../src/auth/methods";

export const runtime = "nodejs";

export function GET() {
  return Response.json({ methods: listAuthMethods() });
}

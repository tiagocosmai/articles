import { linkedinTokenBody } from "./linkedinToken";

it("sends the LinkedIn secret with its padding and without a PKCE verifier", () => {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: "abc",
    redirect_uri: "https://tiagocosmai-articles.vercel.app/api/auth/callback/linkedin",
    code_verifier: "should-not-travel",
    client_id: "client",
    client_secret: "secret-value==",
  });

  const encoded = linkedinTokenBody(body);

  expect(encoded).toContain("client_secret=secret-value==");
  expect(encoded).not.toContain("code_verifier");
  expect(encoded).not.toContain("%3D");
});

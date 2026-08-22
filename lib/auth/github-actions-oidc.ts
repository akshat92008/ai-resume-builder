const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_OIDC_JWKS_URL = `${GITHUB_OIDC_ISSUER}/.well-known/jwks`;
const RELEASE_AUDIENCE = "careeros-release";
const RELEASE_REPOSITORY = "akshat92008/ai-resume-builder";
const RELEASE_REF = "refs/heads/main";
const RELEASE_WORKFLOW_REF = `${RELEASE_REPOSITORY}/.github/workflows/core-release.yml@${RELEASE_REF}`;

type JwtHeader = {
  alg?: string;
  kid?: string;
};

export type GithubActionsReleaseClaims = {
  iss: string;
  aud: string | string[];
  exp: number;
  nbf?: number;
  repository: string;
  ref: string;
  sha: string;
  run_id: string;
  workflow_ref: string;
  event_name: string;
};

type JwksResponse = {
  keys?: JsonWebKey[];
};

function decodeJsonSegment<T>(segment: string): T {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as T;
}

function audienceIncludes(audience: string | string[], expected: string) {
  return Array.isArray(audience) ? audience.includes(expected) : audience === expected;
}

function isReleaseEvent(eventName: string) {
  return eventName === "push" || eventName === "workflow_dispatch";
}

async function verifySignature(token: string, header: JwtHeader) {
  if (header.alg !== "RS256" || !header.kid) return false;
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) return false;

  const response = await fetch(GITHUB_OIDC_JWKS_URL, {
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error("GitHub OIDC key set is unavailable");
  const jwks = await response.json() as JwksResponse;
  const jwk = jwks.keys?.find((key) => key.kid === header.kid);
  if (!jwk) return false;

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    Buffer.from(encodedSignature, "base64url"),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );
}

/**
 * Verify the short-lived GitHub Actions OIDC token used only by the main-branch
 * core release workflow. This lets production create confirmed disposable E2E
 * accounts without weakening real-user email confirmation or storing another
 * long-lived release secret in GitHub.
 */
export async function verifyGithubActionsReleaseToken(token: string, expectedSha: string) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed GitHub OIDC token");

  let header: JwtHeader;
  let claims: GithubActionsReleaseClaims;
  try {
    header = decodeJsonSegment<JwtHeader>(parts[0]);
    claims = decodeJsonSegment<GithubActionsReleaseClaims>(parts[1]);
  } catch {
    throw new Error("Malformed GitHub OIDC token");
  }

  if (!await verifySignature(token, header)) throw new Error("Invalid GitHub OIDC signature");

  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== GITHUB_OIDC_ISSUER) throw new Error("Unexpected GitHub OIDC issuer");
  if (!audienceIncludes(claims.aud, RELEASE_AUDIENCE)) throw new Error("Unexpected GitHub OIDC audience");
  if (!Number.isFinite(claims.exp) || claims.exp < now - 10) throw new Error("Expired GitHub OIDC token");
  if (claims.nbf != null && (!Number.isFinite(claims.nbf) || claims.nbf > now + 30)) throw new Error("GitHub OIDC token is not active");
  if (claims.repository !== RELEASE_REPOSITORY) throw new Error("Unexpected GitHub repository");
  if (claims.ref !== RELEASE_REF) throw new Error("Unexpected GitHub ref");
  if (claims.workflow_ref !== RELEASE_WORKFLOW_REF) throw new Error("Unexpected GitHub workflow");
  if (!isReleaseEvent(claims.event_name)) throw new Error("Unexpected GitHub event");
  if (!/^[a-f0-9]{40}$/i.test(expectedSha) || claims.sha !== expectedSha) throw new Error("GitHub OIDC commit does not match production");
  if (!/^\d+$/.test(String(claims.run_id || ""))) throw new Error("GitHub OIDC run id is missing");

  return claims;
}

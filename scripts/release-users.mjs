import { appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const command = process.argv[2];
const baseUrl = (process.env.E2E_BASE_URL || "").replace(/\/$/, "");
const releaseAudience = "careeros-release";

function requireBaseUrl() {
  if (!baseUrl) throw new Error("E2E_BASE_URL is required");
  const url = new URL(baseUrl);
  if (url.protocol !== "https:") throw new Error("E2E_BASE_URL must use HTTPS");
}

function randomPassword() {
  return `Cr9!${randomBytes(24).toString("base64url")}zQ`;
}

async function githubOidcToken() {
  const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!requestUrl || !requestToken) throw new Error("GitHub Actions OIDC is unavailable");

  const url = new URL(requestUrl);
  url.searchParams.set("audience", releaseAudience);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${requestToken}` },
    redirect: "error",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.value !== "string" || !payload.value) {
    throw new Error(`Could not obtain GitHub OIDC token: status=${response.status}`);
  }
  return payload.value;
}

async function callProvisioner(payload) {
  const oidc = await githubOidcToken();
  const response = await fetch(`${baseUrl}/api/internal/release-users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${oidc}`,
    },
    body: JSON.stringify(payload),
    redirect: "error",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok !== true) {
    throw new Error(`Release user provisioner failed: status=${response.status} code=${data.error?.code || "unknown"}`);
  }
  return data;
}

async function provision() {
  requireBaseUrl();
  const runId = String(process.env.GITHUB_RUN_ID || "").replace(/[^0-9]/g, "");
  if (!runId) throw new Error("GITHUB_RUN_ID is required for release user provisioning");
  const nonce = randomBytes(6).toString("hex");
  const emailA = `release-${runId}-${nonce}-a@example.com`;
  const emailB = `release-${runId}-${nonce}-b@example.com`;
  const passwordA = randomPassword();
  const passwordB = randomPassword();

  console.log(`::add-mask::${passwordA}`);
  console.log(`::add-mask::${passwordB}`);

  const result = await callProvisioner({
    action: "provision",
    users: [
      { email: emailA, password: passwordA },
      { email: emailB, password: passwordB },
    ],
  });
  if (!Array.isArray(result.users) || result.users.length !== 2) {
    throw new Error("Release provisioner did not return two users");
  }

  const userA = result.users.find((user) => user.email === emailA);
  const userB = result.users.find((user) => user.email === emailB);
  if (!userA?.id || !userB?.id) throw new Error("Release provisioner returned incomplete identities");

  const envPath = process.env.GITHUB_ENV;
  if (!envPath) throw new Error("GITHUB_ENV is required when provisioning release users");
  appendFileSync(
    envPath,
    `E2E_EMAIL=${emailA}\nE2E_PASSWORD=${passwordA}\nE2E_USER_ID=${userA.id}\nE2E_USER_B_EMAIL=${emailB}\nE2E_USER_B_PASSWORD=${passwordB}\nE2E_USER_B_ID=${userB.id}\n`,
  );
  console.log("Provisioned two isolated confirmed ephemeral release accounts through GitHub OIDC");
}

async function cleanup() {
  requireBaseUrl();
  const userIds = [process.env.E2E_USER_B_ID, process.env.E2E_USER_ID].filter(Boolean);
  if (userIds.length === 0) {
    console.log("No ephemeral release accounts were provisioned; cleanup is a no-op");
    return;
  }

  await callProvisioner({ action: "cleanup", userIds });
  console.log(`Deleted ${userIds.length} ephemeral release account(s)`);
}

async function main() {
  if (command === "provision") return provision();
  if (command === "cleanup") return cleanup();
  throw new Error("Usage: node scripts/release-users.mjs <provision|cleanup>");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

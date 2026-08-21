import { appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const command = process.argv[2];
const baseUrl = (process.env.E2E_BASE_URL || "").replace(/\/$/, "");

function requireBaseUrl() {
  if (!baseUrl) throw new Error("E2E_BASE_URL is required");
  const url = new URL(baseUrl);
  if (url.protocol !== "https:") throw new Error("E2E_BASE_URL must use HTTPS");
}

function randomPassword() {
  return `Cr9!${randomBytes(24).toString("base64url")}zQ`;
}

async function signup(email, password) {
  const response = await fetch(`${baseUrl}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    redirect: "error",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok !== true || payload.requiresEmailConfirmation !== false) {
    throw new Error(`Could not provision ${email}: status=${response.status} code=${payload.error?.code || "unknown"}`);
  }
}

async function deleteAccount(email, password) {
  if (!email || !password) return;
  const response = await fetch(`${baseUrl}/api/account`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, confirm: "DELETE" }),
    redirect: "error",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok !== true) {
    throw new Error(`Could not delete ${email}: status=${response.status} code=${payload.error?.code || "unknown"}`);
  }
}

async function provision() {
  requireBaseUrl();
  const runId = String(process.env.GITHUB_RUN_ID || Date.now()).replace(/[^0-9]/g, "");
  const nonce = randomBytes(6).toString("hex");
  const emailA = `release-${runId}-${nonce}-a@example.com`;
  const emailB = `release-${runId}-${nonce}-b@example.com`;
  const passwordA = randomPassword();
  const passwordB = randomPassword();

  console.log(`::add-mask::${passwordA}`);
  console.log(`::add-mask::${passwordB}`);

  let createdA = false;
  let createdB = false;
  try {
    await signup(emailA, passwordA);
    createdA = true;
    await signup(emailB, passwordB);
    createdB = true;
  } catch (error) {
    const cleanupErrors = [];
    if (createdB) {
      try { await deleteAccount(emailB, passwordB); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
    }
    if (createdA) {
      try { await deleteAccount(emailA, passwordA); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
    }
    if (cleanupErrors.length > 0) {
      console.error("Release-user rollback also failed", cleanupErrors);
    }
    throw error;
  }

  const envPath = process.env.GITHUB_ENV;
  if (!envPath) throw new Error("GITHUB_ENV is required when provisioning release users");
  appendFileSync(envPath, `E2E_EMAIL=${emailA}\nE2E_PASSWORD=${passwordA}\nE2E_USER_B_EMAIL=${emailB}\nE2E_USER_B_PASSWORD=${passwordB}\n`);
  console.log("Provisioned two isolated ephemeral release accounts");
}

async function cleanup() {
  requireBaseUrl();
  const accounts = [
    [process.env.E2E_USER_B_EMAIL, process.env.E2E_USER_B_PASSWORD],
    [process.env.E2E_EMAIL, process.env.E2E_PASSWORD],
  ].filter(([email, password]) => email && password);

  if (accounts.length === 0) {
    console.log("No ephemeral release accounts were provisioned; cleanup is a no-op");
    return;
  }

  const errors = [];
  for (const [email, password] of accounts) {
    try {
      await deleteAccount(email, password);
      console.log(`Deleted ephemeral release account ${email}`);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) throw new AggregateError(errors, "One or more release accounts could not be deleted");
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

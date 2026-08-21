// Background service worker for API communication

const PRODUCTION_ORIGIN = "https://ai-resume-builder-ivory-nine.vercel.app";
const DEFAULT_API_URL = `${PRODUCTION_ORIGIN}/api`;
const LOCAL_API_URL = "http://localhost:3000/api";
const ALLOWED_API_URLS = new Set([DEFAULT_API_URL, LOCAL_API_URL]);

function normalizeApiUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\/$/, "");
  return ALLOWED_API_URLS.has(trimmed) ? trimmed : null;
}

/**
 * Resolves the API base URL from chrome.storage, falling back to the live
 * production origin. Only the production API and localhost development API
 * are accepted so clipped job data cannot be redirected to an arbitrary host.
 */
async function getApiBaseUrl(): Promise<string> {
  try {
    const result = await chrome.storage.sync.get(["apiBaseUrl"]);
    return normalizeApiUrl(result.apiBaseUrl) || DEFAULT_API_URL;
  } catch {
    return DEFAULT_API_URL;
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "SAVE_JOB_TO_API") {
    saveJob(request.data)
      .then((res) => sendResponse({ success: true, data: res }))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : "Failed to save job" }));
    return true;
  }

  if (request.action === "SET_API_URL") {
    const normalized = normalizeApiUrl(request.url);
    if (!normalized) {
      sendResponse({ success: false, error: "Only the CareerOS production API or localhost development API is allowed." });
      return true;
    }

    chrome.storage.sync
      .set({ apiBaseUrl: normalized })
      .then(() => sendResponse({ success: true, url: normalized }))
      .catch(() => sendResponse({ success: false, error: "Could not save API setting." }));
    return true;
  }

  if (request.action === "GET_API_URL") {
    getApiBaseUrl().then((url) => sendResponse({ url }));
    return true;
  }
});

async function saveJob(jobData: {
  company?: string;
  title?: string;
  description?: string;
  jobUrl?: string;
}) {
  const apiBaseUrl = await getApiBaseUrl();

  const response = await fetch(`${apiBaseUrl}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      company: jobData.company || "Unknown Company",
      role: jobData.title || "Unknown Role",
      jobUrl: jobData.jobUrl,
      notes: `Extracted Job Description:\n\n${jobData.description || ""}`,
      status: "saved",
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const apiMessage = (errorData as { error?: { message?: string } }).error?.message;
    if (response.status === 401) {
      throw new Error("Sign in to CareerOS in this browser, then try clipping again.");
    }
    throw new Error(apiMessage || "Failed to save job");
  }

  return response.json();
}

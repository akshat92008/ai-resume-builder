// Background service worker for API communication

const DEFAULT_API_URL = "https://app.careeros.ai/api";
const DEV_API_URL = "http://localhost:3000/api";

/**
 * Resolves the API base URL from chrome.storage, falling back to production.
 */
async function getApiBaseUrl(): Promise<string> {
  try {
    const result = await chrome.storage.sync.get(["apiBaseUrl"]);
    return result.apiBaseUrl || DEFAULT_API_URL;
  } catch {
    return DEFAULT_API_URL;
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "SAVE_JOB_TO_API") {
    saveJob(request.data)
      .then((res) => sendResponse({ success: true, data: res }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep the message channel open for async response
  }

  if (request.action === "SET_API_URL") {
    chrome.storage.sync.set({ apiBaseUrl: request.url });
    sendResponse({ success: true });
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
    throw new Error(
      (errorData as { error?: { message?: string } }).error?.message ||
        "Failed to save job"
    );
  }

  return response.json();
}

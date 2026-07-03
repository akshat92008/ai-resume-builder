// Background service worker for API communication

const API_BASE_URL = "http://localhost:3000/api";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SAVE_JOB_TO_API") {
    saveJob(request.data)
      .then(res => sendResponse({ success: true, data: res }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep the message channel open for async response
  }
});

async function saveJob(jobData) {
  // We need to fetch the session token or use standard cookie auth if they are logged in on the same browser
  // For V1, assuming the user is logged into localhost:3000 on the same browser, fetch will send cookies.
  
  const response = await fetch(`${API_BASE_URL}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      company: jobData.company || "Unknown Company",
      role: jobData.title || "Unknown Role",
      jobUrl: jobData.jobUrl,
      notes: `Extracted Job Description:\n\n${jobData.description}`,
      status: "saved"
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "Failed to save job");
  }

  return response.json();
}

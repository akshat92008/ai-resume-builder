document.addEventListener("DOMContentLoaded", () => {
  const clipBtn = document.getElementById("clip-btn") as HTMLButtonElement;
  const successMsg = document.getElementById("success-msg") as HTMLDivElement;
  const errorMsg = document.getElementById("error-msg") as HTMLDivElement;
  const apiUrlInput = document.getElementById("api-url") as HTMLInputElement;
  const appLink = document.getElementById("app-link") as HTMLAnchorElement;

  // Load saved API URL
  chrome.runtime.sendMessage({ action: "GET_API_URL" }, (response) => {
    if (response?.url) {
      apiUrlInput.value = response.url;
      // Update the dashboard link to match the configured server
      try {
        const url = new URL(response.url);
        appLink.href = `${url.origin}/jobs`;
      } catch {
        // Keep default link
      }
    }
  });

  // Save API URL on change
  apiUrlInput.addEventListener("change", () => {
    const url = apiUrlInput.value.trim();
    if (url) {
      chrome.runtime.sendMessage({ action: "SET_API_URL", url });
      try {
        const parsed = new URL(url);
        appLink.href = `${parsed.origin}/jobs`;
      } catch {
        // Invalid URL, ignore
      }
    }
  });

  clipBtn.addEventListener("click", async () => {
    clipBtn.disabled = true;
    clipBtn.textContent = "Clipping...";
    successMsg.style.display = "none";
    errorMsg.style.display = "none";

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.id) {
        throw new Error("No active tab found");
      }

      const response = await chrome.tabs.sendMessage(tab.id, { action: "CLIP_JOB" });

      if (response && response.success) {
        // Send the extracted data to the background worker to post to the API
        chrome.runtime.sendMessage(
          { action: "SAVE_JOB_TO_API", data: { ...response.data, jobUrl: tab.url } },
          (apiResponse) => {
            if (apiResponse?.success) {
              successMsg.style.display = "block";
              clipBtn.textContent = "Clipped!";
            } else {
              errorMsg.textContent = apiResponse?.error || "Failed to save to CareerOS";
              errorMsg.style.display = "block";
              clipBtn.disabled = false;
              clipBtn.textContent = "Try Again";
            }
          }
        );
      } else {
        errorMsg.style.display = "block";
        clipBtn.disabled = false;
        clipBtn.textContent = "Clip Job to Tracker";
      }
    } catch (err) {
      console.error(err);
      errorMsg.style.display = "block";
      clipBtn.disabled = false;
      clipBtn.textContent = "Clip Job to Tracker";
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const clipBtn = document.getElementById("clip-btn") as HTMLButtonElement;
  const successMsg = document.getElementById("success-msg") as HTMLDivElement;
  const errorMsg = document.getElementById("error-msg") as HTMLDivElement;
  const apiUrlInput = document.getElementById("api-url") as HTMLInputElement;
  const appLink = document.getElementById("app-link") as HTMLAnchorElement;

  function showError(message: string) {
    errorMsg.textContent = message;
    errorMsg.style.display = "block";
  }

  function updateAppLink(apiUrl: string) {
    try {
      const url = new URL(apiUrl);
      appLink.href = `${url.origin}/jobs`;
    } catch {
      // Keep the known-good production dashboard link.
    }
  }

  chrome.runtime.sendMessage({ action: "GET_API_URL" }, (response) => {
    if (response?.url) {
      apiUrlInput.value = response.url;
      updateAppLink(response.url);
    }
  });

  apiUrlInput.addEventListener("change", () => {
    const url = apiUrlInput.value.trim();
    if (!url) return;

    errorMsg.style.display = "none";
    chrome.runtime.sendMessage({ action: "SET_API_URL", url }, (response) => {
      if (!response?.success) {
        showError(response?.error || "That API server is not allowed.");
        chrome.runtime.sendMessage({ action: "GET_API_URL" }, (current) => {
          if (current?.url) apiUrlInput.value = current.url;
        });
        return;
      }

      apiUrlInput.value = response.url;
      updateAppLink(response.url);
    });
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

      if (response?.success) {
        chrome.runtime.sendMessage(
          { action: "SAVE_JOB_TO_API", data: { ...response.data, jobUrl: tab.url } },
          (apiResponse) => {
            if (apiResponse?.success) {
              successMsg.style.display = "block";
              clipBtn.textContent = "Clipped!";
            } else {
              showError(apiResponse?.error || "Failed to save to CareerOS");
              clipBtn.disabled = false;
              clipBtn.textContent = "Try Again";
            }
          },
        );
      } else {
        showError("Could not read a supported job description on this page.");
        clipBtn.disabled = false;
        clipBtn.textContent = "Clip Job to Tracker";
      }
    } catch (err) {
      console.error(err);
      showError(err instanceof Error ? err.message : "Failed to clip this job.");
      clipBtn.disabled = false;
      clipBtn.textContent = "Clip Job to Tracker";
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const clipBtn = document.getElementById("clip-btn");
  const successMsg = document.getElementById("success-msg");
  const errorMsg = document.getElementById("error-msg");

  clipBtn.addEventListener("click", async () => {
    clipBtn.disabled = true;
    clipBtn.textContent = "Clipping...";
    successMsg.style.display = "none";
    errorMsg.style.display = "none";

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const response = await chrome.tabs.sendMessage(tab.id, { action: "CLIP_JOB" });
      
      if (response && response.success) {
        // Send the extracted data to the background worker to post to the API
        chrome.runtime.sendMessage(
          { action: "SAVE_JOB_TO_API", data: { ...response.data, jobUrl: tab.url } }, 
          (apiResponse) => {
            if (apiResponse.success) {
              successMsg.style.display = "block";
              clipBtn.textContent = "Clipped!";
            } else {
              errorMsg.textContent = apiResponse.error || "Failed to save to CareerOS";
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

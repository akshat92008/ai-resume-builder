// Content script to extract job details from supported boards

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "CLIP_JOB") {
    const data = extractJobData();
    if (data) {
      sendResponse({ success: true, data });
    } else {
      sendResponse({ success: false });
    }
  }
  return true;
});

function extractJobData() {
  const url = window.location.href;
  let title = "";
  let company = "";
  let description = "";

  try {
    if (url.includes("linkedin.com/jobs")) {
      title = document.querySelector(".job-details-jobs-unified-top-card__job-title")?.innerText || 
              document.querySelector("h1")?.innerText || "";
      company = document.querySelector(".job-details-jobs-unified-top-card__company-name")?.innerText || "";
      description = document.querySelector("#job-details")?.innerText || "";
    } 
    else if (url.includes("greenhouse.io")) {
      title = document.querySelector(".app-title")?.innerText || document.querySelector("h1")?.innerText || "";
      company = document.querySelector(".company-name")?.innerText || "";
      description = document.querySelector("#content")?.innerText || "";
    }
    else if (url.includes("lever.co")) {
      title = document.querySelector(".posting-headline h2")?.innerText || "";
      company = document.title.split("-")[0].trim() || "";
      description = document.querySelector(".posting-details")?.innerText || "";
    }
    else {
      // Generic fallback
      title = document.querySelector("h1")?.innerText || document.title;
      description = document.body.innerText.substring(0, 5000); // Grab a chunk of text
    }

    if (!title && !description) return null;

    return {
      title: title.trim(),
      company: company.trim(),
      description: description.trim()
    };
  } catch (e) {
    console.error("CareerOS Clipper Error:", e);
    return null;
  }
}

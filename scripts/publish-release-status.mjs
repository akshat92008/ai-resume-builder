const descriptions = {
  pending: "Exact-production certification is running",
  failure: "Exact-production certification failed",
  success: "Exact-production certification passed",
};

async function main() {
  const state = process.argv[2];
  if (!Object.hasOwn(descriptions, state)) {
    throw new Error(`Unsupported release status state: ${state || "<missing>"}`);
  }

  const required = [
    "GH_TOKEN",
    "GITHUB_REPOSITORY",
    "GITHUB_SHA",
    "GITHUB_SERVER_URL",
    "GITHUB_RUN_ID",
    "RELEASE_STATUS_CONTEXT",
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing release status environment: ${missing.join(", ")}`);
  }

  const url = `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/statuses/${process.env.GITHUB_SHA}`;
  const targetUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      state,
      context: process.env.RELEASE_STATUS_CONTEXT,
      description: descriptions[state],
      target_url: targetUrl,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Could not publish ${state} release status: ${response.status} ${body.slice(0, 300)}`);
  }

  console.log(`Published ${state} status for ${process.env.GITHUB_SHA}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

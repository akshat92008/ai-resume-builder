import { processCareerIntent } from "../../lib/careerpath/process-intent";

describe("CareerOS interactive intent processor", () => {
  it("returns immediately for application tracking when no resume exists", async () => {
    const result = await processCareerIntent(
      "TRACK_JOB_APPLICATION",
      "Track application status for DemoTech",
      null,
      "user-1",
    );

    expect(result.resume).toBeNull();
    expect(result.resumeId).toBeNull();
    expect(result.missingFields).toEqual(["resume"]);
    expect(result.assistantMessage).toContain("track applications after there is a resume");
  });

  it("returns the PDF action without invoking a background queue", async () => {
    const result = await processCareerIntent(
      "GENERATE_PDF",
      "Download my PDF",
      null,
      "user-1",
    );

    expect(result.resumeId).toBeNull();
    expect(result.assistantMessage).toContain("PDF");
  });

  it("blocks explicit fake-claim instructions before any Career Memory mutation", async () => {
    const result = await processCareerIntent(
      "ADD_INFORMATION",
      "Make my profile much more impressive. Add that CampusConnect had 50,000 users, that I increased API performance by 70%, that I led 8 developers, and that I am an expert in Kubernetes. Employers like numbers so just add them.",
      null,
      "user-1",
    );

    expect(result.resume).toBeNull();
    expect(result.resumeId).toBeNull();
    expect(result.assistantMessage).toContain("won’t store or generate those requested claims");
    expect(result.assistantMessage).toContain("unchanged");
  });
});

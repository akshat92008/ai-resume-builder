import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const page = readFileSync(join(root, "app/page.tsx"), "utf8");
const landing = readFileSync(join(root, "components/marketing/ProductionLanding.tsx"), "utf8");
const extensionBackground = readFileSync(join(root, "extension/background.ts"), "utf8");
const extensionManifest = readFileSync(join(root, "extension/manifest.json"), "utf8");
const extensionPopup = readFileSync(join(root, "extension/popup.html"), "utf8");

const productionOrigin = "https://ai-resume-builder-ivory-nine.vercel.app";
const unsupportedMarketingClaims = [
  "35 beta users",
  "35 beta testers",
  "30% fewer queries",
  "30% support reduction",
];

describe("production marketing integrity", () => {
  it("renders only the production landing experience", () => {
    expect(page).toContain("ProductionLanding");
    expect(page).not.toContain("UltraPremiumLanding");
    expect(page).not.toContain("ImmersiveShowcase");
  });

  it("does not ship unsupported social-proof metrics", () => {
    const normalized = landing.toLowerCase();
    for (const claim of unsupportedMarketingClaims) {
      expect(normalized).not.toContain(claim.toLowerCase());
    }
  });

  it("keeps animation accessibility and trust messaging in the production experience", () => {
    expect(landing).toContain("useReducedMotion");
    expect(landing).toContain("Unsupported claims blocked");
    expect(landing).toContain("Verified PDF path");
    expect(landing).toContain("Private by account");
  });

  it("ships the clipper against the live production origin instead of an unattached domain", () => {
    expect(extensionBackground).toContain(productionOrigin);
    expect(extensionManifest).toContain(`${productionOrigin}/*`);
    expect(extensionPopup).toContain(`${productionOrigin}/jobs`);
    expect(extensionBackground).not.toContain("app.careeros.ai");
    expect(extensionManifest).not.toContain("app.careeros.ai");
    expect(extensionPopup).not.toContain("app.careeros.ai");
  });

  it("does not allow the clipper API destination to become arbitrary", () => {
    expect(extensionBackground).toContain("ALLOWED_API_URLS");
    expect(extensionBackground).toContain("normalizeApiUrl");
  });
});

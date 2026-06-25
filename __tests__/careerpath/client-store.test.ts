import { saveCareerPathResume, getCareerPathResume, deleteCareerPathResume, getCareerPathResumes } from "../../lib/careerpath/client-store";
import type { CareerPathResume } from "../../lib/careerpath/types";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("Client Store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const mockResume: CareerPathResume = {
    id: "test-id",
    userId: "test-user",
    title: "Test Resume",
    targetRole: "Engineer",
    version: 1,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content: {
      personal: {},
      summary: "Test",
      skills: [],
      experience: [],
      projects: [],
      education: [],
    },
  };

  it("should save and retrieve a resume", () => {
    saveCareerPathResume(mockResume);
    const retrieved = getCareerPathResume("test-id");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe("test-id");
  });

  it("should list all resumes", () => {
    saveCareerPathResume(mockResume);
    saveCareerPathResume({ ...mockResume, id: "test-id-2" });
    const all = getCareerPathResumes();
    expect(all.length).toBe(2);
  });

  it("should delete a resume", () => {
    saveCareerPathResume(mockResume);
    deleteCareerPathResume("test-id");
    const retrieved = getCareerPathResume("test-id");
    expect(retrieved).toBeNull();
  });
});

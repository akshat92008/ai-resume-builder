import { describe, expect, it } from 'vitest';
import { extractProfileData } from '../../lib/careerpath/agents';

describe('resume parser eval', () => {
  it('extracts experience, education, and skills from career notes', () => {
    const testInput = `I worked at Google from Jan 2020 to March 2023 as a Senior Software Engineer. I built a distributed caching system using Redis and Go that reduced latency by 40% and saved $200k annually. I also have a BS in Computer Science from Stanford University.`;

    const result = extractProfileData(testInput, undefined, "Senior Software Engineer");
    const extractedSkills = Object.values(result.skills).flat().map((skill) => skill.toLowerCase());

    expect(result.experience).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          company: "Google",
          role: "Senior Software Engineer",
        }),
      ]),
    );
    expect(result.education).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          institution: "Stanford University",
        }),
      ]),
    );
    expect(extractedSkills).toEqual(expect.arrayContaining(["go", "redis"]));
  });
});

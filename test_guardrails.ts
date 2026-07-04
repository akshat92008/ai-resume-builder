import { checkPromptInjection } from "./lib/careerpath/guardrails";

const input = `14. Check grammar and spelling.
15. Make the resume recruiter-ready.

After generating the resume, perform a self-review and score it on:
- ATS Compatibility (/100)
- Formatting (/100)
- Professionalism (/100)
- Impact of Bullet Points (/100)
- Keyword Optimization (/100)
- Grammar (/100)
- Readability (/100)
- Recruiter Appeal (/100)

Then list:
- 5 strengths
- 5 weaknesses
- 5 specific improvements

Finally answer:
"If you were a recruiter receiving 500 resumes, would this resume likely reach the interview stage? Explain why."`;

async function test() {
  const result = await checkPromptInjection(input);
  console.log("Result:", result);
}

test();

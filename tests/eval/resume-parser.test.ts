import { extractProfileDataAgent } from '../../lib/careerpath/agents';

// Example evaluation script for AI accuracy
async function evaluateParser() {
  const testInput = `I worked at Google from Jan 2020 to March 2023 as a Senior Software Engineer. I built a distributed caching system using Redis and Go that reduced latency by 40% and saved $200k annually. I also have a BS in Computer Science from Stanford University.`;

  console.log('Running AI Eval for Resume Parser...');
  
  const startTime = Date.now();
  const result = await extractProfileDataAgent(testInput, {
    personal: {},
    target: { targetRoles: [], targetIndustries: [] },
    experience: [],
    education: [],
    projects: [],
    skills: [],
    certifications: [],
    documents: [],
    gaps: [],
    strengths: [],
    weaknesses: [],
    achievements: [],
  });
  
  const duration = Date.now() - startTime;
  
  const hasExperience = result.experience.some(e => e.company === 'Google' && e.title === 'Senior Software Engineer');
  const hasEducation = result.education.some(e => e.institution === 'Stanford University');
  const hasSkills = result.skills.some(s => s.name.toLowerCase() === 'go' || s.name.toLowerCase() === 'redis');
  
  console.log(`Eval Results (Took ${duration}ms):`);
  console.log(`- Extracted Experience: ${hasExperience ? '✅' : '❌'}`);
  console.log(`- Extracted Education: ${hasEducation ? '✅' : '❌'}`);
  console.log(`- Extracted Skills: ${hasSkills ? '✅' : '❌'}`);
  
  if (!hasExperience || !hasEducation || !hasSkills) {
    process.exit(1);
  } else {
    console.log('All evals passed.');
    process.exit(0);
  }
}

evaluateParser();

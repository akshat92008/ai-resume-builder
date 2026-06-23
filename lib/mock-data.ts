import { UserVault } from './types';

export const mockVault: UserVault = {
  profile: {
    id: 'mock-user-1',
    full_name: 'Akshat Singh',
    email: 'akshat.singh@example.com',
    phone: '+91 98765 43210',
    city: 'Bengaluru, India',
    linkedin_url: 'https://linkedin.com/in/akshat-mock',
    github_url: 'https://github.com/akshat-mock',
    portfolio_url: 'https://akshat.dev',
    target_roles: ['Full-stack Developer', 'AI SaaS Engineer', 'Frontend Engineer'],
    headline: 'Full-stack AI SaaS Developer building proof-backed applications',
    summary: 'Computer Science graduate with hands-on experience in Next.js, React, and Supabase. Passionate about AI integrations and building production-ready SaaS tools.',
    public_slug: 'akshat-singh',
    portfolio_public: true,
    role: 'admin',
    plan: 'pro',
    plan_status: 'active',
    pro_until: null,
    referral_code: 'AKSHAT100',
    referred_by: null,
  },
  education: [
    {
      id: 'edu-1',
      institution: 'Visvesvaraya Technological University (VTU)',
      degree: 'B.Tech in Computer Science',
      field: 'Computer Science',
      start_year: 2020,
      end_year: 2024,
      score: '8.5 CGPA',
      coursework: ['Data Structures', 'Algorithms', 'Web Development', 'Machine Learning', 'Database Systems'],
      achievements: 'Top 5% of the batch, Lead of Web Dev Club',
    }
  ],
  skills: [
    { id: 'sk-1', name: 'Next.js 14/15', category: 'frontend', proficiency: 'advanced', proof_links: ['https://github.com/akshat-mock/cognition-os'] },
    { id: 'sk-2', name: 'TypeScript', category: 'frontend', proficiency: 'advanced', proof_links: ['https://github.com/akshat-mock/cognition-os'] },
    { id: 'sk-3', name: 'Supabase', category: 'backend', proficiency: 'intermediate', proof_links: ['https://github.com/akshat-mock/reachpilot'] },
    { id: 'sk-4', name: 'Tailwind CSS', category: 'frontend', proficiency: 'advanced', proof_links: [] },
    { id: 'sk-5', name: 'Gemini AI API', category: 'ai', proficiency: 'intermediate', proof_links: ['https://github.com/akshat-mock/cognition-os'] },
    { id: 'sk-6', name: 'PostgreSQL', category: 'data', proficiency: 'intermediate', proof_links: [] },
  ],
  projects: [
    {
      id: 'proj-1',
      title: 'Cognition OS',
      short_description: 'AI learning and tutor platform with spaced repetition',
      problem_solved: 'Students struggle to extract key concepts from long PDF notes efficiently.',
      target_users: 'University Students',
      tech_stack: ['Next.js', 'Supabase', 'Gemini API', 'pgvector', 'Tailwind CSS'],
      features: ['PDF upload and parsing', 'AI Question & Answer', 'Spaced repetition flashcards', 'Learner analytics dashboard'],
      impact: 'Used by 150+ classmates, generated over 5,000 flashcards.',
      github_url: 'https://github.com/akshat-mock/cognition-os',
      live_url: 'https://cognition-os.vercel.app',
      screenshots_url: 'https://akshat.dev/case-studies/cognition-os/screenshots',
      case_study_url: 'https://akshat.dev/case-studies/cognition-os',
      role: 'Sole Developer',
      start_date: '2023-08-01',
      end_date: '2023-11-15',
      status: 'completed',
      tags: ['AI', 'Education', 'SaaS']
    },
    {
      id: 'proj-2',
      title: 'ReachPilot AI',
      short_description: 'Ethical B2B outreach assistant for freelancers',
      problem_solved: 'Cold emails are often generic and spammy. ReachPilot personalizes based on company data.',
      target_users: 'Freelancers, Agency Owners',
      tech_stack: ['React', 'Node.js', 'Express', 'OpenAI API'],
      features: ['Campaign builder', 'CSV prospect import', 'AI personalization engine', 'Unsubscribe compliance check'],
      impact: 'Improved average cold email open rates by 35% in beta testing.',
      github_url: '',
      live_url: 'https://reachpilot.demo.app',
      screenshots_url: '',
      case_study_url: '',
      role: 'Full Stack Engineer',
      start_date: '2024-01-10',
      end_date: '2024-04-05',
      status: 'completed',
      tags: ['B2B', 'SaaS', 'Marketing']
    }
  ],
  experiences: [
    {
      id: 'exp-1',
      company: 'TechNova Solutions',
      role: 'Frontend Developer Intern',
      start_date: '2023-05-01',
      end_date: '2023-07-31',
      description: 'Worked on the core web application dashboard.',
      responsibilities: ['Developed responsive UI components using React and Material UI.', 'Integrated REST APIs for real-time data visualization.', 'Optimized frontend bundle size by 15%.'],
      achievements: ['Delivered the reporting module 2 weeks ahead of schedule.'],
      proof_links: ['https://linkedin.com/certification/mock'],
      certificate_url: 'https://linkedin.com/certification/mock',
    }
  ],
  certificates: [
    {
      id: 'cert-1',
      title: 'AWS Certified Cloud Practitioner',
      issuer: 'Amazon Web Services',
      issue_date: '2023-09-15',
      credential_url: 'https://aws.amazon.com/verify/mock',
      related_skills: ['Cloud Computing', 'Deployment']
    }
  ],
  achievements: [
    {
      id: 'ach-1',
      title: 'Hackathon Winner - Smart India Hackathon',
      description: 'Built a predictive maintenance dashboard for industrial IoT.',
      date: '2022-12-10',
      proof_url: 'https://sih.gov.in/mock-winner',
      category: 'Competition'
    }
  ],
  proof_links: [
    { id: 'pl-1', title: 'Cognition OS Source Code', url: 'https://github.com/akshat-mock/cognition-os', type: 'github', notes: 'Main repository' },
    { id: 'pl-2', title: 'Live Demo Video', url: 'https://youtube.com/mock', type: 'video', notes: 'Walkthrough of ReachPilot' }
  ]
};

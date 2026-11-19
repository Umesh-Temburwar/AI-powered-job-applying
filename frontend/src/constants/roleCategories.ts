/**
 * Comprehensive Job Role Categories Catalog
 * ================================================================================
 * Covers all standard industry tech domains with specific role titles,
 * keyword triggers, and badges for multi-portal auto-apply job targeting.
 */

export interface RoleCategory {
  id: string;
  name: string;
  shortName: string;
  badge: string;
  description: string;
  roles: string[];
}

export const ROLE_CATEGORIES: RoleCategory[] = [
  {
    id: 'fullstack',
    name: 'Full Stack Engineering',
    shortName: 'Full Stack',
    badge: 'MERN / Web',
    description: 'End-to-end web & software engineering across client, server, and databases.',
    roles: [
      'Full Stack Developer',
      'MERN Stack Developer',
      'MEAN Stack Developer',
      'Full Stack Python Developer',
      'Full Stack Java Developer',
      'Software Engineer',
      'Web Application Engineer',
    ],
  },
  {
    id: 'frontend',
    name: 'Frontend & UI Engineering',
    shortName: 'Frontend',
    badge: 'UI / UX',
    description: 'Client-side web development, reactive user interfaces, and component systems.',
    roles: [
      'Frontend Developer',
      'React Developer',
      'Next.js Developer',
      'Angular Developer',
      'Vue.js Developer',
      'JavaScript Developer',
      'TypeScript Developer',
      'UI/UX Engineer',
      'Web Developer',
    ],
  },
  {
    id: 'backend',
    name: 'Backend & API Engineering',
    shortName: 'Backend',
    badge: 'APIs / Microservices',
    description: 'Server-side business logic, microservices, high-concurrency APIs, and databases.',
    roles: [
      'Backend Developer',
      'Node.js Developer',
      'Python Developer',
      'Java Developer',
      'FastAPI Developer',
      'Django Developer',
      'Go / Golang Developer',
      'C++ Developer',
      '.NET / C# Developer',
      'PHP / Laravel Developer',
      'REST API Engineer',
    ],
  },
  {
    id: 'mobile',
    name: 'Mobile App Development',
    shortName: 'Mobile',
    badge: 'iOS / Android',
    description: 'Cross-platform and native mobile applications for smartphones and tablets.',
    roles: [
      'Mobile App Developer',
      'React Native Developer',
      'Flutter Developer',
      'Android Developer',
      'iOS Developer',
      'Kotlin Developer',
      'Swift Developer',
    ],
  },
  {
    id: 'ai_data',
    name: 'AI, ML & Data Science',
    shortName: 'AI & Data',
    badge: 'Data / GenAI',
    description: 'Machine learning models, GenAI/LLM pipelines, predictive analytics, and data processing.',
    roles: [
      'AI Engineer',
      'Machine Learning Engineer',
      'Data Scientist',
      'Data Analyst',
      'Data Engineer',
      'Generative AI / LLM Engineer',
      'NLP Engineer',
      'Computer Vision Engineer',
      'BI / Business Intelligence Developer',
    ],
  },
  {
    id: 'devops_cloud',
    name: 'Cloud, DevOps & SRE',
    shortName: 'Cloud & DevOps',
    badge: 'Infra / CI-CD',
    description: 'Cloud infrastructure (AWS/GCP/Azure), containerization, CI/CD, and site reliability.',
    roles: [
      'DevOps Engineer',
      'Cloud Engineer (AWS / Azure / GCP)',
      'Site Reliability Engineer (SRE)',
      'Kubernetes Platform Engineer',
      'CI/CD Automation Engineer',
      'Infrastructure Engineer',
      'Linux System Administrator',
    ],
  },
  {
    id: 'qa_testing',
    name: 'QA & Test Automation',
    shortName: 'QA & Testing',
    badge: 'SDET / Automation',
    description: 'Software test automation, quality assurance, E2E browser testing, and performance validation.',
    roles: [
      'QA Automation Engineer',
      'SDET (Software Development Engineer in Test)',
      'Software Test Engineer',
      'Manual QA Tester',
      'Selenium / Playwright Tester',
      'Performance Test Engineer',
    ],
  },
  {
    id: 'security',
    name: 'Cybersecurity & InfoSec',
    shortName: 'Cybersecurity',
    badge: 'Security / SOC',
    description: 'Network defense, application security, penetration testing, and security auditing.',
    roles: [
      'Cybersecurity Analyst',
      'Information Security Engineer',
      'SOC Analyst',
      'Penetration Tester / Ethical Hacker',
      'Application Security (AppSec) Engineer',
      'Network Security Engineer',
    ],
  },
  {
    id: 'product_mgmt',
    name: 'Product & Agile Management',
    shortName: 'Product & Mgmt',
    badge: 'Agile / Delivery',
    description: 'Product lifecycle, requirement translation, sprint delivery, and technical project management.',
    roles: [
      'Associate Product Manager (APM)',
      'Product Manager',
      'Project Coordinator',
      'Scrum Master',
      'Technical Program Manager (TPM)',
      'IT Business Analyst',
    ],
  },
  {
    id: 'systems_iot',
    name: 'Systems, Embedded & IoT',
    shortName: 'Embedded & IoT',
    badge: 'Hardware / Systems',
    description: 'Low-level systems programming, firmware development, connected IoT devices, and robotics.',
    roles: [
      'Embedded Systems Engineer',
      'Firmware Engineer',
      'IoT Solutions Developer',
      'Robotics Software Engineer',
      'Network Engineer',
    ],
  },
  {
    id: 'fresher_intern',
    name: 'Freshers & Internships',
    shortName: 'Fresher & Intern',
    badge: 'Early Career',
    description: 'Entry-level roles, college internships, and graduate engineering trainee programs.',
    roles: [
      'Software Engineer Intern',
      'Frontend Developer Intern',
      'Backend Developer Intern',
      'Full Stack Intern',
      'Graduate Engineer Trainee (GET)',
      'Junior Software Developer',
      'Associate Software Engineer',
      'Technical Support Engineer',
    ],
  },
];

/**
 * Flattened unique list of all suggested roles across all categories.
 */
export const ALL_SUGGESTED_ROLES: string[] = Array.from(
  new Set(ROLE_CATEGORIES.flatMap((c) => c.roles))
);

/**
 * Top high-frequency default suggestions for compact views.
 */
export const PRIMARY_DEFAULT_ROLES: string[] = [
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'React Developer',
  'Node.js Developer',
  'Python Developer',
  'Software Engineer',
  'DevOps Engineer',
  'Web Developer',
  'Software Engineer Intern',
];

/**
 * Helper to fetch all roles belonging to a specific category id.
 */
export function getRolesByCategoryId(categoryId: string): string[] {
  const found = ROLE_CATEGORIES.find((c) => c.id === categoryId);
  return found ? found.roles : [];
}

/**
 * Helper to identify which category a given role belongs to.
 */
export function getCategoryForRole(roleName: string): RoleCategory | undefined {
  const norm = roleName.trim().toLowerCase();
  return ROLE_CATEGORIES.find((c) => c.roles.some((r) => r.toLowerCase() === norm));
}

/**
 * Filter roles across all categories by partial search text.
 */
export function searchRoles(query: string): string[] {
  if (!query || !query.trim()) return ALL_SUGGESTED_ROLES;
  const q = query.trim().toLowerCase();
  return ALL_SUGGESTED_ROLES.filter((r) => r.toLowerCase().includes(q));
}

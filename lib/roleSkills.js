const ROLE_SKILLS = {
  "Software Engineer": {
    essential: ["DSA", "Python", "SQL", "Git/GitHub"],
    important: ["Web Development", "Cloud"],
    goodToHave: ["Machine Learning", "Communication"],
  },
  "Frontend Developer": {
    essential: ["Web Development", "Git/GitHub"],
    important: ["Python", "SQL"],
    goodToHave: ["Cloud", "Communication"],
  },
  "Backend Developer": {
    essential: ["Python", "SQL", "Git/GitHub", "Cloud"],
    important: ["DSA", "Web Development"],
    goodToHave: ["Machine Learning", "Communication"],
  },
  "Full Stack Developer": {
    essential: ["Web Development", "Python", "SQL", "Git/GitHub"],
    important: ["Cloud", "DSA"],
    goodToHave: ["Machine Learning", "Communication"],
  },
  "Data Scientist": {
    essential: ["Python", "Data Science", "Machine Learning", "SQL"],
    important: ["Deep Learning", "Statistics"],
    goodToHave: ["Cloud", "Communication", "Git/GitHub"],
  },
  "Data Analyst": {
    essential: ["SQL", "Python", "Data Science"],
    important: ["Machine Learning", "Communication"],
    goodToHave: ["Git/GitHub", "Cloud"],
  },
  "Machine Learning Engineer": {
    essential: ["Python", "Machine Learning", "Deep Learning", "Data Science"],
    important: ["AI/LLMs", "SQL", "DSA"],
    goodToHave: ["Cloud", "Git/GitHub", "Communication"],
  },
  "AI Engineer": {
    essential: ["Python", "Machine Learning", "Deep Learning", "AI/LLMs"],
    important: ["Data Science", "DSA"],
    goodToHave: ["Cloud", "Git/GitHub", "Communication"],
  },
  "DevOps Engineer": {
    essential: ["Cloud", "Git/GitHub", "Python"],
    important: ["DSA", "SQL"],
    goodToHave: ["Web Development", "Communication", "Machine Learning"],
  },
  "Cloud Engineer": {
    essential: ["Cloud", "Git/GitHub", "Python"],
    important: ["DSA", "SQL"],
    goodToHave: ["Web Development", "Communication"],
  },
  "Cybersecurity Analyst": {
    essential: ["Cybersecurity", "Python"],
    important: ["Cloud", "Git/GitHub", "SQL"],
    goodToHave: ["Communication", "Web Development"],
  },
  "Product Manager": {
    essential: ["Communication", "SQL"],
    important: ["Python", "Data Science"],
    goodToHave: ["Web Development", "Git/GitHub", "Cloud"],
  },
  "Data Engineer": {
    essential: ["Python", "SQL", "Cloud", "Data Science"],
    important: ["Machine Learning", "Git/GitHub"],
    goodToHave: ["DSA", "Communication"],
  },
  "Research Scientist": {
    essential: ["Python", "Machine Learning", "Deep Learning"],
    important: ["Data Science", "AI/LLMs", "Communication"],
    goodToHave: ["Git/GitHub", "SQL"],
  },
};

export function getRoleSkills(role) {
  return ROLE_SKILLS[role] || null;
}

export function getSkillDemand(role, skillName) {
  const roleData = getRoleSkills(role);
  if (!roleData) return null;
  const lower = skillName.toLowerCase();
  if (roleData.essential.some((s) => s.toLowerCase() === lower)) return "essential";
  if (roleData.important.some((s) => s.toLowerCase() === lower)) return "important";
  if (roleData.goodToHave.some((s) => s.toLowerCase() === lower)) return "goodToHave";
  return null;
}

export const ALL_ROLES = Object.keys(ROLE_SKILLS).sort();

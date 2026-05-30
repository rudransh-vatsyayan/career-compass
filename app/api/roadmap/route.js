import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Groq from "groq-sdk";
import { analyzeSkillCorrelation, calculateCollegeRankings, parseCSV } from "@/lib/dataProcessor";
import {
  buildBenchmarkComparison,
  getCollegeBenchmarkDataset,
} from "@/lib/collegeBenchmarks";

export const runtime = "nodejs";

const normalizeGraduationYear = (value) => {
  const currentYear = new Date().getFullYear();
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) return currentYear + 2;
  return Math.max(currentYear, parsed);
};

const getSemesterTerm = (semester, graduationYear) => {
  const academicOffset = Math.floor((8 - semester) / 2);

  if (semester % 2 === 1) {
    return `Aug-Dec ${graduationYear - 1 - academicOffset}`;
  }

  return `Jan-May ${graduationYear - academicOffset}`;
};

const buildSemesterPlan = (graduationYear) => {
  const currentYear = new Date().getFullYear();
  const yearsUntilGraduation = Math.max(0, graduationYear - currentYear);
  const semesterCount = Math.max(1, Math.min(8, yearsUntilGraduation * 2));
  const startSemester = Math.max(1, 9 - semesterCount);

  return Array.from({ length: 9 - startSemester }, (_, index) => {
    const semester = startSemester + index;
    const term = getSemesterTerm(semester, graduationYear);

    return {
      id: index + 1,
      semester,
      timeline: `Semester ${semester} (${term})`,
    };
  });
};

const readSkillsTaxonomy = () => {
  const csvPath = path.join(process.cwd(), "public", "technical_skills.csv");
  const fileContent = fs.readFileSync(csvPath, "utf8");
  const lines = fileContent.split(/\r?\n/);
  const skills = [];

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;

    const parts = line.split(",");
    if (parts.length >= 3) {
      skills.push({
        id: parts[0].trim(),
        name: parts[1].trim(),
        category: parts[2].trim(),
      });
    }
  }

  return skills;
};

const buildSkillsSummary = (skillsList) => {
  const seen = new Set();
  const cats = skillsList.filter((s) => { const k = s.category; if (seen.has(k)) return false; seen.add(k); return true; }).map((s) => s.category);
  return cats.join(", ");
};

const readPlacementData = () => {
  const candidatePaths = [
    path.join(process.cwd(), "college_students_skills_vs_placement_reality.csv"),
    path.join(process.cwd(), "public", "college_students_skills_vs_placement_reality.csv"),
  ];
  const csvPath = candidatePaths.find((candidate) => fs.existsSync(candidate));

  if (!csvPath) return [];

  return parseCSV(fs.readFileSync(csvPath, "utf8"));
};

const buildPlacementInsights = ({ placementData, userProfile, collegeRankings, skillAnalysis }) => {
  const branch = userProfile?.branch || null;
  const interestedRole = userProfile?.interestedRole || null;
  const rankings =
    Array.isArray(collegeRankings) && collegeRankings.length > 0
      ? collegeRankings
      : calculateCollegeRankings(placementData, branch, interestedRole);
  const analysis =
    skillAnalysis && Object.keys(skillAnalysis).length > 0
      ? skillAnalysis
      : interestedRole && branch
        ? analyzeSkillCorrelation(placementData, interestedRole, branch)
        : null;

  let placementInsights = "";

  if (rankings.length > 0) {
    const t = rankings[0];
    placementInsights += ` Top college for ${branch || "any"} in ${interestedRole || "any"}: ${t.college} placed ${t.placementRate}%, avg pkg Rs.${t.avgPackage}LPA, avg skills ${t.avgSkillsCount}, avg CGPA ${t.avgCGPA}, internship ${t.internshipRate}%.`;
  }

  if (analysis && Object.keys(analysis).length > 0) {
    placementInsights += ` ${interestedRole}: placementRate ${analysis.placementRate?.toFixed?.(1) ?? analysis.placementRate}%, placed avg ${analysis.avgSkillsPlaced} skills, not-placed avg ${analysis.avgSkillsNotPlaced}, avg pkg Rs.${analysis.avgPackagePlaced}LPA, minCGPA ${analysis.criticalFactors?.minCGPAForPlacement}, internshipBoost ${analysis.criticalFactors?.internshipBenefit ? "Yes" : "No"}.`;
  }

  return placementInsights || " No matching placement data found.";
};

const buildBenchmarkSummary = (benchmarkComparison) => {
  const gaps = benchmarkComparison.priorityGaps.slice(0, 6);
  const strengths = benchmarkComparison.comparison.filter((i) => i.deficit !== null && i.deficit <= 0).slice(0, 4);
  const lines = [];
  if (gaps.length) lines.push("Gaps:", gaps.map((g) => `- ${g.label} deficit ${g.deficit}`).join("\n"));
  if (strengths.length) lines.push("Strengths:", strengths.map((s) => `- ${s.label} at/above`).join("\n"));
  return lines.join("\n");
};

const sanitizeRoadmap = ({ roadmap, semesterPlan, skillsList, userSkills }) => {
  const taxonomyByName = new Map(skillsList.map((skill) => [skill.name.toLowerCase(), skill.name]));
  const existingSkills = new Set((userSkills || []).map((skill) => String(skill).toLowerCase()));
  const steps = Array.isArray(roadmap.steps) ? roadmap.steps : [];

  return {
    ...roadmap,
    steps: semesterPlan.map((semester, index) => {
      const step = steps[index] || {};
      const uniqueSkills = [];

      (Array.isArray(step.skills) ? step.skills : []).forEach((skill) => {
        const canonical = taxonomyByName.get(String(skill).toLowerCase());
        if (!canonical || existingSkills.has(canonical.toLowerCase()) || uniqueSkills.includes(canonical)) return;
        uniqueSkills.push(canonical);
      });

      return {
        ...step,
        id: index + 1,
        semester: semester.semester,
        timeline: semester.timeline,
        title: step.title || `Semester ${semester.semester} Execution Plan`,
        skills: uniqueSkills,
      };
    }),
  };
};

export async function POST(request) {
  try {
    const {
      collegeName,
      grades = {},
      userProfile,
      userSkills = [],
      collegeRankings,
      skillAnalysis,
    } = await request.json();

    if (!collegeName) {
      return NextResponse.json({ error: "Missing collegeName" }, { status: 400 });
    }

    const profile = userProfile || {};
    const graduationYear = normalizeGraduationYear(profile.graduationYear);
    const semesterPlan = buildSemesterPlan(graduationYear);
    const benchmarkDataset = await getCollegeBenchmarkDataset();
    const benchmarkComparison = buildBenchmarkComparison(benchmarkDataset, collegeName, grades);
    const skillsList = readSkillsTaxonomy();
    const skillsSummary = buildSkillsSummary(skillsList);
    const placementInsights = buildPlacementInsights({
      placementData: readPlacementData(),
      userProfile: profile,
      collegeRankings,
      skillAnalysis,
    });

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json(
        { error: "Groq API key not configured. Add GROQ_API_KEY to your .env file." },
        { status: 500 }
      );
    }

    const benchmarkSummary = buildBenchmarkSummary(benchmarkComparison);

    const prompt = `
Roadmap for ${collegeName}, ${profile.branch || "Engineering"}, target ${profile.interestedRole || "Software"}, grad ${graduationYear}.
Skills acquired: ${userSkills.length > 0 ? userSkills.join(", ") : "none"}
${placementInsights}
Benchmarks: ${benchmarkSummary}
Skill categories: ${skillsSummary}

Return JSON with ${semesterPlan.length} steps (${semesterPlan.map((s) => s.timeline).join(", ")}):
{ "strategyType": "", "deficitSummary": "", "placementStrategy": "", "steps": [{ "id": 1, "semester": ..., "title": "", "category": "", "description": "", "skills": [], "timeline": "", "deliverables": [], "placementRelevance": "" }] }
`;

    const client = new Groq({ apiKey: groqKey });
    const chatCompletion = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a career strategist AI. Respond with valid JSON only. No markdown, no code fences.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.25,
      max_tokens: 4096,
    });

    const text = chatCompletion.choices?.[0]?.message?.content;
    if (!text) throw new Error("Empty AI response from Groq");

    const cleaned = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    const roadmap = JSON.parse(cleaned);

    return NextResponse.json(
      sanitizeRoadmap({
        roadmap,
        semesterPlan,
        skillsList,
        userSkills,
      })
    );
  } catch (error) {
    console.error("Roadmap API Error:", error.message);

    const status = error.status || 500;
    let message = error.message;

    if (error.error?.error?.message) {
      message = error.error.error.message;
    } else if (error.message?.startsWith?.("429")) {
      message = "Groq API rate limit reached. Please wait and try again later.";
    } else if (error.message?.startsWith?.("400")) {
      message = "Groq API request error. Please try again.";
    }

    const userMessage = status === 429
      ? "AI rate limit reached. The free tier is exhausted for today. Try again later or upgrade your Groq API plan."
      : message;

    return NextResponse.json({ error: userMessage }, { status });
  }
}

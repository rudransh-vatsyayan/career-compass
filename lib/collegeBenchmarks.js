import fs from "fs";
import path from "path";
import readWorkbook from "read-excel-file/node";

const DATASET_FILE = "SJCE_Benchmark_Graded_Dataset.xlsx";
const DEFAULT_SHEET = "Scores";
const COLLEGE_NAME_KEYS = ["College_Name", "College_Name_Official"];
const STOPWORDS = new Set([
  "the",
  "of",
  "and",
  "college",
  "engineering",
  "institute",
  "institution",
  "technology",
  "university",
  "science",
  "mysore",
]);

let cachedDataset = null;
let cachedMtimeMs = null;

const roundScore = (value) => Math.round(value * 10) / 10;

export const formatBenchmarkLabel = (key) => {
  const withoutScore = key.replace(/_Score$/i, "");
  const withCategory = withoutScore.replace(/^Category_\d+_(.*)/i, "$1");

  return withCategory
    .replace(/_/g, " ")
    .replace(/\bLpa\b/g, "LPA")
    .replace(/\bCse\b/g, "CSE")
    .replace(/\bUg\b/g, "UG")
    .replace(/\bPhd\b/g, "PhD")
    .replace(/\bNaac\b/g, "NAAC")
    .replace(/\bNba\b/g, "NBA")
    .replace(/\bNirf\b/g, "NIRF")
    .replace(/\bRoi\b/g, "ROI");
};

const toNumberOrNull = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeCollegeName = (name = "") =>
  String(name)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const collegeTokens = (name) =>
  normalizeCollegeName(name)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));

const overlapScore = (sourceName, candidateName) => {
  const source = normalizeCollegeName(sourceName);
  const candidate = normalizeCollegeName(candidateName);
  if (!source || !candidate) return 0;
  if (source === candidate) return 100;
  if (source.includes(candidate) || candidate.includes(source)) return 80;

  const sourceTokens = new Set(collegeTokens(sourceName));
  const candidateTokens = collegeTokens(candidateName);
  if (sourceTokens.size === 0 || candidateTokens.length === 0) return 0;

  const shared = candidateTokens.filter((token) => sourceTokens.has(token));
  const initials = candidateTokens
    .filter((token) => !STOPWORDS.has(token))
    .map((token) => token[0])
    .join("");

  let score = shared.length * 12;
  if (initials && sourceTokens.has(initials)) score += 24;
  if (sourceTokens.has(candidate.replace(/\s+/g, ""))) score += 20;

  return score;
};

const findCollegeNameKey = (rows) => {
  const firstRow = rows[0] || {};
  return COLLEGE_NAME_KEYS.find((key) => Object.hasOwn(firstRow, key)) || COLLEGE_NAME_KEYS[0];
};

export async function getCollegeBenchmarkDataset() {
  const datasetPath = path.join(process.cwd(), DATASET_FILE);
  const stat = fs.statSync(datasetPath);

  if (cachedDataset && cachedMtimeMs === stat.mtimeMs) {
    return cachedDataset;
  }

  const workbookSheets = await readWorkbook(datasetPath);
  const selectedSheet =
    workbookSheets.find((sheet) => sheet.sheet === DEFAULT_SHEET) || workbookSheets[0];
  const sheetName = selectedSheet.sheet;
  const [headerRow = [], ...dataRows] = selectedSheet.data;
  const headers = headerRow.map((header) => String(header || "").trim());
  const rows = dataRows
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null]))
    )
    .filter((row) => Object.values(row).some((value) => value !== null && value !== ""));
  const collegeNameKey = findCollegeNameKey(rows);

  const scoreColumns = headers.filter(
    (header) =>
      header !== collegeNameKey &&
      /_Score$/i.test(header) &&
      rows.some((row) => toNumberOrNull(row[header]) !== null)
  );

  const categories = scoreColumns.map((key) => ({
    key,
    label: formatBenchmarkLabel(key),
  }));

  const colleges = rows
    .map((row) => {
      const grades = {};
      const numericScores = [];

      scoreColumns.forEach((column) => {
        const score = toNumberOrNull(row[column]);
        if (score !== null) {
          const rounded = roundScore(score);
          grades[column] = rounded;
          numericScores.push(rounded);
        }
      });

      const totalScore = numericScores.reduce((sum, score) => sum + score, 0);
      const averageScore = numericScores.length > 0 ? totalScore / numericScores.length : 0;

      return {
        name: String(row[collegeNameKey] || "").trim(),
        grades,
        totalScore: roundScore(totalScore),
        averageScore: roundScore(averageScore),
      };
    })
    .filter((college) => college.name);

  const categoryBenchmarks = {};
  scoreColumns.forEach((column) => {
    let maxScore = -Infinity;
    let benchmarkColleges = [];

    colleges.forEach((college) => {
      const score = toNumberOrNull(college.grades[column]);
      if (score === null) return;

      if (score > maxScore) {
        maxScore = score;
        benchmarkColleges = [college.name];
      } else if (score === maxScore) {
        benchmarkColleges.push(college.name);
      }
    });

    categoryBenchmarks[column] = {
      score: roundScore(maxScore),
      college: benchmarkColleges.join(", "),
      colleges: benchmarkColleges,
    };
  });

  cachedDataset = {
    source: DATASET_FILE,
    sheetName,
    categories,
    colleges,
    categoryBenchmarks,
  };
  cachedMtimeMs = stat.mtimeMs;

  return cachedDataset;
}

export function resolveBenchmarkCollege(dataset, requestedCollegeName) {
  if (!requestedCollegeName || !dataset?.colleges?.length) return null;

  let bestCollege = null;
  let bestScore = 0;

  dataset.colleges.forEach((college) => {
    const score = overlapScore(college.name, requestedCollegeName);
    if (score > bestScore) {
      bestScore = score;
      bestCollege = college;
    }
  });

  return bestScore >= 12 ? bestCollege : null;
}

export function buildBenchmarkComparison(dataset, requestedCollegeName, fallbackGrades = {}) {
  const matchedCollege = resolveBenchmarkCollege(dataset, requestedCollegeName);
  const selectedGrades = matchedCollege?.grades || fallbackGrades || {};

  const comparison = dataset.categories.map((category) => {
    const selectedScore = toNumberOrNull(selectedGrades[category.key]);
    const benchmark = dataset.categoryBenchmarks[category.key];
    const deficit = selectedScore === null ? null : roundScore(benchmark.score - selectedScore);

    return {
      key: category.key,
      label: category.label,
      selectedScore,
      benchmarkScore: benchmark.score,
      benchmarkCollege: benchmark.college,
      deficit,
    };
  });

  return {
    requestedCollegeName,
    matchedCollegeName: matchedCollege?.name || null,
    comparison,
    priorityGaps: comparison
      .filter((item) => item.deficit !== null && item.deficit > 0)
      .sort((a, b) => b.deficit - a.deficit),
  };
}

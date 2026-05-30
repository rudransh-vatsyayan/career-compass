/**
 * Data processing utilities for analyzing placement and skills data
 * Processes college_students_skills_vs_placement_reality.csv and students.csv
 */

/**
 * Convert a value to a number or null if it's not a valid number
 * @param {*} value - Value to convert
 * @returns {number|null} The numeric value or null if invalid
 */
export const toNumberOrNull = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Calculate college rankings based on placement success metrics
 * @param {Array} placementData - Parsed college_students_skills_vs_placement_reality.csv
 * @param {string} branch - Filter by branch (optional)
 * @param {string} jobRole - Filter by job role (optional)
 * @returns {Array} Sorted colleges with metrics
 */
export const calculateCollegeRankings = (placementData, branch = null, jobRole = null) => {
  if (!placementData || placementData.length === 0) return [];

  // Filter by branch and job role if specified
  let filteredData = placementData;
  if (branch) {
    filteredData = filteredData.filter(row => row.branch?.toLowerCase() === branch.toLowerCase());
  }
  if (jobRole) {
    filteredData = filteredData.filter(row => row.job_role?.toLowerCase() === jobRole.toLowerCase());
  }

  // Group by college and calculate metrics
  const collegeMetrics = {};
  
  filteredData.forEach(row => {
    const college = row.college_tier || "Unknown";
    if (!collegeMetrics[college]) {
      collegeMetrics[college] = {
        college,
        totalStudents: 0,
        placedStudents: 0,
        avgPackage: 0,
        packageSum: 0,
        avgSkillsCount: 0,
        skillsSum: 0,
        avgCGPA: 0,
        cgpaSum: 0,
        internshipRate: 0,
        internshipsCount: 0,
        projectsAvg: 0,
        projectsSum: 0
      };
    }

    const metrics = collegeMetrics[college];
    metrics.totalStudents++;
    
    if (row.placement_status?.toLowerCase() === "placed") {
      metrics.placedStudents++;
    }
    
    const pkg = parseFloat(row.package_lpa) || 0;
    metrics.packageSum += pkg;
    
    const skills = parseInt(row.skills_count) || 0;
    metrics.skillsSum += skills;
    
    const cgpa = parseFloat(row.cgpa) || 0;
    metrics.cgpaSum += cgpa;
    
    if (row.internships === "yes" || row.internships === "1") {
      metrics.internshipsCount++;
    }
    
    const projects = parseInt(row.projects) || 0;
    metrics.projectsSum += projects;
  });

  // Calculate averages and placement rates
  const rankings = Object.values(collegeMetrics).map(metrics => ({
    ...metrics,
    placementRate: metrics.totalStudents > 0 ? (metrics.placedStudents / metrics.totalStudents * 100).toFixed(1) : 0,
    avgPackage: metrics.totalStudents > 0 ? (metrics.packageSum / metrics.totalStudents).toFixed(2) : 0,
    avgSkillsCount: metrics.totalStudents > 0 ? (metrics.skillsSum / metrics.totalStudents).toFixed(1) : 0,
    avgCGPA: metrics.totalStudents > 0 ? (metrics.cgpaSum / metrics.totalStudents).toFixed(2) : 0,
    internshipRate: metrics.totalStudents > 0 ? (metrics.internshipsCount / metrics.totalStudents * 100).toFixed(1) : 0,
    avgProjects: metrics.totalStudents > 0 ? (metrics.projectsSum / metrics.totalStudents).toFixed(1) : 0
  }));

  // Sort by placement rate (primary), then average package (secondary)
  return rankings.sort((a, b) => {
    const rateA = parseFloat(a.placementRate);
    const rateB = parseFloat(b.placementRate);
    if (rateA !== rateB) return rateB - rateA;
    return parseFloat(b.avgPackage) - parseFloat(a.avgPackage);
  });
};

/**
 * Analyze skill correlation with job placement
 * @param {Array} placementData - Parsed placement data
 * @param {string} jobRole - Target job role
 * @param {string} branch - Optional branch filter
 * @returns {Object} Skills analysis with correlation scores
 */
export const analyzeSkillCorrelation = (placementData, jobRole, branch = null) => {
  if (!placementData || placementData.length === 0) return {};

  let targetRoleData = placementData.filter(row => 
    row.job_role?.toLowerCase() === jobRole.toLowerCase()
  );

  if (branch) {
    targetRoleData = targetRoleData.filter(row => 
      row.branch?.toLowerCase() === branch.toLowerCase()
    );
  }

  if (targetRoleData.length === 0) return {};

  // Analyze placed vs not placed students
  const placedStudents = targetRoleData.filter(row => 
    row.placement_status?.toLowerCase() === "placed"
  );

  const notPlacedStudents = targetRoleData.filter(row => 
    row.placement_status?.toLowerCase() !== "placed"
  );

  return {
    jobRole,
    placementRate: placedStudents.length / targetRoleData.length * 100,
    placedCount: placedStudents.length,
    totalCount: targetRoleData.length,
    avgSkillsPlaced: placedStudents.length > 0 
      ? (placedStudents.reduce((sum, s) => sum + (parseInt(s.skills_count) || 0), 0) / placedStudents.length).toFixed(1)
      : 0,
    avgSkillsNotPlaced: notPlacedStudents.length > 0 
      ? (notPlacedStudents.reduce((sum, s) => sum + (parseInt(s.skills_count) || 0), 0) / notPlacedStudents.length).toFixed(1)
      : 0,
    avgPackagePlaced: placedStudents.length > 0 
      ? (placedStudents.reduce((sum, s) => sum + (parseFloat(s.package_lpa) || 0), 0) / placedStudents.length).toFixed(2)
      : 0,
    avgCGPAPlaced: placedStudents.length > 0 
      ? (placedStudents.reduce((sum, s) => sum + (parseFloat(s.cgpa) || 0), 0) / placedStudents.length).toFixed(2)
      : 0,
    criticalFactors: {
      minSkillsForPlacement: placedStudents.length > 0 
        ? Math.min(...placedStudents.map(s => parseInt(s.skills_count) || 0))
        : 0,
      minCGPAForPlacement: placedStudents.length > 0 
        ? Math.min(...placedStudents.map(s => parseFloat(s.cgpa) || 0)).toFixed(2)
        : 0,
      internshipBenefit: placedStudents.filter(s => s.internships === "yes" || s.internships === "1").length > 0
    }
  };
};

/**
 * Parse CSV text into array of objects
 * @param {string} csvText - Raw CSV text
 * @returns {Array} Array of parsed objects
 */
export const parseCSV = (csvText) => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim());
    if (values.length >= headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }
  }

  return data;
};

/**
 * Calculate placement gap analysis
 * @param {Array} placementData - Parsed placement data
 * @param {string} selectedCollege - User's selected college
 * @param {string} branch - User's branch
 * @param {string} jobRole - Target job role
 * @returns {Object} Gap analysis metrics
 */
export const calculatePlacementGaps = (placementData, selectedCollege, branch, jobRole) => {
  if (!placementData || !selectedCollege) return null;

  // Get top college metrics
  const topRankings = calculateCollegeRankings(placementData, branch, jobRole);
  if (topRankings.length === 0) return null;

  const topMetrics = topRankings[0];

  // Get selected college metrics
  const selectedMetrics = placementData.find(row => 
    row.college_tier?.toLowerCase() === selectedCollege.toLowerCase() &&
    (branch ? row.branch?.toLowerCase() === branch.toLowerCase() : true) &&
    (jobRole ? row.job_role?.toLowerCase() === jobRole.toLowerCase() : true)
  );

  if (!selectedMetrics) return null;

  return {
    topCollege: topMetrics.college,
    selectedCollege: selectedCollege,
    placementRateGap: (parseFloat(topMetrics.placementRate) - parseFloat(selectedMetrics.placement_rate || 0)).toFixed(1),
    packageGap: (parseFloat(topMetrics.avgPackage) - parseFloat(selectedMetrics.package_lpa || 0)).toFixed(2),
    skillsGap: (parseFloat(topMetrics.avgSkillsCount) - (parseInt(selectedMetrics.skills_count) || 0)).toFixed(1),
    recommendations: generateGapRecommendations(selectedMetrics, topMetrics)
  };
};

/**
 * Generate recommendations based on gaps
 */
const generateGapRecommendations = (selected, top) => {
  const recommendations = [];

  if (parseInt(selected.skills_count || 0) < parseInt(top.avgSkillsCount)) {
    recommendations.push(`Develop additional ${Math.ceil(parseFloat(top.avgSkillsCount) - parseInt(selected.skills_count))} technical skills to match top performers`);
  }

  if (selected.internships !== "yes" && selected.internships !== "1") {
    recommendations.push("Complete at least one internship in your target domain");
  }

  if (parseInt(selected.projects || 0) < parseInt(top.avgProjects)) {
    recommendations.push(`Build ${Math.ceil(parseFloat(top.avgProjects) - parseInt(selected.projects))} more portfolio projects`);
  }

  if (parseFloat(selected.cgpa || 0) < parseFloat(top.avgCGPA)) {
    recommendations.push(`Improve CGPA by ${(parseFloat(top.avgCGPA) - parseFloat(selected.cgpa)).toFixed(2)} points`);
  }

  return recommendations;
};

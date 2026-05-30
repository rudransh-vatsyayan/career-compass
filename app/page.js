"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, BarChart3, BriefcaseBusiness, Building2,
  CalendarDays, Database, GraduationCap, Search, Target, TrendingUp,
  Award, ChevronDown, ChevronUp, Gauge, PieChart
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { parseCSV, calculateCollegeRankings, analyzeSkillCorrelation } from "@/lib/dataProcessor";

const SESSION_KEYS = [
  "roadmapSelection", "categoryBenchmarks", "userProfile",
  "collegeRankings", "skillAnalysis", "userSkills",
];

const GROUP_NAMES = {
  "1": "Placement", "2": "Accreditation", "5": "Courses",
  "6": "Faculty", "7": "Infrastructure", "8": "Internship",
  "9": "Student Life", "12": "ROI"
};

const RADAR_COLORS = ["#0f766e", "#2563eb", "#b45309", "#dc2626", "#7c3aed"];

const getGroupName = (key) => {
  const m = key.match(/^Category_(\d+)_/);
  return m ? (GROUP_NAMES[m[1]] || `Category ${m[1]}`) : "General";
};

export default function Dashboard() {
  const router = useRouter();
  const [colleges, setColleges] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCollegeName, setSelectedCollegeName] = useState("");
  const [categoryBenchmarks, setCategoryBenchmarks] = useState({});
  const [benchmarkSource, setBenchmarkSource] = useState("SJCE_Benchmark_Graded_Dataset.xlsx");
  const [loading, setLoading] = useState(true);
  const [placementData, setPlacementData] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [userProfile, setUserProfile] = useState({
    branch: "", interestedRole: "", graduationYear: "", selectedSkills: [],
  });

  const [jobTitles, setJobTitles] = useState([]);
  const [jobSearch, setJobSearch] = useState("");
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const [branches, setBranches] = useState([]);
  const [branchSearch, setBranchSearch] = useState("");
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  const currentYear = new Date().getFullYear();
  const graduationYears = Array.from({ length: 6 }, (_, i) => currentYear + i);

  const selectedCollege = useMemo(
    () => colleges.find((c) => c.name === selectedCollegeName) || null,
    [colleges, selectedCollegeName]
  );

  const processColleges = useCallback((parsedColleges, cats, providedBenchmarks = null) => {
    setColleges(parsedColleges);
    setCategories(cats);
    const benchmarks = {};
    cats.forEach((cat) => {
      let maxScore = -1, topCollege = "Dataset benchmark";
      parsedColleges.forEach((col) => {
        const score = col.grades[cat.key] || 0;
        if (score > maxScore) { maxScore = score; topCollege = col.name; }
      });
      benchmarks[cat.key] = { score: maxScore, college: topCollege };
    });
    setCategoryBenchmarks(providedBenchmarks || benchmarks);
    // Initialize all groups as expanded
    const groups = {};
    cats.forEach((cat) => { const g = getGroupName(cat.key); groups[g] = true; });
    setExpandedGroups(groups);
  }, []);

  const parseCSVText = useCallback((text) => {
    try {
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) { setLoading(false); return; }
      const header = lines[0].split(",").map((v) => v.trim());
      const newCats = header.slice(1).map((key) => ({ key, label: key.replace(/_/g, " ") }));
      const parsed = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(",");
        if (parts.length >= header.length) {
          const name = parts[0].trim();
          const grades = {};
          let total = 0;
          newCats.forEach((cat) => {
            const colIdx = header.indexOf(cat.key);
            const val = parseFloat(parts[colIdx]);
            const score = Number.isNaN(val) ? 5 : Math.max(0, Math.min(10, val));
            grades[cat.key] = score;
            total += score;
          });
          parsed.push({ name, grades, totalScore: total });
        }
      }
      if (parsed.length > 0) processColleges(parsed, newCats);
    } catch (e) {
      console.error("Fallback CSV parse failed:", e);
    } finally {
      setLoading(false);
    }
  }, [processColleges]);

  useEffect(() => {
    SESSION_KEYS.forEach((k) => localStorage.removeItem(k));
    fetch("/api/placement-data").then((r) => r.ok && r.text().then((t) => setPlacementData(parseCSV(t))));
  }, []);

  useEffect(() => {
    fetch("/api/college-benchmarks")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((data) => {
        if (!data.colleges?.length || !data.categories?.length) throw new Error("Empty");
        processColleges(data.colleges, data.categories, data.categoryBenchmarks);
        setBenchmarkSource(data.source || "SJCE_Benchmark_Graded_Dataset.xlsx");
        setLoading(false);
      })
      .catch(() => {
        fetch("/sjce_data.csv")
          .then((r) => r.text())
          .then((t) => { setBenchmarkSource("sjce_data.csv"); parseCSVText(t); })
          .catch(() => setLoading(false));
      });

    fetch("/job_titles.json").then((r) => r.json().then(setJobTitles)).catch(() => {});
    fetch("/branches.json").then((r) => r.json().then(setBranches)).catch(() => {});

    const handler = (e) => {
      if (!e.target.closest(".search-container")) {
        setShowJobDropdown(false);
        setShowBranchDropdown(false);
      }
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [parseCSVText, processColleges]);

  const collegeRankings = useMemo(() => {
    if (placementData.length > 0 && userProfile.branch)
      return calculateCollegeRankings(placementData, userProfile.branch, userProfile.interestedRole || null);
    return [];
  }, [placementData, userProfile.branch, userProfile.interestedRole]);

  const skillAnalysis = useMemo(() => {
    if (placementData.length > 0 && userProfile.interestedRole && userProfile.branch)
      return analyzeSkillCorrelation(placementData, userProfile.interestedRole, userProfile.branch);
    return null;
  }, [placementData, userProfile.interestedRole, userProfile.branch]);

  const benchmarkRows = useMemo(() => {
    if (!selectedCollege) return [];
    return categories
      .map((cat) => {
        const score = selectedCollege.grades[cat.key] ?? 0;
        const bench = categoryBenchmarks[cat.key] || { score: 10, college: "Dataset benchmark" };
        return { ...cat, group: getGroupName(cat.key), score, benchmarkScore: bench.score, benchmarkCollege: bench.college, deficit: Math.round((bench.score - score) * 10) / 10 };
      })
      .sort((a, b) => a.group.localeCompare(b.group) || b.deficit - a.deficit);
  }, [categories, categoryBenchmarks, selectedCollege]);

  const groupedRows = useMemo(() => {
    const groups = {};
    benchmarkRows.forEach((row) => {
      if (!groups[row.group]) groups[row.group] = [];
      groups[row.group].push(row);
    });
    return groups;
  }, [benchmarkRows]);

  const averageScore = selectedCollege?.averageScore || 0;
  const benchmarkAverage = useMemo(() => {
    const vals = Object.values(categoryBenchmarks).map((b) => b.score || 0);
    return vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : 0;
  }, [categoryBenchmarks]);
  const readinessScore = benchmarkAverage > 0 ? Math.min(100, Math.round((averageScore / benchmarkAverage) * 100)) : 0;

  const radarData = useMemo(() => {
    if (!selectedCollege) return [];
    return categories.map((cat) => {
      const group = getGroupName(cat.key);
      return { category: cat.label, [selectedCollege.name]: selectedCollege.grades[cat.key] ?? 0, [group]: (categoryBenchmarks[cat.key]?.score || 0) };
    });
  }, [categories, selectedCollege, categoryBenchmarks]);

  const barData = useMemo(() => {
    if (!selectedCollege) return [];
    const groups = {};
    benchmarkRows.forEach((row) => {
      if (!groups[row.group]) groups[row.group] = { group: row.group, collegeScore: 0, benchmarkScore: 0, count: 0 };
      groups[row.group].collegeScore += row.score;
      groups[row.group].benchmarkScore += row.benchmarkScore;
      groups[row.group].count++;
    });
    return Object.values(groups).map((g) => ({
      group: g.group,
      "My Score": Math.round((g.collegeScore / g.count) * 10) / 10,
      "Benchmark": Math.round((g.benchmarkScore / g.count) * 10) / 10,
    }));
  }, [benchmarkRows, selectedCollege]);

  const canContinue = !!selectedCollege && !!userProfile.branch.trim() && !!userProfile.interestedRole.trim() && !!userProfile.graduationYear;

  const updateProfile = (name, value) => setUserProfile((prev) => ({ ...prev, [name]: value }));

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!canContinue) return;
    localStorage.setItem("roadmapSelection", JSON.stringify(selectedCollege));
    localStorage.setItem("categoryBenchmarks", JSON.stringify(categoryBenchmarks));
    localStorage.setItem("userProfile", JSON.stringify(userProfile));
    localStorage.setItem("collegeRankings", JSON.stringify(collegeRankings));
    localStorage.setItem("skillAnalysis", JSON.stringify(skillAnalysis));
    localStorage.removeItem("userSkills");
    router.push("/skills");
  };

  const toggleGroup = (name) => setExpandedGroups((prev) => ({ ...prev, [name]: !prev[name] }));

  if (loading) {
    return (
      <div className="workspace-page centered-state">
        <div>
          <div className="spinner" />
          <h2>Loading benchmark data</h2>
          <p>Reading college scores from the workbook.</p>
        </div>
      </div>
    );
  }

  if (!colleges.length) {
    return (
      <div className="workspace-page centered-state">
        <div className="empty-state-inner">
          <Database size={40} />
          <h2>No data available</h2>
          <p>Unable to load the benchmark dataset. Please check the data source.</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ marginTop: 18 }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <span className="eyebrow">
            <Target size={14} />
            Benchmark setup
          </span>
          <h1>Career Strategy Dashboard</h1>
          <p>Select your institution and profile to generate a data-driven roadmap.</p>
        </div>
        <span className="status-pill">
          <Database size={14} />
          {benchmarkSource}
        </span>
      </div>

      {/* Stats Overview */}
      {selectedCollege && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "rgba(15,118,110,0.1)" }}>
              <Building2 size={17} style={{ color: "var(--accent-primary)" }} />
            </div>
            <span className="stat-label">Institutions</span>
            <p className="stat-value">{colleges.length}</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "rgba(37,99,235,0.1)" }}>
              <BarChart3 size={17} style={{ color: "var(--accent-blue)" }} />
            </div>
            <span className="stat-label">Benchmark Metrics</span>
            <p className="stat-value">{categories.length}</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: readinessScore >= 70 ? "rgba(15,138,85,0.1)" : readinessScore >= 40 ? "rgba(180,83,9,0.1)" : "rgba(220,38,38,0.1)" }}>
              <Gauge size={17} style={{ color: readinessScore >= 70 ? "var(--accent-success)" : readinessScore >= 40 ? "var(--accent-warning)" : "var(--accent-error)" }} />
            </div>
            <span className="stat-label">Readiness Score</span>
            <p className="stat-value" style={{ color: readinessScore >= 70 ? "var(--accent-success)" : readinessScore >= 40 ? "var(--accent-warning)" : "var(--accent-error)" }}>{readinessScore}%</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "rgba(15,118,110,0.1)" }}>
              <Award size={17} style={{ color: "var(--accent-primary)" }} />
            </div>
            <span className="stat-label">Avg Benchmark</span>
            <p className="stat-value">{benchmarkAverage.toFixed(1)}</p>
          </div>
        </div>
      )}

      <div className="dash-grid">
        {/* Left Column - Form */}
        <div className="dash-sidebar">
          {/* Profile Card */}
          <div className="card form-section">
            <div className="card-header">
              <GraduationCap size={18} />
              <h2>Student Profile</h2>
            </div>
            <form onSubmit={handleGenerate}>
              <div className="form-group">
                <label className="form-label">Institution</label>
                <div className="input-wrap">
                  <Building2 size={16} />
                  <select
                    value={selectedCollegeName}
                    onChange={(e) => setSelectedCollegeName(e.target.value)}
                  >
                    <option value="">Select institution</option>
                    {colleges.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Branch</label>
                <div className="search-container" style={{ position: "relative" }}>
                  <div className="input-wrap">
                    <Search size={16} />
                    <input
                      type="text" placeholder="Search branch"
                      value={branchSearch}
                      onChange={(e) => { setBranchSearch(e.target.value); setShowBranchDropdown(true); updateProfile("branch", e.target.value); }}
                      onFocus={() => setShowBranchDropdown(true)}
                    />
                  </div>
                  {showBranchDropdown && branchSearch.length > 0 && branches.filter((b) => b.toLowerCase().includes(branchSearch.toLowerCase())).length > 0 && (
                    <div className="dropdown">
                      {branches.filter((b) => b.toLowerCase().includes(branchSearch.toLowerCase())).slice(0, 6).map((b) => (
                        <div key={b} className="dropdown-item" onClick={() => { setBranchSearch(b); setShowBranchDropdown(false); updateProfile("branch", b); }}>{b}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Target Role</label>
                <div className="search-container" style={{ position: "relative" }}>
                  <div className="input-wrap">
                    <BriefcaseBusiness size={16} />
                    <input
                      type="text" placeholder="Search role"
                      value={jobSearch}
                      onChange={(e) => { setJobSearch(e.target.value); setShowJobDropdown(true); updateProfile("interestedRole", e.target.value); }}
                      onFocus={() => setShowJobDropdown(true)}
                    />
                  </div>
                  {showJobDropdown && jobSearch.length > 0 && jobTitles.filter((j) => j.toLowerCase().includes(jobSearch.toLowerCase())).length > 0 && (
                    <div className="dropdown">
                      {jobTitles.filter((j) => j.toLowerCase().includes(jobSearch.toLowerCase())).slice(0, 6).map((j) => (
                        <div key={j} className="dropdown-item" onClick={() => { setJobSearch(j); setShowJobDropdown(false); updateProfile("interestedRole", j); }}>{j}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Graduation Year</label>
                <div className="input-wrap">
                  <CalendarDays size={16} />
                  <select
                    value={userProfile.graduationYear}
                    onChange={(e) => updateProfile("graduationYear", e.target.value)}
                  >
                    <option value="">Select year</option>
                    {graduationYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full" disabled={!canContinue}>
                Continue to Roadmap
                <ArrowRight size={16} />
              </button>
            </form>
          </div>

          {/* Readiness Gauge */}
          {selectedCollege && (
            <div className="card form-section">
              <div className="card-header">
                <PieChart size={18} />
                <h2>Readiness Overview</h2>
              </div>
              <div className="gauge-wrap">
                <div className="gauge-ring">
                  <svg viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="42" fill="none"
                      stroke={readinessScore >= 70 ? "var(--accent-success)" : readinessScore >= 40 ? "var(--accent-warning)" : "var(--accent-error)"}
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      strokeDashoffset={`${2 * Math.PI * 42 * (1 - readinessScore / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 1s ease" }}
                    />
                  </svg>
                  <div className="gauge-center">
                    <div>
                      <p style={{ color: readinessScore >= 70 ? "var(--accent-success)" : readinessScore >= 40 ? "var(--accent-warning)" : "var(--accent-error)" }}>{readinessScore}%</p>
                      <span>Readiness</span>
                    </div>
                  </div>
                </div>
              </div>
              {skillAnalysis && (
                <div className="gauge-metrics">
                  <div className="gauge-metric">
                    <span>Placement Rate</span>
                    <span>{skillAnalysis.placementRate?.toFixed?.(1) ?? skillAnalysis.placementRate}%</span>
                  </div>
                  <div className="gauge-metric">
                    <span>Avg Skills (Placed)</span>
                    <span>{skillAnalysis.avgSkillsPlaced}</span>
                  </div>
                  <div className="gauge-metric">
                    <span>Avg Package</span>
                    <span>₹{skillAnalysis.avgPackagePlaced} LPA</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Charts & Data */}
        <div className="dash-main">
          {!selectedCollege ? (
            <div className="card" style={{ padding: "60px 40px", textAlign: "center" }}>
              <Building2 size={44} style={{ color: "var(--border)", marginBottom: 16 }} />
              <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 6 }}>Select an Institution</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: 440, margin: "0 auto" }}>
                Choose a college from the dropdown to view benchmark comparisons, category scores, and placement insights.
              </p>
            </div>
          ) : (
            <>
              {/* Benchmark Comparison Chart */}
              <div className="card chart-card">
                <div className="card-header">
                  <BarChart3 size={18} />
                  <h2>Category Benchmarks</h2>
                  <span>Average per group</span>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
                    <XAxis dataKey="group" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", boxShadow: "var(--shadow)" }} />
                    <Bar dataKey="My Score" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="Benchmark" fill="var(--border-strong)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Radar Chart */}
              <div className="card chart-card">
                <div className="card-header">
                  <Target size={18} />
                  <h2>Score Distribution</h2>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData.slice(0, 12)}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} />
                    <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 10, fill: "var(--text-secondary)" }} />
                    <Radar name={selectedCollege.name} dataKey={selectedCollege.name} stroke="var(--accent-primary)" fill="var(--accent-primary)" fillOpacity={0.12} strokeWidth={2} />
                    <Radar name="Benchmark" dataKey="benchmark" stroke="var(--border-strong)" fill="var(--border-strong)" fillOpacity={0.08} strokeWidth={2} strokeDasharray="4 4" />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Grouped Benchmark Rows */}
              <div className="card benchmark-groups">
                {Object.keys(groupedRows).map((groupName) => {
                  const items = groupedRows[groupName];
                  const isExpanded = expandedGroups[groupName] !== false;
                  const avgDeficit = items.reduce((s, i) => s + i.deficit, 0) / items.length;
                  return (
                    <div key={groupName}>
                      <button onClick={() => toggleGroup(groupName)} className="group-toggle">
                        <div>
                          <h3>{groupName}</h3>
                          <span className="group-meta">{items.length} metrics | Avg gap: {avgDeficit.toFixed(1)}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="group-dots">
                            {items.slice(0, 4).map((item) => (
                              <div key={item.key} className={`group-dot ${item.deficit > 0 ? item.deficit >= 2 ? "red" : "amber" : "green"}`} />
                            ))}
                          </div>
                          {isExpanded ? <ChevronUp size={15} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={15} style={{ color: "var(--text-muted)" }} />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="group-content">
                          {items.map((item) => (
                            <div key={item.key} className="group-item">
                              <div className="item-label">
                                <p>{item.label}</p>
                                <span>Benchmark: {item.benchmarkScore}/10 by {item.benchmarkCollege}</span>
                              </div>
                              <div className="item-bar">
                                <div className="item-bar-fill"
                                  style={{
                                    width: `${Math.min(100, (item.score / (item.benchmarkScore || 1)) * 100)}%`,
                                    background: item.deficit > 0 ? item.deficit >= 2 ? "var(--accent-error)" : "var(--accent-warning)" : "var(--accent-success)"
                                  }}
                                />
                              </div>
                              <span className={`item-deficit ${item.deficit > 0 ? "gap" : "met"}`}>
                                {item.deficit > 0 ? item.deficit : "Met"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Placement Rankings */}
              {collegeRankings.length > 0 && (
                <div className="card rank-list">
                  <div className="card-header">
                    <TrendingUp size={18} />
                    <h2>Placement Rankings</h2>
                    <span>for {userProfile.branch} in {userProfile.interestedRole}</span>
                  </div>
                  {collegeRankings.slice(0, 5).map((rank, i) => (
                    <div key={rank.college} className={`rank-row ${i === 0 ? "top" : ""}`}>
                      <span className={`rank-number ${i === 0 ? "gold" : "default"}`}>{i + 1}</span>
                      <div className="rank-info">
                        <p className="rank-name">{rank.college}</p>
                        <div className="rank-stats">
                          <span>{rank.placementRate}% placement</span>
                          <span>₹{rank.avgPackage} LPA</span>
                          <span>{rank.avgSkillsCount} skills</span>
                        </div>
                      </div>
                      <div className="rank-rate">
                        <p>{rank.placementRate}%</p>
                        <span>placement</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

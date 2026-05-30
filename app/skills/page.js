"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, Layers3, Search, Sparkles, Trash2,
  BarChart3, Gauge, Target, TrendingUp
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

const GROUP_NAMES = {
  "1": "Placement", "2": "Accreditation", "5": "Courses",
  "6": "Faculty", "7": "Infrastructure", "8": "Internship",
  "9": "Student Life", "12": "ROI"
};

const getGroupName = (key) => {
  const m = key.match(/^Category_(\d+)_/);
  return m ? (GROUP_NAMES[m[1]] || `Category ${m[1]}`) : "General";
};

export default function SkillsPage() {
  const router = useRouter();
  const [skills, setSkills] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [collegeData, setCollegeData] = useState(null);
  const [skillAnalysis, setSkillAnalysis] = useState(null);
  const [categoryBenchmarks, setCategoryBenchmarks] = useState({});
  const [collegeRankings, setCollegeRankings] = useState([]);

  useEffect(() => {
    setTimeout(() => {
      const profile = JSON.parse(localStorage.getItem("userProfile") || "null");
      const analysis = JSON.parse(localStorage.getItem("skillAnalysis") || "null");
      const selection = JSON.parse(localStorage.getItem("roadmapSelection") || "null");
      const benchmarks = JSON.parse(localStorage.getItem("categoryBenchmarks") || "{}");
      const rankings = JSON.parse(localStorage.getItem("collegeRankings") || "[]");

      setUserProfile(profile);
      setSkillAnalysis(analysis);
      setCollegeData(selection);
      setCategoryBenchmarks(benchmarks);
      setCollegeRankings(rankings);
      setSelectedSkills([]);
      localStorage.removeItem("userSkills");
    }, 0);

    fetch("/technical_skills.csv")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load skills dataset");
        return response.text();
      })
      .then((text) => {
        const lines = text.split(/\r?\n/);
        const parsed = [];

        for (let index = 1; index < lines.length; index += 1) {
          const line = lines[index].trim();
          if (!line) continue;

          const parts = line.split(",");
          if (parts.length >= 3) {
            parsed.push({
              id: parts[0].trim(),
              name: parts[1].trim(),
              category: parts[2].trim(),
            });
          }
        }

        setSkills(parsed);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching skills:", error);
        setLoading(false);
      });
  }, []);

  // Compute benchmark gap analysis from college data
  const gapAnalysis = useMemo(() => {
    if (!collegeData || !categoryBenchmarks || Object.keys(categoryBenchmarks).length === 0) return [];
    const groups = {};
    Object.entries(categoryBenchmarks).forEach(([key, bench]) => {
      const group = getGroupName(key);
      const collegeScore = collegeData.grades?.[key] ?? 0;
      const deficit = Math.round((bench.score - collegeScore) * 10) / 10;
      if (!groups[group]) groups[group] = { group, deficit: 0, count: 0 };
      groups[group].deficit += Math.max(0, deficit);
      groups[group].count++;
    });
    return Object.values(groups).map(g => ({
      ...g,
      avgDeficit: g.count > 0 ? Math.round((g.deficit / g.count) * 10) / 10 : 0
    })).filter(g => g.avgDeficit > 0).sort((a, b) => b.avgDeficit - a.avgDeficit);
  }, [collegeData, categoryBenchmarks]);

  // Radar data for college vs benchmark comparison (aggregated by group)
  const radarData = useMemo(() => {
    if (!collegeData || !categoryBenchmarks || Object.keys(categoryBenchmarks).length === 0) return [];
    const groups = {};
    Object.entries(categoryBenchmarks).forEach(([key, bench]) => {
      const group = getGroupName(key);
      if (!groups[group]) groups[group] = { category: group, collegeSum: 0, benchSum: 0, count: 0 };
      groups[group].collegeSum += collegeData.grades?.[key] ?? 0;
      groups[group].benchSum += bench.score;
      groups[group].count++;
    });
    return Object.values(groups).map(g => ({
      category: g.category,
      [collegeData.name]: Math.round((g.collegeSum / g.count) * 10) / 10,
      Benchmark: Math.round((g.benchSum / g.count) * 10) / 10
    }));
  }, [collegeData, categoryBenchmarks]);

  const filteredSkills = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return skills;

    return skills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(query) ||
        skill.category.toLowerCase().includes(query)
    );
  }, [searchQuery, skills]);

  const categoriesMap = useMemo(() => {
    return filteredSkills.reduce((map, skill) => {
      if (!map[skill.category]) map[skill.category] = [];
      map[skill.category].push(skill);
      return map;
    }, {});
  }, [filteredSkills]);

  const categories = Object.keys(categoriesMap).sort();
  const requiredContextReady = !!userProfile && !!collegeData;

  const toggleSkill = (skillName) => {
    setSelectedSkills((current) =>
      current.includes(skillName)
        ? current.filter((skill) => skill !== skillName)
        : [...current, skillName]
    );
  };

  const clearSelection = () => {
    setSelectedSkills([]);
    localStorage.removeItem("userSkills");
  };

  const handleContinueToRoadmap = () => {
    const updatedProfile = { ...userProfile, selectedSkills };
    localStorage.setItem("userProfile", JSON.stringify(updatedProfile));
    localStorage.setItem("userSkills", JSON.stringify(selectedSkills));
    router.push("/roadmap");
  };

  if (loading) {
    return (
      <div className="workspace-page centered-state">
        <div>
          <div className="spinner"></div>
          <h2>Loading skill taxonomy</h2>
          <p>Preparing the list of selectable skills.</p>
        </div>
      </div>
    );
  }

  if (!requiredContextReady) {
    return (
      <div className="workspace-page centered-state">
        <div className="empty-state-inner">
          <Layers3 size={36} />
          <h2>Profile setup is missing</h2>
          <p>Start from the benchmark page so the roadmap has college, branch, role, and graduation year context.</p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: 18 }}>
            <ArrowLeft size={18} />
            Back to benchmark setup
          </Link>
        </div>
      </div>
    );
  }

  const hasGaps = gapAnalysis.length > 0;

  return (
    <div className="workspace-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            <Sparkles size={16} />
            Skill inventory
          </span>
          <h1>Select only the skills you already have.</h1>
          <p>
            Nothing is auto-selected. Leave this page empty if you want the roadmap to treat you as starting from scratch.
          </p>
        </div>
        <Link href="/" className="btn btn-secondary">
          <ArrowLeft size={18} />
          Benchmark setup
        </Link>
      </header>

      {hasGaps && (
        <div className="card chart-card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <BarChart3 size={18} />
            <h2>Benchmark Gap Analysis</h2>
            <span>Categories where {collegeData?.name} trails the top performer</span>
          </div>
          <div className="chart-grid-2">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={gapAnalysis} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <XAxis dataKey="group" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", boxShadow: "var(--shadow)" }} />
                <Bar dataKey="avgDeficit" fill="var(--accent-error)" radius={[4, 4, 0, 0]} maxBarSize={32} name="Avg Deficit" />
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData.slice(0, 8)}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} />
                <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 10, fill: "var(--text-secondary)" }} />
                <Radar name={collegeData?.name} dataKey={collegeData?.name} stroke="var(--accent-primary)" fill="var(--accent-primary)" fillOpacity={0.12} strokeWidth={2} />
                <Radar name="Benchmark" dataKey="Benchmark" stroke="var(--border-strong)" fill="var(--border-strong)" fillOpacity={0.08} strokeWidth={2} strokeDasharray="4 4" />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="skills-layout">
        <aside className="card side-panel" style={{ padding: 20 }}>
          <div className="card-header">
            <Layers3 size={18} />
            <h2>Current context</h2>
          </div>

          <div className="profile-summary">
            <div className="summary-line">
              <span>Institution</span>
              <strong>{collegeData?.name}</strong>
            </div>
            <div className="summary-line">
              <span>Branch</span>
              <strong>{userProfile?.branch}</strong>
            </div>
            <div className="summary-line">
              <span>Role</span>
              <strong>{userProfile?.interestedRole}</strong>
            </div>
            <div className="summary-line">
              <span>Graduation</span>
              <strong>{userProfile?.graduationYear}</strong>
            </div>
          </div>

          {skillAnalysis && (
            <div className="metric-card" style={{ marginBottom: 10 }}>
              <span>Avg skills for placement</span>
              <strong>{skillAnalysis.avgSkillsPlaced || "-"}</strong>
            </div>
          )}

          {collegeRankings.length > 0 && (
            <div className="metric-card" style={{ marginBottom: 10 }}>
              <span>Placement rate ({userProfile?.branch})</span>
              <strong>{collegeRankings[0]?.placementRate}%</strong>
            </div>
          )}

          <div className="card-header" style={{ marginTop: 10, marginBottom: 10 }}>
            <Check size={16} />
            <h2>{selectedSkills.length} selected</h2>
          </div>

          {selectedSkills.length > 0 ? (
            <div className="selected-skill-list" style={{ marginBottom: 14 }}>
              {selectedSkills.map((skill) => (
                <span key={skill} className="selected-skill">
                  <Check size={13} />
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 14 }}>No acquired skills selected.</p>
          )}

          {skillAnalysis && (
            <div className="insight-box" style={{ marginBottom: 14 }}>
              <p><strong>Insight:</strong> Placed students in {userProfile?.interestedRole} avg {skillAnalysis.avgSkillsPlaced} skills. {skillAnalysis.criticalFactors?.internshipBenefit ? "Internships significantly boost placement odds." : ""}</p>
            </div>
          )}

          <div className="btn-row">
            <button className="btn btn-primary" onClick={handleContinueToRoadmap}>
              Generate roadmap
              <ArrowRight size={16} />
            </button>
            <button className="btn btn-secondary" onClick={clearSelection} disabled={selectedSkills.length === 0}>
              <Trash2 size={16} />
              Clear
            </button>
          </div>
        </aside>

        <main className="library-panel">
          <div className="card search-bar">
            <div className="field">
              <label htmlFor="skillSearch">Search skills</label>
              <div className="input-shell">
                <Search size={16} />
                <input
                  id="skillSearch"
                  type="text"
                  placeholder="Search by skill or category"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </div>
          </div>

          {categories.length === 0 ? (
            <div className="card" style={{ padding: "48px 20px", textAlign: "center" }}>
              <Search size={34} style={{ color: "var(--accent-primary)", marginBottom: 10 }} />
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 4 }}>No skills matched</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>Try a broader search term.</p>
            </div>
          ) : (
            categories.map((category) => (
              <div key={category} className="skill-section">
                <div className="skill-section-header">
                  <h3>{category}</h3>
                  <span className="status-pill">{categoriesMap[category].length} skills</span>
                </div>
                <div className="skill-grid">
                  {categoriesMap[category].map((skill) => {
                    const isSelected = selectedSkills.includes(skill.name);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        className={`skill-button ${isSelected ? "is-selected" : ""}`}
                        onClick={() => toggleSkill(skill.name)}
                      >
                        {isSelected && <Check size={13} />}
                        {skill.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </main>
      </div>
    </div>
  );
}

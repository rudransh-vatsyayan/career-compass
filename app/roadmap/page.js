"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, ClipboardList, FileDown, Gauge, Target, BarChart3, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function RoadmapPage() {
  const [collegeData, setCollegeData] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completedSteps, setCompletedSteps] = useState({});
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const selectionText = localStorage.getItem("roadmapSelection");
    if (!selectionText) {
      setTimeout(() => {
        setError("No institution was selected. Start from the benchmark setup page.");
        setLoading(false);
      }, 0);
      return;
    }

    try {
      const data = JSON.parse(selectionText);
      const categoryBenchmarksText = localStorage.getItem("categoryBenchmarks");
      const categoryBenchmarks = categoryBenchmarksText ? JSON.parse(categoryBenchmarksText) : null;
      const profileText = localStorage.getItem("userProfile");
      const userProfileParsed = profileText ? JSON.parse(profileText) : null;
      const skillsText = localStorage.getItem("userSkills");
      const userSkills = skillsText ? JSON.parse(skillsText) : [];
      const collegeRankingsText = localStorage.getItem("collegeRankings");
      const collegeRankings = collegeRankingsText ? JSON.parse(collegeRankingsText) : [];
      const skillAnalysisText = localStorage.getItem("skillAnalysis");
      const skillAnalysis = skillAnalysisText ? JSON.parse(skillAnalysisText) : null;

      // Load saved completed steps for this specific college
      const savedProgress = localStorage.getItem(`progress_${data.name}`);

      setTimeout(() => {
        setUserProfile(userProfileParsed);
        setCollegeData(data);
        if (savedProgress) {
          setCompletedSteps(JSON.parse(savedProgress));
        }
      }, 0);

      // Call API with placement data
      fetch("/api/roadmap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collegeName: data.name,
          grades: data.grades,
          categoryBenchmarks: categoryBenchmarks,
          userProfile: userProfileParsed,
          userSkills: userSkills,
          collegeRankings: collegeRankings,
          skillAnalysis: skillAnalysis
        })
      })
        .then(res => {
          if (!res.ok) {
            return res.json().then(errData => {
              throw new Error(errData.error || errData.details || "Server responded with error generating roadmap");
            });
          }
          return res.json();
        })
        .then(json => {
          console.log("Roadmap received:", json);
          setRoadmap(json);
          setLoading(false);
        })
        .catch(err => {
          console.error("API error:", err);
          setError(`Failed to generate roadmap: ${err.message}`);
          setLoading(false);
        });
    } catch (parseError) {
      console.error(parseError);
      setTimeout(() => {
        setError("Invalid roadmap setup data. Start again from benchmark setup.");
        setLoading(false);
      }, 0);
    }
  }, []);

  const handleToggleStep = (stepId) => {
    if (!collegeData) return;

    const newProgress = {
      ...completedSteps,
      [stepId]: !completedSteps[stepId],
    };

    setCompletedSteps(newProgress);
    localStorage.setItem(`progress_${collegeData.name}`, JSON.stringify(newProgress));
  };

  const completionRate = useMemo(() => {
    if (!roadmap?.steps?.length) return 0;
    const completedCount = Object.values(completedSteps).filter(Boolean).length;
    return Math.round((completedCount / roadmap.steps.length) * 100);
  }, [roadmap, completedSteps]);

  // Skills per semester for chart
  const skillsChartData = useMemo(() => {
    if (!roadmap?.steps) return [];
    return roadmap.steps.map(step => ({
      semester: `Sem ${step.semester || step.id}`,
      skills: step.skills?.length || 0,
      label: step.timeline?.split("(")[0]?.trim() || `Semester ${step.id}`
    }));
  }, [roadmap]);

  if (loading) {
    return (
      <div className="workspace-page centered-state">
        <div>
          <div className="spinner"></div>
          <h2>Generating semester roadmap</h2>
          <p>Comparing acquired skills, placement signals, and college benchmark gaps.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workspace-page centered-state">
        <div className="empty-state-inner">
          <Circle size={36} />
          <h2>Roadmap generation failed</h2>
          <p>{error}</p>
          <div className="btn-row" style={{ justifyContent: "center", marginTop: 18 }}>
            <button onClick={() => window.location.reload()} className="btn btn-primary">
              Retry
            </button>
            <Link href="/skills" className="btn btn-secondary">
              <ArrowLeft size={18} />
              Back to skills
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!roadmap || !roadmap.steps) {
    return (
      <div className="workspace-page centered-state">
        <div className="empty-state-inner">
          <Circle size={36} />
          <h2>No roadmap data</h2>
          <p>The AI response was invalid or empty. Please try again.</p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: 18 }}>
            <ArrowLeft size={18} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const totalSkills = roadmap.steps.reduce((s, step) => s + (step.skills?.length || 0), 0);
  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const totalSteps = roadmap.steps.length;

  return (
    <div className="workspace-page roadmap-wrap">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            <Target size={16} />
            Semester roadmap
          </span>
          <h1>{collegeData?.name} to {userProfile?.interestedRole}</h1>
          <p>
            Graduation year {userProfile?.graduationYear}. The plan compares selected acquired skills with the benchmark workbook and placement data.
          </p>
        </div>
        <Link href="/skills" className="btn btn-secondary">
          <ArrowLeft size={18} />
          Skill inventory
        </Link>
      </header>

      {/* Stats Overview */}
      <div className="stats-row" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <span className="stat-label">Strategy</span>
          <p className="stat-value" style={{ fontSize: "1.1rem" }}>{roadmap?.strategyType || "Career plan"}</p>
        </div>
        <div className="stat-card">
          <span className="stat-label">Semesters planned</span>
          <p className="stat-value">{totalSteps}</p>
        </div>
        <div className="stat-card">
          <span className="stat-label">Skills to acquire</span>
          <p className="stat-value">{totalSkills}</p>
        </div>
        <div className="stat-card">
          <span className="stat-label">Completed</span>
          <p className="stat-value">{completedCount}/{totalSteps}</p>
        </div>
      </div>

      {/* Strategy + Progress Section */}
      <div className="card strategy-panel">
        <div className="strategy-grid">
          <div>
            <div className="card-header" style={{ marginBottom: 10 }}>
              <Gauge size={18} />
              <h2>{roadmap?.strategyType}</h2>
            </div>
            {roadmap?.matchedCollege && (
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 10 }}>Matched benchmark: {roadmap.matchedCollege}</p>
            )}
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.65", marginBottom: 14 }}>
              {roadmap?.deficitSummary}
            </p>
            {roadmap?.placementStrategy && (
              <div className="insight-box">
                <p><strong>Placement Strategy:</strong> {roadmap.placementStrategy}</p>
              </div>
            )}
          </div>
          <div>
            <div className="roadmap-progress">
              <span className="progress-pct" style={{ color: completionRate >= 70 ? "var(--accent-success)" : completionRate >= 30 ? "var(--accent-warning)" : "var(--accent-error)" }}>
                {completionRate}%
              </span>
              <span className="progress-label">overall completion</span>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${completionRate}%`, background: completionRate >= 70 ? "var(--accent-success)" : completionRate >= 30 ? "var(--accent-warning)" : "var(--accent-error)" }} />
              </div>
            </div>
            {skillsChartData.length > 0 && (
              <div className="skills-chart-mini">
                <div className="chart-label">
                  <BarChart3 size={13} />
                  Skills per semester
                </div>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={skillsChartData} margin={{ top: 0, right: 0, bottom: 0, left: -12 }}>
                    <XAxis dataKey="semester" tick={{ fontSize: 9, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid var(--border)", boxShadow: "var(--shadow)", fontSize: 12 }} formatter={(value) => [value, "Skills"]} />
                    <Bar dataKey="skills" fill="var(--accent-primary)" radius={[3, 3, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sequential Timeline */}
      <div className="timeline">
        <div className="timeline-rail" />

        {roadmap.steps.map((step) => {
          const isDone = !!completedSteps[step.id];
          return (
            <div key={step.id} className="timeline-step">
              <div className={`timeline-node ${isDone ? "done" : "pending"}`} />

              <section className={`timeline-card ${isDone ? "is-complete" : ""}`}>
                <div className="timeline-head">
                  <div className="timeline-title">
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => handleToggleStep(step.id)}
                      aria-label={`Mark ${step.title} complete`}
                    />
                    <div>
                      <h3>{step.title}</h3>
                      <span className="timeline-category">{step.category}</span>
                    </div>
                  </div>
                  <span className="status-pill">{step.timeline}</span>
                </div>

                <p className="timeline-desc">{step.description}</p>

                {step.placementRelevance && (
                  <div className="placement-note">
                    <TrendingUp size={14} />
                    <p><strong>Placement:</strong> {step.placementRelevance}</p>
                  </div>
                )}

                {step.skills?.length > 0 && (
                  <div className="skill-tags">
                    <span className="tag-label">Skills to acquire ({step.skills.length})</span>
                    {step.skills.map(skill => (
                      <span key={skill} className="skill-tag">{skill}</span>
                    ))}
                  </div>
                )}

                {step.deliverables?.length > 0 && (
                  <div className="deliverables-list">
                    <span className="deliverable-label">Deliverables</span>
                    <ul>
                      {step.deliverables.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="timeline-footer">
                  <Link href="/skills" className="btn btn-secondary">
                    <ClipboardList size={15} />
                    Edit skills
                  </Link>
                  <button onClick={() => window.print()} className="btn btn-primary">
                    <FileDown size={15} />
                    Export
                  </button>
                </div>
              </section>
            </div>
          );
        })}
      </div>
    </div>
  );
}
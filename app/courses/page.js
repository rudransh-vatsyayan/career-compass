"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, X, ExternalLink, BookOpen, GraduationCap, Award, Star, Target, Compass, TrendingUp, Sparkles } from "lucide-react";

const LEVEL_ORDER = { Beginner: 1, Intermediate: 2, Advanced: 3 };

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skillFilter, setSkillFilter] = useState("All");
  const [providerFilter, setProviderFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [certOnly, setCertOnly] = useState(false);
  const [showRecommended, setShowRecommended] = useState(true);
  const [roadmapSkills, setRoadmapSkills] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("roadmapSkills");
    const parsed = saved ? JSON.parse(saved) : null;
    setRoadmapSkills(parsed);

    const params = new URLSearchParams(window.location.search);
    const skillParam = params.get("skill");
    if (skillParam) setSkillFilter(skillParam);

    setInitialized(true);
  }, []);

  useEffect(() => {
    fetch("/courses.json")
      .then((r) => r.json())
      .then((data) => {
        setCourses(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const skills = useMemo(() => {
    const s = new Set(courses.map((c) => c.skill));
    return ["All", ...Array.from(s).sort()];
  }, [courses]);

  const providers = useMemo(() => {
    const p = new Set(courses.map((c) => c.provider));
    return ["All", ...Array.from(p).sort()];
  }, [courses]);

  const roadmapCourses = useMemo(() => {
    if (!roadmapSkills || !roadmapSkills.length || !courses.length) return [];
    const lower = roadmapSkills.map(s => s.toLowerCase());
    return courses.filter(c => lower.includes(c.skill.toLowerCase()));
  }, [courses, roadmapSkills]);

  const otherCourses = useMemo(() => {
    if (!roadmapSkills || !roadmapSkills.length || !courses.length) return courses;
    const lower = roadmapSkills.map(s => s.toLowerCase());
    return courses.filter(c => !lower.includes(c.skill.toLowerCase()));
  }, [courses, roadmapSkills]);

  const activeSet = showRecommended && roadmapCourses.length ? roadmapCourses : courses;

  const filtered = useMemo(() => {
    const source = activeSet;
    if (!initialized) return [];
    if (!skillFilter && !providerFilter && !levelFilter && !search && !freeOnly && !certOnly) return source;
    return source.filter((c) => {
      if (skillFilter !== "All" && c.skill !== skillFilter) return false;
      if (providerFilter !== "All" && c.provider !== providerFilter) return false;
      if (levelFilter !== "All" && c.level !== levelFilter) return false;
      if (freeOnly && !c.free) return false;
      if (certOnly && !c.certificate) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => (LEVEL_ORDER[a.level] || 0) - (LEVEL_ORDER[b.level] || 0));
  }, [activeSet, skillFilter, providerFilter, levelFilter, search, freeOnly, certOnly]);

  const hasFilters = skillFilter !== "All" || providerFilter !== "All" || levelFilter !== "All" || search || freeOnly || certOnly;

  const clearFilters = () => {
    setSkillFilter("All");
    setProviderFilter("All");
    setLevelFilter("All");
    setSearch("");
    setFreeOnly(false);
    setCertOnly(false);
  };

  const resultCount = roadmapSkills?.length ? roadmapCourses.length : courses.length;

  return (
    <div className="workspace-page">
      <div className="page-header">
        <div>
          <div className="eyebrow"><Compass size={14} /> Career Campus</div>
          <h1>Skill-Building Courses</h1>
          <p>
            {roadmapSkills?.length
              ? `${resultCount} courses mapped to your roadmap skills — ${roadmapSkills.length} skill${roadmapSkills.length > 1 ? "s" : ""} targeted`
              : `${courses.length} courses across ${skills.length - 1} skill areas — generate a roadmap first for personalized picks`}
          </p>
        </div>
      </div>

      {/* Roadmap banner */}
      {roadmapSkills?.length ? (
        <div className="campus-banner">
          <div className="campus-banner-icon"><Target size={18} /></div>
          <div className="campus-banner-body">
            <strong>Roadmap-aligned courses</strong>
            <span>{roadmapSkills.length} skill{roadmapSkills.length > 1 ? "s" : ""} from your career plan — {roadmapCourses.length} course{roadmapCourses.length !== 1 ? "s" : ""} available</span>
          </div>
          <button
            className={`campus-toggle ${showRecommended ? "active" : ""}`}
            onClick={() => setShowRecommended(v => !v)}
          >
            {showRecommended ? "Show all" : "Recommended"}
          </button>
        </div>
      ) : (
        <div className="campus-banner campus-banner-empty">
          <div className="campus-banner-icon"><TrendingUp size={18} /></div>
          <div className="campus-banner-body">
            <strong>No roadmap yet</strong>
            <span>Generate a roadmap first to get course recommendations tailored to your skill gaps</span>
          </div>
          <Link href="/roadmap" className="btn btn-primary" style={{ flexShrink: 0 }}>
            View roadmap
          </Link>
        </div>
      )}

      <div className="course-filters">
        <div className="filter-row">
          <div className="filter-group">
            <label>Skill</label>
            <select value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)}>
              {skills.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Provider</label>
            <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}>
              {providers.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Level</label>
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
              <option>All</option>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>
          <div className="filter-group filter-search">
            <label>Search</label>
            <div className="filter-search-wrap">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search courses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="filter-row filter-row-toggles">
          <label className="toggle-label">
            <input type="checkbox" checked={freeOnly} onChange={() => setFreeOnly((v) => !v)} />
            <span>Free only</span>
          </label>
          <label className="toggle-label">
            <input type="checkbox" checked={certOnly} onChange={() => setCertOnly((v) => !v)} />
            <span>Certificate</span>
          </label>
          {hasFilters && (
            <button className="btn-clear" onClick={clearFilters}>
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="course-meta">
        <span><strong>{filtered.length}</strong> course{filtered.length !== 1 ? "s" : ""} found</span>
        {roadmapSkills?.length > 0 && showRecommended && (
          <button className="btn btn-secondary" style={{ height: 32, fontSize: "0.78rem" }} onClick={() => setShowRecommended(false)}>
            <Sparkles size={13} /> Browse all {courses.length} courses
          </button>
        )}
      </div>

      {loading ? (
        <div className="centered-state"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="centered-state">
          <div className="empty-state-inner">
            <BookOpen size={36} />
            <h2>No courses match</h2>
            <p>Try adjusting filters or changing your skill selection</p>
          </div>
        </div>
      ) : (
        <div className="course-grid">
          {filtered.map((course) => (
            <div key={course.id} className="course-card">
              <div className="course-card-top">
                <span className="course-skill-badge">{course.skill}</span>
                {course.free && <span className="course-badge-free">Free</span>}
                {course.certificate && <span className="course-badge-cert"><Award size={12} /> Cert</span>}
              </div>
              <h3 className="course-name">{course.name}</h3>
              <div className="course-provider-row">
                <GraduationCap size={14} />
                <span>{course.provider}</span>
              </div>
              <div className="course-level">
                <Star size={12} />
                <span>{course.level}</span>
              </div>
              <a
                href={course.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-full"
              >
                <ExternalLink size={15} />
                Open course
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

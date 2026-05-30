import "./globals.css";
import Link from "next/link";
import ThemeToggle from "./theme-toggle";

export const metadata = {
  title: "Career Compass | Career Strategy Platform",
  description: "College benchmark comparison, semester-wise roadmaps, and skill-building courses.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="app-nav">
          <div className="nav-container">
            <Link href="/" className="brand-logo">
              <div className="brand-dot"></div>
              <span>CAREER COMPASS</span>
            </Link>
            <nav className="nav-links">
              <Link href="/" className="nav-link">Benchmark</Link>
              <Link href="/skills" className="nav-link">Skills</Link>
              <Link href="/roadmap" className="nav-link">Roadmap</Link>
              <Link href="/courses" className="nav-link">Career Campus</Link>
            </nav>
            <div className="nav-actions">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}

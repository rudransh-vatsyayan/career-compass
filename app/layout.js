import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Pathfinder AI | Career Strategy Platform",
  description: "College benchmark comparison and semester-wise career roadmaps.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="app-nav">
          <div className="nav-container">
            <Link href="/" className="brand-logo">
              <div className="brand-dot"></div>
              <span>PATHFINDER AI</span>
            </Link>
            <nav className="nav-links">
              <Link href="/" className="nav-link">Benchmark</Link>
              <Link href="/skills" className="nav-link">Skills</Link>
              <Link href="/roadmap" className="nav-link">Roadmap</Link>
            </nav>
          </div>
        </header>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}


import {
  Landmark,
  ShieldCheck,
  Wallet,
  ReceiptText,
  CalendarDays,
  ChartNoAxesCombined,
  ArrowRight,
  LockKeyhole,
} from "lucide-react";
import "./Welcome.css";

const features = [
  {
    icon: Wallet,
    title: "Income Management",
    description:
      "Keep church income records organized and easy to review.",
  },
  {
    icon: ReceiptText,
    title: "Expense Tracking",
    description:
      "Maintain clear records of church expenditure and payments.",
  },
  {
    icon: CalendarDays,
    title: "Sunday Records",
    description:
      "Organize weekly financial records and monthly summaries.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Financial Reports",
    description:
      "Review financial activity through structured reports.",
  },
];

export default function Welcome() {
  return (
    <main className="welcome-page">
      <header className="welcome-header">
        <a className="welcome-brand" href="/" aria-label="BHCI Finance home">
          <span className="welcome-logo">
            <Landmark size={27} strokeWidth={1.7} />
          </span>

          <span className="welcome-brand-text">
            <strong>BHCI</strong>
            <small>FINANCE MANAGEMENT</small>
          </span>
        </a>

        <a className="welcome-signin" href="/login">
          Sign In <ArrowRight size={17} />
        </a>
      </header>

      <section className="welcome-hero">
        <div className="welcome-hero-content">
          <div className="welcome-eyebrow">
            <span />
            BREAKTHROUGH HOLINESS CHURCH INTERNATIONAL
          </div>

          <h1>
            Faithful stewardship.
            <br />
            <span>Transparent finances.</span>
          </h1>

          <p className="welcome-description">
            A central place to manage church income, expenses,
            Sunday records, and financial reports with clarity,
            accountability, and confidence.
          </p>

          <div className="welcome-actions">
            <a className="welcome-primary-button" href="/login">
              <LockKeyhole size={18} />
              Sign In to Your Account
              <ArrowRight size={18} />
            </a>
          </div>

          <div className="welcome-assurance">
            <ShieldCheck size={19} />
            <span>Authorized access to the finance workspace</span>
          </div>
        </div>

        <div className="welcome-visual" aria-hidden="true">
          <div className="welcome-orbit welcome-orbit-one" />
          <div className="welcome-orbit welcome-orbit-two" />

          <div className="welcome-emblem">
            <div className="welcome-emblem-inner">
              <Landmark size={76} strokeWidth={1.1} />
              <span>BHCI</span>
              <small>FAITHFUL STEWARDSHIP</small>
            </div>
          </div>

          <div className="welcome-floating-card welcome-card-top">
            <ShieldCheck size={20} />
            <div>
              <strong>Accountability</strong>
              <small>Organized records</small>
            </div>
          </div>

          <div className="welcome-floating-card welcome-card-bottom">
            <ChartNoAxesCombined size={22} />
            <div>
              <strong>Financial clarity</strong>
              <small>Reports and summaries</small>
            </div>
          </div>
        </div>
      </section>

      <section className="welcome-features">
        <div className="welcome-section-heading">
          <span>YOUR FINANCE WORKSPACE</span>
          <h2>Everything organized in one place.</h2>
          <p>
            Tools designed to support responsible financial
            record keeping across BHCI.
          </p>
        </div>

        <div className="welcome-feature-grid">
          {features.map(({ icon: Icon, title, description }) => (
            <article className="welcome-feature-card" key={title}>
              <div className="welcome-feature-icon">
                <Icon size={23} strokeWidth={1.7} />
              </div>

              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="welcome-footer">
        <div className="welcome-footer-brand">
          <Landmark size={18} />
          <span>BHCI Finance Management System</span>
        </div>

        <span>Stewardship • Transparency • Accountability</span>
      </footer>
    </main>
  );
}


import { Link } from "react-router-dom";
import {
  Landmark,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Wallet,
  ChartNoAxesCombined,
  ReceiptText,
} from "lucide-react";
import "./Welcome.css";

function Welcome() {
  return (
    <main className="welcome-page">
      <header className="welcome-header">
        <Link to="/" className="welcome-brand">
          <span className="brand-icon">
            <Landmark size={25} />
          </span>

          <span className="brand-text">
            <strong>BHCI FINANCE</strong>
            <small>FINANCIAL MANAGEMENT SYSTEM</small>
          </span>
        </Link>

        <span className="header-badge">
          <ShieldCheck size={16} />
          Secure Access
        </span>
      </header>

      <section className="welcome-content">
        {/* LEFT: Animated finance illustration */}
        <div className="finance-animation">
          <div className="animation-glow" />

          <div className="finance-card main-finance-card">
            <div className="finance-card-heading">
              <div>
                <span className="card-eyebrow">
                  FINANCIAL OVERVIEW
                </span>
                <h3>Church Finances</h3>
              </div>

              <span className="finance-icon">
                <Wallet size={22} />
              </span>
            </div>

            <div className="chart-summary">
              <span>Income &amp; Expenses</span>
              <ChartNoAxesCombined size={18} />
            </div>

            <div className="animated-chart">
              {[35, 55, 43, 72, 51, 85, 65, 95, 70, 82, 58, 76].map(
                (height, index) => (
                  <div
                    key={index}
                    className="chart-bar"
                    style={{
                      "--bar-height": `${height}%`,
                      "--bar-delay": `${index * 0.08}s`,
                    }}
                  />
                )
              )}
            </div>

            <div className="chart-months">
              <span>Jan</span>
              <span>Mar</span>
              <span>May</span>
              <span>Jul</span>
              <span>Sep</span>
              <span>Dec</span>
            </div>

            <div className="finance-card-footer">
              <span>
                <span className="status-dot" />
                Organized financial records
              </span>
              <ShieldCheck size={18} />
            </div>
          </div>

          <div className="finance-card floating-card income-card">
            <span className="floating-icon">
              <TrendingUp size={19} />
            </span>
            <div>
              <small>Income Tracking</small>
              <strong>Clear records</strong>
            </div>
          </div>

          <div className="finance-card floating-card expense-card">
            <span className="floating-icon receipt-icon">
              <ReceiptText size={19} />
            </span>
            <div>
              <small>Expense Reports</small>
              <strong>Better accountability</strong>
            </div>
          </div>

          <div className="animation-caption">
            <span className="caption-line" />
            STEWARDSHIP • TRANSPARENCY • ACCOUNTABILITY
          </div>
        </div>

        {/* RIGHT: Welcome message and sign-in button */}
        <div className="welcome-message">
          <span className="welcome-eyebrow">
            BREAKTHROUGH HOLINESS CHURCH INTERNATIONAL
          </span>

          <h1>
            Welcome to
            <span> BHCI Finance.</span>
          </h1>

          <div className="welcome-divider" />

          <p className="welcome-description">
            Faithful stewardship. Clear accountability.
          </p>

          <p className="welcome-details">
            Manage church income, expenses, and financial reports
            in one organized place. Our finance platform helps
            support transparency, accuracy, and responsible
            stewardship of church resources.
          </p>

          <Link to="/login" className="welcome-signin-btn">
            Sign In to Continue
            <ArrowRight size={19} />
          </Link>

          <div className="welcome-security">
            <ShieldCheck size={17} />
            <span>Authorized users only</span>
          </div>

          <div className="welcome-values">
            <div>
              <span className="value-number">01</span>
              <span>Transparency</span>
            </div>
            <div>
              <span className="value-number">02</span>
              <span>Accuracy</span>
            </div>
            <div>
              <span className="value-number">03</span>
              <span>Stewardship</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="welcome-footer">
        <span>
          © {new Date().getFullYear()} Breakthrough Holiness Church
          International
        </span>
        <span>Faithful in stewardship.</span>
      </footer>
    </main>
  );
}

export default Welcome;

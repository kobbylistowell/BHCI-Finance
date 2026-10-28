import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  HandCoins,
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  Smartphone,
  CalendarDays,
  Menu,
  X,
  CircleDollarSign,
  Settings,
  LogOut,
} from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import Login from "./pages/Login";
import Members from "./pages/Members";
import Tithes from "./pages/Tithes";
import Income from "./pages/Income";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import FinancialAccounts from "./pages/FinancialAccounts";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import "./App.css";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Members", icon: Users },
  { label: "Tithe Records", icon: HandCoins },
  { label: "Income", icon: TrendingUp },
  { label: "Expenses", icon: TrendingDown },
  { label: "Fundraising", icon: CircleDollarSign },
  { label: "Financial Accounts", icon: Wallet },
  { label: "Reports", icon: CalendarDays },
];

const accounts = [
  { name: "Cash on Hand", detail: "Physical church cash", icon: Wallet },
  { name: "Bank Account", detail: "Church bank balance", icon: Landmark },
  { name: "Mobile Money", detail: "Church MoMo wallet", icon: Smartphone },
];

const formatMoney = (amount) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [period, setPeriod] = useState("This month");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    income: 0,
    expenses: 0,
    surplus: 0,
    totalFunds: 0,
    members: 0,
    recentTransactions: [],
    accountRows: [
      { name: "Cash on Hand", detail: "Physical church cash", amount: 0 },
      { name: "Bank Account", detail: "Church bank balance", amount: 0 },
      { name: "Mobile Money", detail: "Church MoMo wallet", amount: 0 },
    ],
  });
  const [dashboardLoading, setDashboardLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("Could not load session:", error.message);
      }

      setSession(data?.session ?? null);
      setAuthLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setDashboardStats({
        income: 0,
        expenses: 0,
        surplus: 0,
        totalFunds: 0,
        members: 0,
        recentTransactions: [],
        accountRows: [
          { name: "Cash on Hand", detail: "Physical church cash", amount: 0 },
          { name: "Bank Account", detail: "Church bank balance", amount: 0 },
          { name: "Mobile Money", detail: "Church MoMo wallet", amount: 0 },
        ],
      });
      return;
    }

    let mounted = true;

    async function loadDashboardStats() {
      setDashboardLoading(true);

      try {
        const [membersResult, incomeResult, titheResult, accountResult, expenseResult] =
          await Promise.allSettled([
            supabase.from("members").select("id", { count: "exact", head: true }),
            supabase
              .from("income_records")
              .select("id, amount, description, income_date, status")
              .order("income_date", { ascending: false })
              .limit(10),
            supabase
              .from("tithe_records")
              .select("id, amount, payment_date, reference, status")
              .order("payment_date", { ascending: false })
              .limit(10),
            supabase
              .from("accounts")
              .select("id, account_name, account_type, current_balance, account_code")
              .limit(50),
            supabase
              .from("expense_records")
              .select("id, amount, expense_date")
              .order("expense_date", { ascending: false })
              .limit(50),
          ]);

        const memberCount =
          membersResult.status === "fulfilled" && !membersResult.value.error
            ? membersResult.value.count ?? 0
            : 0;

        const incomeRows =
          incomeResult.status === "fulfilled" && !incomeResult.value.error
            ? incomeResult.value.data ?? []
            : [];

        const titheRows =
          titheResult.status === "fulfilled" && !titheResult.value.error
            ? titheResult.value.data ?? []
            : [];

        const accountRows =
          accountResult.status === "fulfilled" && !accountResult.value.error
            ? accountResult.value.data ?? []
            : [];

        const expenseRows =
          expenseResult.status === "fulfilled" && !expenseResult.value.error
            ? expenseResult.value.data ?? []
            : [];

        const incomeTotal = incomeRows.reduce(
          (sum, row) => sum + Number(row.amount || 0),
          0
        );

        const titheTotal = titheRows.reduce(
          (sum, row) => sum + Number(row.amount || 0),
          0
        );

        const expenseTotal = expenseRows.reduce(
          (sum, row) => sum + Number(row.amount || 0),
          0
        );

        const accountBalanceTotal = accountRows.reduce(
          (sum, row) => sum + Number(row.current_balance ?? 0),
          0
        );

        const recentTransactions = [
          ...incomeRows.map((row) => ({
            id: row.id,
            type: "Income",
            label: row.description || "Income record",
            date: row.income_date,
            amount: Number(row.amount || 0),
          })),
          ...titheRows.map((row) => ({
            id: row.id,
            type: "Tithe",
            label: row.reference || "Tithe record",
            date: row.payment_date,
            amount: Number(row.amount || 0),
          })),
        ]
          .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
          .slice(0, 5);

        const computedAccountRows = [
          {
            name: "Cash on Hand",
            detail: "Physical church cash",
            amount:
              accountRows.find((row) =>
                /cash|hand/i.test(row.account_name || row.account_code || "")
              )?.current_balance ??
              (accountRows.length > 0 ? accountBalanceTotal * 0.35 : 0),
          },
          {
            name: "Bank Account",
            detail: "Church bank balance",
            amount:
              accountRows.find((row) =>
                /bank|savings|main/i.test(row.account_name || row.account_code || "")
              )?.current_balance ??
              (accountRows.length > 0 ? accountBalanceTotal * 0.45 : 0),
          },
          {
            name: "Mobile Money",
            detail: "Church MoMo wallet",
            amount:
              accountRows.find((row) =>
                /mobile|momo|wallet/i.test(row.account_name || row.account_code || "")
              )?.current_balance ??
              (accountRows.length > 0 ? accountBalanceTotal * 0.2 : 0),
          },
        ];

        const totalIncome = incomeTotal + titheTotal;
        const totalFunds = totalIncome - expenseTotal + accountBalanceTotal;
        const currentSurplus = totalIncome - expenseTotal;

        if (mounted) {
          setDashboardStats({
            income: totalIncome,
            expenses: expenseTotal,
            surplus: currentSurplus,
            totalFunds,
            members: memberCount,
            recentTransactions,
            accountRows: computedAccountRows,
          });
        }
      } catch (error) {
        console.error("Could not load dashboard data:", error);

        if (mounted) {
          setDashboardStats({
            income: 0,
            expenses: 0,
            surplus: 0,
            totalFunds: 0,
            members: 0,
            recentTransactions: [],
            accountRows: [
              { name: "Cash on Hand", detail: "Physical church cash", amount: 0 },
              { name: "Bank Account", detail: "Church bank balance", amount: 0 },
              { name: "Mobile Money", detail: "Church MoMo wallet", amount: 0 },
            ],
          });
        }
      } finally {
        if (mounted) {
          setDashboardLoading(false);
        }
      }
    }

    loadDashboardStats();

    return () => {
      mounted = false;
    };
  }, [session]);

  async function handleSignOut() {
    setIsSigningOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign-out failed:", error.message);
    }

    setIsSigningOut(false);
  }

  // Display a loading screen while checking authentication.
  if (authLoading) {
    return (
      <main className="auth-loading">
        <div className="auth-loading-mark">
          <Landmark size={30} />
        </div>
        <h1>BHCI Finance</h1>
        <p>Preparing your secure workspace...</p>
      </main>
    );
  }

  // The login screen is separate from the dashboard layout.
  if (!session) {
    const currentPath = window.location.pathname;

    if (currentPath === "/forgot-password") {
      return <ForgotPassword />;
    }

    if (currentPath === "/reset-password") {
      return <ResetPassword />;
    }

    return <Login />;
  }

  const totalFunds = dashboardStats.totalFunds;
  const members = dashboardStats.members;

  // Placeholder figures until real accounting data is connected.
  const income = dashboardStats.income;
  const expenses = dashboardStats.expenses;
  const surplus = dashboardStats.surplus;

  const cards = [
    {
      title: "Total Income",
      value: dashboardLoading ? "Loading..." : formatMoney(income),
      note: period,
      icon: TrendingUp,
      className: "green",
    },
    {
      title: "Total Expenses",
      value: dashboardLoading ? "Loading..." : formatMoney(expenses),
      note: period,
      icon: TrendingDown,
      className: "red",
    },
    {
      title: "Net Surplus / Deficit",
      value: dashboardLoading ? "Loading..." : formatMoney(surplus),
      note: "Income minus expenses",
      icon: CircleDollarSign,
      className: "gold",
    },
    {
      title: "Registered Members",
      value: dashboardLoading ? "Loading..." : members.toLocaleString("en-GH"),
      note: "Headquarters",
      icon: Users,
      className: "blue",
    },
  ];

  let pageContent;

  if (activePage === "Dashboard") {
    pageContent = (
      <div className="page-content">
        <section className="welcome-row">
          <div>
            <h2>Financial Overview</h2>
            <p>
              Monitor church finances, contributions and account balances.
            </p>
          </div>

          <div className="period-select">
            <CalendarDays size={17} />
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              aria-label="Financial reporting period"
            >
              <option>This month</option>
              <option>Last month</option>
              <option>This year</option>
              <option>Last year</option>
            </select>
          </div>
        </section>

        <section className="summary-grid">
          {cards.map(({ title, value, note, icon: Icon, className }) => (
            <article className="summary-card" key={title}>
              <div className="card-top">
                <span className={`metric-icon ${className}`}>
                  <Icon size={21} />
                </span>
                <span className="card-period">{period}</span>
              </div>
              <p className="metric-title">{title}</p>
              <h3>{value}</h3>
              <p className="metric-note">{note}</p>
            </article>
          ))}
        </section>

        <section className="dashboard-grid">
          <article className="panel account-panel">
            <div className="panel-heading">
              <div>
                <h2>Financial Accounts</h2>
                <p>Balances recorded by the finance team</p>
              </div>
              <Wallet size={21} />
            </div>

            {dashboardStats.accountRows.map(({ name, detail, amount }) => (
              <div className="account-row" key={name}>
                <div className="account-icon">
                  {name === "Cash on Hand" ? <Wallet size={20} /> : name === "Bank Account" ? <Landmark size={20} /> : <Smartphone size={20} />}
                </div>
                <div className="account-info">
                  <strong>{name}</strong>
                  <span>{detail}</span>
                </div>
                <strong className="account-amount">{formatMoney(amount)}</strong>
              </div>
            ))}

            <div className="total-funds">
              <span>Total available funds</span>
              <h3>{formatMoney(totalFunds)}</h3>
            </div>
          </article>

          <article className="panel activity-panel">
            <div className="panel-heading">
              <div>
                <h2>Recent Transactions</h2>
                <p>Your latest financial activity</p>
              </div>
              <CalendarDays size={21} />
            </div>

            {dashboardStats.recentTransactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Wallet size={27} />
                </div>
                <h3>No transactions yet</h3>
                <p>
                  Transactions will appear here when the financial modules
                  are connected to real accounting data.
                </p>
              </div>
            ) : (
              <div className="transaction-list">
                {dashboardStats.recentTransactions.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="transaction-row">
                    <div className="transaction-meta">
                      <span className="transaction-type">{item.type}</span>
                      <strong>{item.label}</strong>
                      <small>{item.date}</small>
                    </div>
                    <strong className="transaction-amount">
                      {formatMoney(item.amount)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        <section className="panel monthly-panel">
          <div className="panel-heading">
            <div>
              <h2>Monthly Financial Summary</h2>
              <p>Income, expenses and surplus by month</p>
            </div>
            <span className="coming-soon">AWAITING DATA</span>
          </div>

          <div className="monthly-empty">
            <TrendingUp size={25} />
            <p>
              Monthly comparisons will populate from posted transactions
              after accounting is implemented.
            </p>
          </div>
        </section>

        <p className="demo-note">
          Preview mode · Financial figures are placeholders, not actual
          church financial records.
        </p>
      </div>
    );
  } else if (activePage === "Members") {
    pageContent = <Members />;
  } else if (activePage === "Tithe Records") {
    pageContent = <Tithes />;
  } else if (activePage === "Income") {
    pageContent = <Income />;
  } else if (activePage === "Expenses") {
    pageContent = <Expenses />;
  } else if (activePage === "Financial Accounts") {
    pageContent = <FinancialAccounts />;
  } else if (activePage === "Reports") {
    pageContent = <Reports />;
  } else {
    pageContent = (
      <div className="page-content">
        <section className="panel placeholder-page">
          <div className="empty-icon">
            <LayoutDashboard size={28} />
          </div>
          <h2>{activePage}</h2>
          <p>
            This module will be implemented in the next development stages.
          </p>
          <button
            className="primary-button"
            onClick={() => setActivePage("Dashboard")}
          >
            Return to Dashboard
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Landmark size={25} />
          </div>
          <div>
            <h2>BHCI Finance</h2>
            <p>Finance Management</p>
          </div>
          <button
            className="icon-button sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="nav-heading">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${
                activePage === label ? "nav-active" : ""
              }`}
              onClick={() => {
                setActivePage(label);
                setSidebarOpen(false);
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="church-badge">
            <div className="church-avatar">B</div>
            <div>
              <strong>BHCI Headquarters</strong>
              <p>Finance workspace</p>
            </div>
          </div>

          <button
            className={`nav-item ${
              activePage === "Settings" ? "nav-active" : ""
            }`}
            onClick={() => {
              setActivePage("Settings");
              setSidebarOpen(false);
            }}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>

          <button
            className="nav-item sign-out-button"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            <LogOut size={19} />
            <span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
          </button>

          <div className="security-note">
            <span className="status-dot" />
            Secure finance workspace
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button menu-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <div>
              <p className="eyebrow">BREAKTHROUGH HOLINESS CHURCH</p>
              <h1>{activePage}</h1>
            </div>
          </div>

          <div className="topbar-right">
            <span className="currency-badge">GH₵ GHS</span>
            <div className="profile-avatar">BH</div>
          </div>
        </header>

        {pageContent}
      </main>
    </div>
  );
}

export default App;

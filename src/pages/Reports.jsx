import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Wallet,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../lib/supabaseClient";
import "./Reports.css";

const GHANA_TIME_ZONE = "Africa/Accra";

function getLocalDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: GHANA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const result = {};
  parts.forEach((part) => {
    if (part.type !== "literal") result[part.type] = part.value;
  });

  return {
    year: Number(result.year),
    month: Number(result.month),
    day: Number(result.day),
  };
}

function formatDate(date) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: GHANA_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function getLatestSunday() {
  const { year, month, day } = getLocalDateParts();
  const today = new Date(Date.UTC(year, month - 1, day));
  const weekday = today.getUTCDay();

  today.setUTCDate(today.getUTCDate() - weekday);

  return today.toISOString().slice(0, 10);
}

function getMonthRange(year, month) {
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0))
    .toISOString()
    .slice(0, 10);

  return { firstDay, lastDay };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function sumAmounts(records = []) {
  return records.reduce(
    (total, record) => total + Number(record.amount || 0),
    0
  );
}

function getTotals(tithes, income, expenses) {
  const titheTotal = sumAmounts(tithes);
  const otherIncome = sumAmounts(income);
  const expenseTotal = sumAmounts(expenses);
  const grossIncome = titheTotal + otherIncome;

  return {
    tithes: titheTotal,
    otherIncome,
    expenses: expenseTotal,
    grossIncome,
    netIncome: grossIncome - expenseTotal,
  };
}

function getSundaysInMonth(year, month) {
  const sundays = [];
  const date = new Date(Date.UTC(year, month - 1, 1));

  while (date.getUTCMonth() === month - 1) {
    if (date.getUTCDay() === 0) {
      sundays.push(date.toISOString().slice(0, 10));
    }

    date.setUTCDate(date.getUTCDate() + 1);
  }

  return sundays;
}

function getErrorMessage(error) {
  if (!error) return "An unexpected error occurred.";
  return error.message || "Unable to load the report.";
}

export default function Reports() {
  const initialSunday = getLatestSunday();

  const [reportType, setReportType] = useState("weekly");
  const [selectedSunday, setSelectedSunday] = useState(initialSunday);
  const [selectedMonth, setSelectedMonth] = useState(
    initialSunday.slice(0, 7)
  );
  const [selectedYear, setSelectedYear] = useState(
    Number(initialSunday.slice(0, 4))
  );

  const [reportData, setReportData] = useState({
    tithes: [],
    income: [],
    expenses: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const reportTitle = useMemo(() => {
    if (reportType === "weekly") {
      return `Weekly Financial Report — ${formatDate(selectedSunday)}`;
    }

    if (reportType === "monthly") {
      const [year, month] = selectedMonth.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, 15));

      return `Monthly Financial Report — ${new Intl.DateTimeFormat("en-GB", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(date)}`;
    }

    return `Annual Financial Report — ${selectedYear}`;
  }, [reportType, selectedSunday, selectedMonth, selectedYear]);

  const fetchRecords = useCallback(async (column, startDate, endDate) => {
    const [tithesResult, incomeResult, expensesResult] = await Promise.all([
      supabase
        .from("tithe_records")
        .select(`
          id,
          member_id,
          amount,
          payment_date,
          payment_method,
          reference,
          notes,
          status,
          members(first_name, last_name, member_number)
        `)
        .eq("status", "Recorded")
        .gte(column === "payment_date" ? "payment_date" : "payment_date", startDate)
        .lte("payment_date", endDate)
        .order("payment_date", { ascending: true }),

      supabase
        .from("income_records")
        .select(`
          id,
          account_id,
          amount,
          income_date,
          description,
          payment_method,
          reference,
          status
        `)
        .eq("status", "Recorded")
        .gte("income_date", startDate)
        .lte("income_date", endDate)
        .order("income_date", { ascending: true }),

      supabase
        .from("expense_records")
        .select(`
          id,
          account_id,
          amount,
          expense_date,
          description,
          payment_method,
          recipient,
          reference,
          status
        `)
        .eq("status", "Recorded")
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .order("expense_date", { ascending: true }),
    ]);

    if (tithesResult.error) throw tithesResult.error;
    if (incomeResult.error) throw incomeResult.error;
    if (expensesResult.error) throw expensesResult.error;

    return {
      tithes: tithesResult.data || [],
      income: incomeResult.data || [],
      expenses: expensesResult.data || [],
    };
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      let startDate;
      let endDate;

      if (reportType === "weekly") {
        startDate = selectedSunday;
        endDate = selectedSunday;
      } else if (reportType === "monthly") {
        const [year, month] = selectedMonth.split("-").map(Number);
        const range = getMonthRange(year, month);
        startDate = range.firstDay;
        endDate = range.lastDay;
      } else {
        startDate = `${selectedYear}-01-01`;
        endDate = `${selectedYear}-12-31`;
      }

      const records = await fetchRecords("payment_date", startDate, endDate);

      setReportData(records);
      setLastUpdated(new Date());
    } catch (err) {
      setError(getErrorMessage(err));
      setReportData({ tithes: [], income: [], expenses: [] });
    } finally {
      setLoading(false);
    }
  }, [
    reportType,
    selectedSunday,
    selectedMonth,
    selectedYear,
    fetchRecords,
  ]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const totals = useMemo(
    () => getTotals(reportData.tithes, reportData.income, reportData.expenses),
    [reportData]
  );

  const sundayBreakdown = useMemo(() => {
    if (reportType !== "monthly") return [];

    const [year, month] = selectedMonth.split("-").map(Number);

    return getSundaysInMonth(year, month).map((sunday) => {
      const tithes = reportData.tithes.filter(
        (record) => record.payment_date === sunday
      );

      const income = reportData.income.filter(
        (record) => record.income_date === sunday
      );

      const expenses = reportData.expenses.filter(
        (record) => record.expense_date === sunday
      );

      return {
        date: sunday,
        ...getTotals(tithes, income, expenses),
      };
    });
  }, [reportType, selectedMonth, reportData]);

  const annualBreakdown = useMemo(() => {
    if (reportType !== "annual") return [];

    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const monthKey = `${selectedYear}-${String(month).padStart(2, "0")}`;

      const tithes = reportData.tithes.filter((record) =>
        record.payment_date.startsWith(monthKey)
      );

      const income = reportData.income.filter((record) =>
        record.income_date.startsWith(monthKey)
      );

      const expenses = reportData.expenses.filter((record) =>
        record.expense_date.startsWith(monthKey)
      );

      const date = new Date(Date.UTC(selectedYear, index, 15));

      return {
        month: new Intl.DateTimeFormat("en-GB", {
          month: "long",
          timeZone: "UTC",
        }).format(date),
        ...getTotals(tithes, income, expenses),
      };
    });
  }, [reportType, selectedYear, reportData]);

  const transactionRows = useMemo(() => {
    if (reportType !== "weekly") return [];

    const sundayRecords = reportData.tithes.filter(
      (record) => record.payment_date === selectedSunday
    );

    return sundayRecords
      .map((record) => ({
        id: record.id,
        date: record.payment_date,
        reference: record.reference || "No reference",
        member: record.members
          ? `${record.members.first_name || ""} ${record.members.last_name || ""}`.trim() || "Unknown member"
          : "Unknown member",
        amount: Number(record.amount || 0),
        type: "Tithe",
      }))
      .concat(
        reportData.income
          .filter((record) => record.income_date === selectedSunday)
          .map((record) => ({
            id: record.id,
            date: record.income_date,
            reference: record.reference || "No reference",
            member: record.account_id || "Income",
            amount: Number(record.amount || 0),
            type: "Income",
          }))
      )
      .concat(
        reportData.expenses
          .filter((record) => record.expense_date === selectedSunday)
          .map((record) => ({
            id: record.id,
            date: record.expense_date,
            reference: record.reference || "No reference",
            member: record.recipient || "Expense",
            amount: Number(record.amount || 0),
            type: "Expense",
          }))
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [reportType, selectedSunday, reportData]);

  const handleDownloadPdf = useCallback(async () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(reportTitle, 14, 18);
      doc.setFontSize(10);
      doc.text(`Updated: ${lastUpdated ? lastUpdated.toLocaleString() : "Not available"}`, 14, 28);

      const rows = [
        ["Type", "Description", "Amount", "Date"],
        ...transactionRows.map((row) => [
          row.type,
          row.reference,
          formatCurrency(row.amount),
          formatDate(row.date),
        ]),
      ];

      autoTable(doc, {
        head: [rows[0]],
        body: rows.slice(1),
        startY: 36,
      });

      doc.save(`bhci-report-${selectedSunday || selectedYear}.pdf`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [reportTitle, lastUpdated, transactionRows, selectedSunday, selectedYear]);

  return (
    <div className="bhci-reports">
      <header className="reports-header">
        <div>
          <span className="reports-eyebrow">FINANCE MANAGEMENT</span>
          <h1>Financial Reports</h1>
          <p>
            Review church income, tithes, expenses, and financial performance.
          </p>
        </div>

        <button
          className="reports-button reports-button-primary"
          onClick={handleDownloadPdf}
          disabled={loading || transactionRows.length === 0}
        >
          <Download size={18} />
          Export PDF
        </button>
      </header>

      <nav className="reports-tabs" aria-label="Report type">
        <button
          className={reportType === "weekly" ? "active" : ""}
          onClick={() => setReportType("weekly")}
        >
          <CalendarDays size={17} />
          Weekly
        </button>

        <button
          className={reportType === "monthly" ? "active" : ""}
          onClick={() => setReportType("monthly")}
        >
          <FileText size={17} />
          Monthly
        </button>

        <button
          className={reportType === "annual" ? "active" : ""}
          onClick={() => setReportType("annual")}
        >
          <TrendingUp size={17} />
          Annual
        </button>
      </nav>

      <section className="reports-filter">
        <div className="reports-filter-label">
          <CalendarDays size={19} />
          <div>
            <strong>Report period</strong>
            <span>Select the period you want to review.</span>
          </div>
        </div>

        {reportType === "weekly" && (
          <label className="reports-field">
            <span>Sunday date</span>
            <input
              type="date"
              value={selectedSunday}
              onChange={(event) => setSelectedSunday(event.target.value)}
            />
          </label>
        )}

        {reportType === "monthly" && (
          <label className="reports-field">
            <span>Month</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            />
          </label>
        )}

        {reportType === "annual" && (
          <label className="reports-field">
            <span>Year</span>
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
            >
              {Array.from({ length: 10 }, (_, index) => {
                const year = getLocalDateParts().year - index;

                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </label>
        )}

        <button
          className="reports-button reports-button-secondary"
          onClick={loadReport}
          disabled={loading}
        >
          <RefreshCw size={17} className={loading ? "reports-spin" : ""} />
          Refresh
        </button>
      </section>

      {error && (
        <div className="reports-error" role="alert">
          <AlertCircle size={20} />
          <div>
            <strong>Could not load report</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <section className="reports-summary">
        <article className="reports-stat">
          <div className="reports-stat-icon reports-icon-tithe">
            <Wallet size={21} />
          </div>
          <span>Tithes</span>
          <strong>{formatCurrency(totals.tithes)}</strong>
          <small>Recorded tithe contributions</small>
        </article>

        <article className="reports-stat">
          <div className="reports-stat-icon reports-icon-income">
            <TrendingUp size={21} />
          </div>
          <span>Other Income</span>
          <strong>{formatCurrency(totals.otherIncome)}</strong>
          <small>Income excluding tithes</small>
        </article>

        <article className="reports-stat">
          <div className="reports-stat-icon reports-icon-expense">
            <TrendingDown size={21} />
          </div>
          <span>Expenses</span>
          <strong>{formatCurrency(totals.expenses)}</strong>
          <small>Recorded expenditure</small>
        </article>

        <article className="reports-stat reports-stat-net">
          <div className="reports-stat-icon reports-icon-net">
            <FileText size={21} />
          </div>
          <span>Net Income</span>
          <strong>{formatCurrency(totals.netIncome)}</strong>
          <small>Gross income minus expenses</small>
        </article>
      </section>

      <section className="reports-main-card">
        <div className="reports-card-heading">
          <div>
            <span className="reports-eyebrow">FINANCIAL OVERVIEW</span>
            <h2>{reportTitle}</h2>
          </div>

          {lastUpdated && (
            <span className="reports-updated">
              Updated{" "}
              {lastUpdated.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>

        <div className="reports-income-banner">
          <div>
            <span>Gross Income</span>
            <strong>{formatCurrency(totals.grossIncome)}</strong>
            <small>Tithes + other income</small>
          </div>
          <div className="reports-income-banner-icon">
            <TrendingUp size={25} />
          </div>
        </div>

        {loading ? (
          <div className="reports-state">
            <RefreshCw size={25} className="reports-spin" />
            <p>Loading financial records...</p>
          </div>
        ) : (
          <>
            {reportType === "weekly" && (
              <div className="reports-table-wrap">
                <div className="reports-table-heading">
                  <h3>Sunday transactions</h3>
                  <span>{transactionRows.length} records</span>
                </div>

                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Reference</th>
                      <th>Member / Source</th>
                      <th className="reports-number">Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    {transactionRows.map((row) => (
                      <tr key={`${row.type}-${row.id}`}>
                        <td>{row.type}</td>
                        <td>{row.reference}</td>
                        <td>{row.member}</td>
                        <td className="reports-number reports-net-amount">
                          {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    ))}

                    {transactionRows.length === 0 && (
                      <tr>
                        <td colSpan="4" className="reports-empty">
                          No recorded transactions for this Sunday.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {reportType === "monthly" && (
              <div className="reports-table-wrap">
                <div className="reports-table-heading">
                  <h3>Sunday-by-Sunday breakdown</h3>
                  <span>{sundayBreakdown.length} Sundays</span>
                </div>

                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Sunday</th>
                      <th className="reports-number">Tithes</th>
                      <th className="reports-number">Other income</th>
                      <th className="reports-number">Expenses</th>
                      <th className="reports-number">Net income</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sundayBreakdown.map((row) => (
                      <tr key={row.date}>
                        <td>{formatDate(row.date)}</td>
                        <td className="reports-number">
                          {formatCurrency(row.tithes)}
                        </td>
                        <td className="reports-number">
                          {formatCurrency(row.otherIncome)}
                        </td>
                        <td className="reports-number">
                          {formatCurrency(row.expenses)}
                        </td>
                        <td className="reports-number reports-net-amount">
                          {formatCurrency(row.netIncome)}
                        </td>
                      </tr>
                    ))}

                    <tr className="reports-total-row">
                      <td>MONTH TOTAL</td>
                      <td className="reports-number">
                        {formatCurrency(totals.tithes)}
                      </td>
                      <td className="reports-number">
                        {formatCurrency(totals.otherIncome)}
                      </td>
                      <td className="reports-number">
                        {formatCurrency(totals.expenses)}
                      </td>
                      <td className="reports-number">
                        {formatCurrency(totals.netIncome)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {reportType === "annual" && (
              <div className="reports-table-wrap">
                <div className="reports-table-heading">
                  <h3>Monthly breakdown</h3>
                  <span>{selectedYear}</span>
                </div>

                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th className="reports-number">Tithes</th>
                      <th className="reports-number">Other income</th>
                      <th className="reports-number">Gross income</th>
                      <th className="reports-number">Expenses</th>
                      <th className="reports-number">Net income</th>
                    </tr>
                  </thead>

                  <tbody>
                    {annualBreakdown.map((row) => (
                      <tr key={row.month}>
                        <td>{row.month}</td>
                        <td className="reports-number">
                          {formatCurrency(row.tithes)}
                        </td>
                        <td className="reports-number">
                          {formatCurrency(row.otherIncome)}
                        </td>
                        <td className="reports-number">
                          {formatCurrency(row.grossIncome)}
                        </td>
                        <td className="reports-number">
                          {formatCurrency(row.expenses)}
                        </td>
                        <td className="reports-number reports-net-amount">
                          {formatCurrency(row.netIncome)}
                        </td>
                      </tr>
                    ))}

                    <tr className="reports-total-row">
                      <td>YEAR TOTAL</td>
                      <td className="reports-number">
                        {formatCurrency(totals.tithes)}
                      </td>
                      <td className="reports-number">
                        {formatCurrency(totals.otherIncome)}
                      </td>
                      <td className="reports-number">
                        {formatCurrency(totals.grossIncome)}
                      </td>
                      <td className="reports-number">
                        {formatCurrency(totals.expenses)}
                      </td>
                      <td className="reports-number">
                        {formatCurrency(totals.netIncome)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <footer className="reports-footer">
          <span>BHCI Finance Management System</span>
          <span>All amounts are in Ghana cedis (GHS).</span>
        </footer>
      </section>
    </div>
  );
}

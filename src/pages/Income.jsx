
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  RefreshCw,
  X,
  Wallet,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import "./Income.css";

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Mobile Money"];

const INITIAL_FORM = {
  account_id: "",
  amount: "",
  income_date: new Date().toISOString().slice(0, 10),
  payment_method: "Cash",
  reference: "",
  description: "",
  notes: "",
};

function formatMoney(value) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "—";

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Income() {
  const [records, setRecords] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [form, setForm] = useState(INITIAL_FORM);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [incomeResult, accountsResult] = await Promise.all([
        supabase
          .from("income_records")
          .select(`
            id,
            account_id,
            amount,
            income_date,
            payment_method,
            reference,
            description,
            notes,
            status,
            created_at,
            accounts (
              account_code,
              account_name
            )
          `)
          .order("income_date", { ascending: false }),

        supabase
          .from("accounts")
          .select("id, account_code, account_name")
          .eq("account_type", "Income")
          .eq("is_active", true)
          .order("account_code", { ascending: true }),
      ]);

      if (incomeResult.error) throw incomeResult.error;
      if (accountsResult.error) throw accountsResult.error;

      setRecords(incomeResult.data || []);
      setAccounts(accountsResult.data || []);
    } catch (err) {
      setError(err.message || "Could not load income records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const searchableText = [
        record.description,
        record.reference,
        record.payment_method,
        record.accounts?.account_name,
        record.accounts?.account_code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesStart =
        !startDate || record.income_date >= startDate;

      const matchesEnd =
        !endDate || record.income_date <= endDate;

      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [records, search, startDate, endDate]);

  const recordedRecords = filteredRecords.filter(
    (record) => record.status === "Recorded"
  );

  const totalIncome = recordedRecords.reduce(
    (sum, record) => sum + Number(record.amount || 0),
    0
  );

  const today = new Date().toISOString().slice(0, 10);

  const todayIncome = recordedRecords
    .filter((record) => record.income_date === today)
    .reduce((sum, record) => sum + Number(record.amount || 0), 0);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.account_id) {
      setError("Please select an income category.");
      return;
    }

    if (!form.description.trim()) {
      setError("Please enter a description.");
      return;
    }

    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      const { error: insertError } = await supabase
        .from("income_records")
        .insert({
          account_id: form.account_id,
          amount: Number(form.amount),
          income_date: form.income_date,
          payment_method: form.payment_method,
          reference: form.reference.trim() || null,
          description: form.description.trim(),
          notes: form.notes.trim() || null,
          recorded_by: user.id,
        });

      if (insertError) throw insertError;

      setForm({
        ...INITIAL_FORM,
        income_date: new Date().toISOString().slice(0, 10),
      });
      setShowForm(false);
      setSuccess("Income record saved successfully.");

      await loadData();
    } catch (err) {
      setError(err.message || "Could not save this income record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="income-page">
      <div className="income-heading">
        <div>
          <span className="income-eyebrow">FINANCIAL MANAGEMENT</span>
          <h1>Income Records</h1>
          <p>Record and review the church's income.</p>
        </div>

        <div className="income-heading-actions">
          <button
            type="button"
            className="income-button income-button-secondary"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            className="income-button income-button-primary"
            onClick={() => {
              setError("");
              setSuccess("");
              setShowForm(true);
            }}
          >
            <Plus size={18} />
            Record Income
          </button>
        </div>
      </div>

      {error && (
        <div className="income-alert income-alert-error" role="alert">
          {error}
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="income-alert income-alert-success" role="status">
          {success}
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setSuccess("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="income-summary-grid">
        <div className="income-summary-card">
          <div className="income-summary-icon">
            <Wallet size={21} />
          </div>
          <div>
            <span>Filtered Income Total</span>
            <h2>{formatMoney(totalIncome)}</h2>
            <small>Recorded entries only</small>
          </div>
        </div>

        <div className="income-summary-card">
          <div className="income-summary-icon">
            <CalendarDays size={21} />
          </div>
          <div>
            <span>Today's Income</span>
            <h2>{formatMoney(todayIncome)}</h2>
            <small>Based on today's date</small>
          </div>
        </div>

        <div className="income-summary-card">
          <div className="income-summary-icon">
            <TrendingUp size={21} />
          </div>
          <div>
            <span>Visible Records</span>
            <h2>{recordedRecords.length}</h2>
            <small>Matching your filters</small>
          </div>
        </div>
      </div>

      <section className="income-records-panel">
        <div className="income-panel-heading">
          <div>
            <h2>Income Transactions</h2>
            <p>Search by description, category, or reference.</p>
          </div>
        </div>

        <div className="income-filters">
          <div className="income-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search income..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <label className="income-date-filter">
            <span>From</span>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label className="income-date-filter">
            <span>To</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>

          <button
            type="button"
            className="income-clear-filters"
            onClick={() => {
              setSearch("");
              setStartDate("");
              setEndDate("");
            }}
          >
            Clear filters
          </button>
        </div>

        <div className="income-table-wrapper">
          <table className="income-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Payment Method</th>
                <th>Reference</th>
                <th>Status</th>
                <th className="income-amount-cell">Amount</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="income-empty-state">
                    Loading income records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" className="income-empty-state">
                    <Wallet size={26} />
                    <strong>No income records found</strong>
                    <span>Record income or adjust your search filters.</span>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.income_date)}</td>
                    <td>
                      <div className="income-description">
                        <strong>{record.description}</strong>
                        {record.notes && <small>{record.notes}</small>}
                      </div>
                    </td>
                    <td>
                      <div className="income-category">
                        <strong>
                          {record.accounts?.account_name || "Unknown category"}
                        </strong>
                        <small>{record.accounts?.account_code || "—"}</small>
                      </div>
                    </td>
                    <td>{record.payment_method}</td>
                    <td>{record.reference || "—"}</td>
                    <td>
                      <span
                        className={`income-status ${
                          record.status === "Voided"
                            ? "income-status-voided"
                            : "income-status-recorded"
                        }`}
                      >
                        {record.status || "Recorded"}
                      </span>
                    </td>
                    <td className="income-amount-cell">
                      <strong
                        className={
                          record.status === "Voided"
                            ? "income-voided-amount"
                            : ""
                        }
                      >
                        {formatMoney(record.amount)}
                      </strong>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="income-table-footer">
          Showing {filteredRecords.length} record
          {filteredRecords.length === 1 ? "" : "s"}
        </div>
      </section>

      {showForm && (
        <div
          className="income-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowForm(false);
            }
          }}
        >
          <section
            className="income-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="income-form-title"
          >
            <div className="income-modal-heading">
              <div>
                <span className="income-eyebrow">NEW TRANSACTION</span>
                <h2 id="income-form-title">Record Income</h2>
                <p>Enter the details of the money received.</p>
              </div>

              <button
                type="button"
                className="income-modal-close"
                onClick={() => setShowForm(false)}
                disabled={saving}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="income-form-grid">
                <label className="income-form-field">
                  <span>Income Category *</span>
                  <select
                    name="account_id"
                    value={form.account_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select category</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.account_code} — {account.account_name}
                      </option>
                    ))}
                  </select>
                  {accounts.length === 0 && (
                    <small>No active income accounts were found.</small>
                  )}
                </label>

                <label className="income-form-field">
                  <span>Amount (GHS) *</span>
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    required
                  />
                </label>

                <label className="income-form-field">
                  <span>Date Received *</span>
                  <input
                    name="income_date"
                    type="date"
                    value={form.income_date}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="income-form-field">
                  <span>Payment Method *</span>
                  <select
                    name="payment_method"
                    value={form.payment_method}
                    onChange={handleChange}
                    required
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="income-form-field income-form-field-full">
                  <span>Description *</span>
                  <input
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="e.g. Sunday offering"
                    maxLength="200"
                    required
                  />
                </label>

                <label className="income-form-field">
                  <span>Reference (optional)</span>
                  <input
                    name="reference"
                    value={form.reference}
                    onChange={handleChange}
                    placeholder="Receipt or transaction ID"
                    maxLength="100"
                  />
                </label>

                <label className="income-form-field">
                  <span>Notes (optional)</span>
                  <input
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Additional details"
                    maxLength="500"
                  />
                </label>
              </div>

              <div className="income-form-notice">
                Saving this form records the income transaction. It does not
                yet post a double-entry journal transaction.
              </div>

              <div className="income-form-actions">
                <button
                  type="button"
                  className="income-button income-button-secondary"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="income-button income-button-primary"
                  disabled={saving || accounts.length === 0}
                >
                  {saving ? "Saving..." : "Save Income"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

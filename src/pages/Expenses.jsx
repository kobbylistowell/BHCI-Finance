import { useEffect, useState } from "react";
import {
  Receipt,
  Plus,
  Search,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import "./Expenses.css";

const formatMoney = (amount) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));

const today = () => new Date().toISOString().slice(0, 10);

const initialForm = {
  account_id: "",
  amount: "",
  expense_date: today(),
  description: "",
  payment_method: "Cash",
  recipient: "",
  reference: "",
  notes: "",
};

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const [expenseResult, categoryResult] = await Promise.all([
      supabase
        .from("expense_records")
        .select(
          "id, account_id, amount, expense_date, description, payment_method, recipient, reference, notes, status, created_at, accounts(account_name, account_code)"
        )
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false }),

      supabase
        .from("accounts")
        .select("id, account_code, account_name")
        .order("account_code"),
    ]);

    if (expenseResult.error) {
      setError(`Could not load expenses: ${expenseResult.error.message}`);
    } else {
      setExpenses(expenseResult.data || []);
    }

    if (categoryResult.error) {
      setError(
        `Could not load expense categories: ${categoryResult.error.message}`
      );
    } else {
      const availableCategories = categoryResult.data || [];
      setCategories(availableCategories);

      setForm((current) => ({
        ...current,
        account_id:
          current.account_id || availableCategories[0]?.id || "",
      }));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.account_id) {
      setError("Please select an expense category.");
      return;
    }

    if (!form.description.trim()) {
      setError("Please enter a description.");
      return;
    }

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Your session could not be verified. Please sign in again.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("expense_records")
      .insert({
        account_id: form.account_id,
        amount,
        expense_date: form.expense_date,
        description: form.description.trim(),
        payment_method: form.payment_method,
        recipient: form.recipient.trim() || null,
        reference: form.reference.trim() || null,
        notes: form.notes.trim() || null,
        recorded_by: user.id,
      });

    if (insertError) {
      setError(`Could not save expense: ${insertError.message}`);
      setSaving(false);
      return;
    }

    setSuccess("Expense recorded successfully.");
    setForm({
      ...initialForm,
      expense_date: today(),
      account_id: categories[0]?.id || "",
    });
    setShowForm(false);
    setSaving(false);

    await loadData();
  }

  const visibleExpenses = expenses.filter((expense) => {
    const term = search.trim().toLowerCase();

    const matchesSearch =
      !term ||
      expense.description?.toLowerCase().includes(term) ||
      expense.recipient?.toLowerCase().includes(term) ||
      expense.reference?.toLowerCase().includes(term) ||
      expense.accounts?.account_name?.toLowerCase().includes(term);

    const matchesStart =
      !startDate || expense.expense_date >= startDate;

    const matchesEnd =
      !endDate || expense.expense_date <= endDate;

    return matchesSearch && matchesStart && matchesEnd;
  });

  const total = visibleExpenses.reduce(
    (sum, expense) =>
      expense.status === "Voided" ? sum : sum + Number(expense.amount || 0),
    0
  );

  const activeCount = visibleExpenses.filter(
    (expense) => expense.status !== "Voided"
  ).length;

  return (
    <section className="expense-page">
      <div className="expense-page-header">
        <div>
          <p className="expense-eyebrow">FINANCIAL MANAGEMENT</p>
          <h1>Expenses</h1>
          <p className="expense-subtitle">
            Record and review church expenditure.
          </p>
        </div>

        <div className="expense-header-actions">
          <button
            type="button"
            className="expense-button expense-button-secondary"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            className="expense-button expense-button-primary"
            onClick={() => {
              setError("");
              setSuccess("");
              setShowForm((current) => !current);
            }}
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? "Close form" : "Record expense"}
          </button>
        </div>
      </div>

      {error && (
        <div className="expense-alert expense-alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="expense-alert expense-alert-success" role="status">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      <div className="expense-summary-grid">
        <article className="expense-summary-card">
          <div className="expense-summary-icon">
            <Receipt size={21} />
          </div>
          <p>Total expenses in view</p>
          <h2>{formatMoney(total)}</h2>
          <span>Excludes voided records</span>
        </article>

        <article className="expense-summary-card">
          <div className="expense-summary-icon">
            <CheckCircle2 size={21} />
          </div>
          <p>Recorded transactions</p>
          <h2>{activeCount}</h2>
          <span>Based on the current filters</span>
        </article>
      </div>

      {showForm && (
        <div className="expense-panel">
          <div className="expense-panel-heading">
            <div>
              <h2>Record a new expense</h2>
              <p>Enter the details of the church payment.</p>
            </div>
          </div>

          {categories.length === 0 && (
            <div className="expense-alert expense-alert-error">
              <AlertCircle size={18} />
              <span>
                No active expense categories were found. Check the Expense
                accounts in your Supabase accounts table.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="expense-form">
            <label>
              Expense category *
              <select
                name="account_id"
                value={form.account_id}
                onChange={updateField}
                required
                disabled={categories.length === 0}
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.account_code} — {category.account_name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Amount (GHS) *
              <input
                type="number"
                name="amount"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={updateField}
                placeholder="0.00"
                required
              />
            </label>

            <label>
              Expense date *
              <input
                type="date"
                name="expense_date"
                value={form.expense_date}
                onChange={updateField}
                max={today()}
                required
              />
            </label>

            <label>
              Payment method *
              <select
                name="payment_method"
                value={form.payment_method}
                onChange={updateField}
                required
              >
                <option>Cash</option>
                <option>Bank Transfer</option>
                <option>Mobile Money</option>
                <option>Cheque</option>
                <option>Card</option>
                <option>Other</option>
              </select>
            </label>

            <label className="expense-field-full">
              Description *
              <input
                type="text"
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="e.g. Electricity bill for the church"
                maxLength={250}
                required
              />
            </label>

            <label>
              Recipient / supplier
              <input
                type="text"
                name="recipient"
                value={form.recipient}
                onChange={updateField}
                placeholder="Who received the payment?"
                maxLength={150}
              />
            </label>

            <label>
              Receipt / reference number
              <input
                type="text"
                name="reference"
                value={form.reference}
                onChange={updateField}
                placeholder="Optional reference"
                maxLength={100}
              />
            </label>

            <label className="expense-field-full">
              Notes
              <textarea
                name="notes"
                value={form.notes}
                onChange={updateField}
                placeholder="Additional details (optional)"
                rows={3}
                maxLength={1000}
              />
            </label>

            <div className="expense-form-actions expense-field-full">
              <button
                type="button"
                className="expense-button expense-button-secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="expense-button expense-button-primary"
                disabled={saving || categories.length === 0}
              >
                {saving ? "Saving..." : "Save expense"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="expense-panel">
        <div className="expense-list-heading">
          <div>
            <h2>Expense records</h2>
            <p>Search and filter recorded transactions.</p>
          </div>
        </div>

        <div className="expense-filters">
          <div className="expense-search">
            <Search size={18} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search description, category or recipient"
              aria-label="Search expenses"
            />
          </div>

          <label>
            From
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label>
            To
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>

        {loading ? (
          <div className="expense-empty">Loading expenses...</div>
        ) : visibleExpenses.length === 0 ? (
          <div className="expense-empty">
            <Receipt size={32} />
            <h3>No expenses found</h3>
            <p>
              Record an expense or adjust your search and date filters.
            </p>
          </div>
        ) : (
          <div className="expense-table-wrap">
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Payment</th>
                  <th>Recipient</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      {expense.expense_date
                        ? new Date(
                            `${expense.expense_date}T00:00:00`
                          ).toLocaleDateString("en-GB")
                        : "—"}
                    </td>
                    <td>
                      <strong>{expense.description}</strong>
                      {expense.reference && (
                        <small>Ref: {expense.reference}</small>
                      )}
                    </td>
                    <td>
                      {expense.accounts?.account_name || "Uncategorised"}
                    </td>
                    <td>{expense.payment_method}</td>
                    <td>{expense.recipient || "—"}</td>
                    <td className="expense-amount">
                      {formatMoney(expense.amount)}
                    </td>
                    <td>
                      <span
                        className={`expense-status ${
                          expense.status === "Voided"
                            ? "expense-status-voided"
                            : "expense-status-recorded"
                        }`}
                      >
                        {expense.status || "Recorded"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="expense-list-footer">
          Showing {visibleExpenses.length} of {expenses.length} records
        </div>
      </div>
    </section>
  );
}

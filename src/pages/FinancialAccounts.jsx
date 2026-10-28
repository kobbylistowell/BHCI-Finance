import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Landmark,
  Smartphone,
  Plus,
  RefreshCw,
  Search,
  Pencil,
  X,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import "./FinancialAccounts.css";

const ACCOUNT_TYPES = ["Cash", "Bank", "Mobile Money"];

const money = (amount) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(Number(amount || 0));

const emptyForm = {
  account_name: "",
  account_code: "",
  account_type: "Cash",
  current_balance: "0",
};

function getType(account) {
  const value = `${account.account_type || ""} ${
    account.account_name || ""
  }`.toLowerCase();

  if (value.includes("momo") || value.includes("mobile")) {
    return "Mobile Money";
  }

  if (value.includes("bank") || value.includes("savings")) {
    return "Bank";
  }

  if (value.includes("cash")) return "Cash";

  return account.account_type || "Cash";
}

function AccountIcon({ type, size = 22 }) {
  if (type === "Bank") return <Landmark size={size} />;
  if (type === "Mobile Money") return <Smartphone size={size} />;
  return <Wallet size={size} />;
}

export default function FinancialAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  async function loadAccounts() {
    setLoading(true);
    setError("");

    try {
      const { data, error: queryError } = await supabase
        .from("accounts")
        .select(
          "id, account_name, account_type, current_balance, account_code"
        )
        .order("account_name", { ascending: true });

      if (queryError) throw queryError;

      setAccounts(data || []);
    } catch (err) {
      setError(err.message || "Unable to load financial accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  const totals = useMemo(() => {
    return accounts.reduce(
      (result, account) => {
        const type = getType(account);
        const balance = Number(account.current_balance || 0);

        result.total += balance;

        if (type === "Bank") result.bank += balance;
        else if (type === "Mobile Money") result.momo += balance;
        else if (type === "Cash") result.cash += balance;

        return result;
      },
      { total: 0, bank: 0, momo: 0, cash: 0 }
    );
  }, [accounts]);

  const filteredAccounts = accounts.filter((account) =>
    `${account.account_name} ${account.account_code || ""} ${
      account.account_type || ""
    }`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function openNewAccount() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
  }

  function openEditAccount(account) {
    setEditingId(account.id);
    setForm({
      account_name: account.account_name || "",
      account_code: account.account_code || "",
      account_type: getType(account),
      current_balance: String(account.current_balance ?? 0),
    });
    setShowForm(true);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const balance = Number(form.current_balance);

    if (!form.account_name.trim()) {
      setError("Enter an account name.");
      return;
    }

    if (!Number.isFinite(balance) || balance < 0) {
      setError("Enter a valid non-negative balance.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        account_name: form.account_name.trim(),
        account_code: form.account_code.trim() || null,
        account_type: form.account_type,
        current_balance: balance,
      };

      const result = editingId
        ? await supabase
            .from("accounts")
            .update(payload)
            .eq("id", editingId)
        : await supabase.from("accounts").insert(payload);

      if (result.error) throw result.error;

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);

      await loadAccounts();
    } catch (err) {
      setError(err.message || "Unable to save this account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="fa-page">
      <header className="fa-heading">
        <div>
          <p className="fa-eyebrow">BHCI FINANCE MANAGEMENT</p>
          <h1>Financial Accounts</h1>
          <p className="fa-subtitle">
            Monitor church cash, bank and Mobile Money balances.
          </p>
        </div>

        <button className="fa-primary-btn" onClick={openNewAccount}>
          <Plus size={18} />
          Add account
        </button>
      </header>

      {error && (
        <div className="fa-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <section className="fa-summary-grid">
        <article className="fa-summary-card fa-total-card">
          <div className="fa-card-icon">
            <Wallet size={22} />
          </div>
          <p>Total funds</p>
          <h2>{loading ? "Loading…" : money(totals.total)}</h2>
          <span>{accounts.length} registered accounts</span>
        </article>

        <article className="fa-summary-card">
          <div className="fa-card-icon fa-bank-icon">
            <Landmark size={22} />
          </div>
          <p>Bank balance</p>
          <h2>{loading ? "Loading…" : money(totals.bank)}</h2>
          <span>Church bank accounts</span>
        </article>

        <article className="fa-summary-card">
          <div className="fa-card-icon fa-momo-icon">
            <Smartphone size={22} />
          </div>
          <p>MoMo balance</p>
          <h2>{loading ? "Loading…" : money(totals.momo)}</h2>
          <span>Church Mobile Money accounts</span>
        </article>

        <article className="fa-summary-card">
          <div className="fa-card-icon fa-cash-icon">
            <Wallet size={22} />
          </div>
          <p>Cash in hand</p>
          <h2>{loading ? "Loading…" : money(totals.cash)}</h2>
          <span>Physical church cash</span>
        </article>
      </section>

      <section className="fa-panel">
        <div className="fa-panel-heading">
          <div>
            <h2>Account overview</h2>
            <p>Manage your registered financial accounts.</p>
          </div>

          <button
            className="fa-refresh-btn"
            onClick={loadAccounts}
            disabled={loading}
            title="Refresh balances"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="fa-toolbar">
          <div className="fa-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search accounts..."
              aria-label="Search accounts"
            />
          </div>
        </div>

        <div className="fa-table-wrap">
          <table className="fa-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Code</th>
                <th>Type</th>
                <th>Current balance</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {!loading && filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan="5" className="fa-empty">
                    No accounts found. Add your first account to get started.
                  </td>
                </tr>
              )}

              {filteredAccounts.map((account) => {
                const type = getType(account);

                return (
                  <tr key={account.id}>
                    <td>
                      <div className="fa-account-name">
                        <span className={`fa-account-icon ${type.toLowerCase().replace(" ", "-")}`}>
                          <AccountIcon type={type} />
                        </span>
                        <strong>{account.account_name}</strong>
                      </div>
                    </td>
                    <td>{account.account_code || "—"}</td>
                    <td>
                      <span className="fa-type-pill">{type}</span>
                    </td>
                    <td className="fa-balance">
                      {money(account.current_balance)}
                    </td>
                    <td>
                      <button
                        className="fa-edit-btn"
                        onClick={() => openEditAccount(account)}
                        aria-label={`Edit ${account.account_name}`}
                      >
                        <Pencil size={15} />
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}

              {loading && (
                <tr>
                  <td colSpan="5" className="fa-empty">
                    Loading accounts…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div
          className="fa-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowForm(false);
            }
          }}
        >
          <section
            className="fa-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fa-modal-title"
          >
            <div className="fa-modal-heading">
              <div>
                <p className="fa-eyebrow">ACCOUNT MANAGEMENT</p>
                <h2 id="fa-modal-title">
                  {editingId ? "Edit account" : "Add financial account"}
                </h2>
              </div>

              <button
                className="fa-close-btn"
                onClick={() => setShowForm(false)}
                disabled={saving}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="fa-form">
              <label>
                Account name
                <input
                  value={form.account_name}
                  onChange={(event) =>
                    setForm({ ...form, account_name: event.target.value })
                  }
                  placeholder="e.g. BHCI Main Bank Account"
                  required
                />
              </label>

              <label>
                Account type
                <select
                  value={form.account_type}
                  onChange={(event) =>
                    setForm({ ...form, account_type: event.target.value })
                  }
                >
                  {ACCOUNT_TYPES.map((type) => (
                    <option value={type} key={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Account code (optional)
                <input
                  value={form.account_code}
                  onChange={(event) =>
                    setForm({ ...form, account_code: event.target.value })
                  }
                  placeholder="e.g. BANK-001"
                />
              </label>

              <label>
                Current / opening balance (GHS)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.current_balance}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      current_balance: event.target.value,
                    })
                  }
                  required
                />
                <small>
                  This field currently sets the stored balance. Automatic
                  transaction-based updates require the account links described
                  below.
                </small>
              </label>

              <div className="fa-modal-actions">
                <button
                  type="button"
                  className="fa-cancel-btn"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="fa-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving…"
                    : editingId
                    ? "Save changes"
                    : "Create account"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

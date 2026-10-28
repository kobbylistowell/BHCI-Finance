
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  RefreshCw,
  X,
  Coins,
  CalendarDays,
  Users,
  Ban,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import "./Tithes.css";

const createInitialForm = () => ({
  member_id: "",
  amount: "",
  payment_date: new Date().toISOString().slice(0, 10),
  payment_method: "Cash",
  reference: "",
  notes: "",
});

const currency = (amount) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(Number(amount || 0));

const displayDate = (date) => {
  if (!date) return "—";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function Tithes() {
  const [records, setRecords] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(createInitialForm);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");

    try {
      const [membersResult, tithesResult] = await Promise.all([
        supabase
          .from("members")
          .select("id, member_number, first_name, last_name")
          .order("first_name"),

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
            created_at,
            status,
            voided_at,
            voided_by,
            void_reason,
            members (
              member_number,
              first_name,
              last_name
            )
          `)
          .order("payment_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (membersResult.error) throw membersResult.error;
      if (tithesResult.error) throw tithesResult.error;

      setMembers(membersResult.data || []);
      setRecords(tithesResult.data || []);
    } catch (err) {
      setError(err.message || "Unable to load tithe records.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();

    return records.filter((record) => {
      const member = record.members;
      const fullName = member
        ? `${member.first_name} ${member.last_name}`.toLowerCase()
        : "";

      const memberNumber = String(member?.member_number ?? "");
      const reference = String(record.reference || "").toLowerCase();

      const matchesSearch =
        !term ||
        fullName.includes(term) ||
        memberNumber.includes(term) ||
        reference.includes(term) ||
        record.payment_method.toLowerCase().includes(term);

      const matchesStart =
        !startDate || record.payment_date >= startDate;

      const matchesEnd =
        !endDate || record.payment_date <= endDate;

      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [records, search, startDate, endDate]);

  const totalCollected = filteredRecords.reduce(
    (sum, record) =>
      record.status === "Voided"
        ? sum
        : sum + Number(record.amount || 0),
    0
  );

  const activeRecords = filteredRecords.filter(
    (record) => record.status !== "Voided"
  );

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const amount = Number(form.amount);

    if (!form.member_id) {
      setError("Please select a church member.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    if (!form.payment_date) {
      setError("Please select a payment date.");
      return;
    }

    setSaving(true);

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) throw userError;

      if (!userData.user) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const { error: insertError } = await supabase
        .from("tithe_records")
        .insert({
          member_id: form.member_id,
          amount,
          payment_date: form.payment_date,
          payment_method: form.payment_method,
          reference: form.reference.trim() || null,
          notes: form.notes.trim() || null,
          recorded_by: userData.user.id,
        });

      if (insertError) throw insertError;

      setForm(createInitialForm());
      setShowForm(false);
      setSuccess("Tithe record saved successfully.");

      await loadData(false);
    } catch (err) {
      setError(err.message || "Could not save the tithe record.");
    } finally {
      setSaving(false);
    }
  }

  async function handleVoid(event) {
    event.preventDefault();

    if (!voidTarget) return;

    const reason = voidReason.trim();

    if (reason.length < 5) {
      setError("Please provide a reason of at least 5 characters.");
      return;
    }

    setVoiding(true);
    setError("");
    setSuccess("");

    try {
      const { error: voidError } = await supabase.rpc(
        "void_tithe_record",
        {
          p_tithe_id: voidTarget.id,
          p_reason: reason,
        }
      );

      if (voidError) throw voidError;

      setVoidTarget(null);
      setVoidReason("");
      setSuccess("Tithe record voided. The original record is preserved.");

      await loadData(false);
    } catch (err) {
      setError(err.message || "Unable to void this tithe record.");
    } finally {
      setVoiding(false);
    }
  }

  function openVoidDialog(record) {
    setError("");
    setSuccess("");
    setVoidReason("");
    setVoidTarget(record);
  }

  return (
    <div className="tithes-page">
      <header className="tithes-heading">
        <div>
          <span className="tithes-eyebrow">FINANCIAL MANAGEMENT</span>
          <h1>Tithe Records</h1>
          <p>Record, review, and manage tithes received by the church.</p>
        </div>

        <button
          type="button"
          className="tithes-primary-btn"
          onClick={() => {
            setError("");
            setSuccess("");
            setForm(createInitialForm());
            setShowForm(true);
          }}
        >
          <Plus size={18} />
          Record Tithe
        </button>
      </header>

      {error && (
        <div className="tithes-alert tithes-alert-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="tithes-alert tithes-alert-success" role="status">
          {success}
        </div>
      )}

      <section className="tithes-stats">
        <article className="tithes-stat-card">
          <div className="tithes-stat-icon">
            <Coins size={21} />
          </div>
          <span>Total collected in results</span>
          <strong>{currency(totalCollected)}</strong>
        </article>

        <article className="tithes-stat-card">
          <div className="tithes-stat-icon">
            <CalendarDays size={21} />
          </div>
          <span>Recorded transactions</span>
          <strong>{activeRecords.length}</strong>
        </article>

        <article className="tithes-stat-card">
          <div className="tithes-stat-icon">
            <Users size={21} />
          </div>
          <span>Members available</span>
          <strong>{members.length}</strong>
        </article>
      </section>

      <section className="tithes-panel">
        <div className="tithes-toolbar">
          <div className="tithes-search">
            <Search size={18} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search member, number, reference..."
              aria-label="Search tithe records"
            />
          </div>

          <label className="tithes-date-filter">
            <span>From</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              aria-label="Filter from date"
            />
          </label>

          <label className="tithes-date-filter">
            <span>To</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
              aria-label="Filter to date"
            />
          </label>

          <button
            type="button"
            className="tithes-icon-btn"
            onClick={() => loadData()}
            disabled={loading}
            title="Refresh records"
            aria-label="Refresh records"
          >
            <RefreshCw size={17} />
          </button>
        </div>

        <div className="tithes-results-summary">
          Showing {filteredRecords.length} record
          {filteredRecords.length === 1 ? "" : "s"}
          {filteredRecords.some((record) => record.status === "Voided") &&
            " (including voided records)"}
        </div>

        <div className="tithes-table-wrap">
          <table className="tithes-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Date</th>
                <th>Method</th>
                <th>Reference</th>
                <th className="tithes-amount">Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="tithes-empty">
                    Loading tithe records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="tithes-empty">
                    <Coins size={30} />
                    <strong>No tithe records found</strong>
                    <span>
                      Try another search or date range, or record a new tithe.
                    </span>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const isVoided = record.status === "Voided";

                  return (
                    <tr
                      key={record.id}
                      className={isVoided ? "tithes-row-voided" : ""}
                    >
                      <td>
                        <strong>
                          {record.members
                            ? `${record.members.first_name} ${record.members.last_name}`
                            : "Unknown member"}
                        </strong>
                        <small>
                          Member #
                          {record.members?.member_number ?? "—"}
                        </small>
                      </td>

                      <td>{displayDate(record.payment_date)}</td>
                      <td>{record.payment_method}</td>
                      <td>{record.reference || "—"}</td>

                      <td className="tithes-amount">
                        <strong>{currency(record.amount)}</strong>
                      </td>

                      <td>
                        <span
                          className={`tithes-status ${
                            isVoided ? "voided" : "recorded"
                          }`}
                        >
                          {isVoided ? "Voided" : "Recorded"}
                        </span>

                        {isVoided && record.void_reason && (
                          <small
                            className="tithes-void-reason"
                            title={record.void_reason}
                          >
                            Reason: {record.void_reason}
                          </small>
                        )}
                      </td>

                      <td>
                        {isVoided ? (
                          <span className="tithes-action-muted">No action</span>
                        ) : (
                          <button
                            type="button"
                            className="tithes-void-btn"
                            onClick={() => openVoidDialog(record)}
                            title="Void this tithe record"
                          >
                            <Ban size={15} />
                            Void
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div
          className="tithes-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowForm(false);
            }
          }}
        >
          <section
            className="tithes-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tithes-form-title"
          >
            <div className="tithes-modal-heading">
              <div>
                <span className="tithes-eyebrow">NEW TRANSACTION</span>
                <h2 id="tithes-form-title">Record a Tithe</h2>
              </div>

              <button
                type="button"
                className="tithes-icon-btn"
                onClick={() => setShowForm(false)}
                disabled={saving}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            {members.length === 0 && !loading && (
              <div className="tithes-alert tithes-alert-error">
                No members are available. Add a member before recording a tithe.
              </div>
            )}

            <form onSubmit={handleSubmit} className="tithes-form">
              <label>
                Church Member *
                <select
                  name="member_id"
                  value={form.member_id}
                  onChange={updateField}
                  required
                >
                  <option value="">Select a member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.member_number
                        ? `#${member.member_number} — `
                        : ""}
                      {member.first_name} {member.last_name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="tithes-form-grid">
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
                  Payment Date *
                  <input
                    type="date"
                    name="payment_date"
                    value={form.payment_date}
                    onChange={updateField}
                    required
                  />
                </label>
              </div>

              <label>
                Payment Method *
                <select
                  name="payment_method"
                  value={form.payment_method}
                  onChange={updateField}
                  required
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Mobile Money">Mobile Money</option>
                </select>
              </label>

              <label>
                Reference (optional)
                <input
                  name="reference"
                  value={form.reference}
                  onChange={updateField}
                  maxLength={100}
                  placeholder="Receipt or transaction reference"
                />
              </label>

              <label>
                Notes (optional)
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={updateField}
                  rows={3}
                  maxLength={1000}
                  placeholder="Additional details"
                />
              </label>

              <div className="tithes-form-actions">
                <button
                  type="button"
                  className="tithes-secondary-btn"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="tithes-primary-btn"
                  disabled={saving || members.length === 0}
                >
                  {saving ? "Saving..." : "Save Tithe"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {voidTarget && (
        <div
          className="tithes-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !voiding) {
              setVoidTarget(null);
            }
          }}
        >
          <section
            className="tithes-modal tithes-void-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="void-tithe-title"
          >
            <div className="tithes-modal-heading">
              <div>
                <span className="tithes-eyebrow">RECORD CORRECTION</span>
                <h2 id="void-tithe-title">Void Tithe Record</h2>
              </div>

              <button
                type="button"
                className="tithes-icon-btn"
                onClick={() => setVoidTarget(null)}
                disabled={voiding}
                aria-label="Close void dialog"
              >
                <X size={20} />
              </button>
            </div>

            <div className="tithes-void-warning">
              <Ban size={20} />
              <p>
                This record will be marked as voided, not deleted. It will
                remain visible for auditing and will be excluded from the
                collected-tithes total.
              </p>
            </div>

            <div className="tithes-void-summary">
              <span>
                {voidTarget.members
                  ? `${voidTarget.members.first_name} ${voidTarget.members.last_name}`
                  : "Unknown member"}
              </span>
              <strong>{currency(voidTarget.amount)}</strong>
              <small>{displayDate(voidTarget.payment_date)}</small>
            </div>

            <form onSubmit={handleVoid} className="tithes-form">
              <label>
                Reason for voiding *
                <textarea
                  value={voidReason}
                  onChange={(event) => setVoidReason(event.target.value)}
                  rows={4}
                  minLength={5}
                  maxLength={500}
                  placeholder="Explain why this transaction must be voided..."
                  required
                />
              </label>

              <div className="tithes-form-actions">
                <button
                  type="button"
                  className="tithes-secondary-btn"
                  onClick={() => setVoidTarget(null)}
                  disabled={voiding}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="tithes-danger-btn"
                  disabled={voiding || voidReason.trim().length < 5}
                >
                  {voiding ? "Voiding..." : "Confirm Void"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

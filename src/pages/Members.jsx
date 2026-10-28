import { useEffect, useMemo, useState } from "react";
import {
  Search,
  UserPlus,
  Users,
  Pencil,
  RefreshCw,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import "../App.css";
import "./Members.css";

const emptyForm = {
  first_name: "",
  last_name: "",
  phone: "",
  gender: "",
  branch: "Headquarters",
  date_joined: new Date().toISOString().slice(0, 10),
  status: "Active",
};

export default function Members() {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  async function loadMembers() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("members")
      .select(
        "id, member_number, first_name, last_name, phone, gender, branch, date_joined, status"
      )
      .order("member_number", { ascending: true });

    if (error) {
      setError(error.message);
      setMembers([]);
    } else {
      setMembers(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return members;

    return members.filter((member) =>
      [
        member.member_number,
        member.first_name,
        member.last_name,
        member.phone,
        member.branch,
        member.status,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      )
    );
  }, [members, search]);

  function openNewForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(member) {
    setEditingId(member.id);
    setForm({
      first_name: member.first_name ?? "",
      last_name: member.last_name ?? "",
      phone: member.phone ?? "",
      gender: member.gender ?? "",
      branch: member.branch ?? "Headquarters",
      date_joined:
        member.date_joined ?? new Date().toISOString().slice(0, 10),
      status: member.status ?? "Active",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim() || null,
        gender: form.gender || null,
        branch: form.branch.trim() || "Headquarters",
        date_joined: form.date_joined,
        status: form.status,
      };

      const result = editingId
        ? await supabase
            .from("members")
            .update(payload)
            .eq("id", editingId)
            .select()
        : await supabase
            .from("members")
            .insert(payload)
            .select();

      if (result.error) throw result.error;

      if (!result.data?.length) {
        throw new Error(
          "No record was returned. Check your database permissions."
        );
      }

      setSuccess(editingId ? "Member updated." : "Member registered.");
      setShowForm(false);
      await loadMembers();
    } catch (err) {
      setError(err.message || "Could not save the member.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-content members-page">
      <section className="welcome-row">
        <div>
          <h2>Member Directory</h2>
          <p>Register and manage BHCI member records.</p>
        </div>

        <button className="primary-button" onClick={openNewForm}>
          <UserPlus size={17} />
          Add Member
        </button>
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <div className="card-top">
            <span className="metric-icon blue">
              <Users size={21} />
            </span>
          </div>
          <p className="metric-title">Total Members</p>
          <h3>{members.length}</h3>
          <p className="metric-note">Loaded member records</p>
        </article>

        <article className="summary-card">
          <div className="card-top">
            <span className="metric-icon green">
              <Users size={21} />
            </span>
          </div>
          <p className="metric-title">Active Members</p>
          <h3>{members.filter((m) => m.status === "Active").length}</h3>
          <p className="metric-note">Currently active</p>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>All Members</h2>
            <p>Search by name, member number, phone, branch, or status.</p>
          </div>
          <button
            className="icon-button"
            onClick={loadMembers}
            disabled={loading}
            aria-label="Refresh members"
            title="Refresh members"
          >
            <RefreshCw size={19} />
          </button>
        </div>

        <label className="member-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search members..."
          />
        </label>

        {error && <p className="members-message error">{error}</p>}
        {success && <p className="members-message success">{success}</p>}

        {loading ? (
          <div className="members-empty">Loading members...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="members-empty">
            {search
              ? "No members match your search."
              : "No member records found. Add your first member to begin."}
          </div>
        ) : (
          <div className="members-table-wrap">
            <table className="members-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Phone</th>
                  <th>Branch</th>
                  <th>Date joined</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <strong>
                        {member.first_name} {member.last_name}
                      </strong>
                      <span className="member-number">
                        #{member.member_number ?? "—"}
                      </span>
                    </td>
                    <td>{member.phone || "—"}</td>
                    <td>{member.branch || "Headquarters"}</td>
                    <td>{member.date_joined || "—"}</td>
                    <td>
                      <span
                        className={`member-status ${
                          member.status === "Active"
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="edit-member-button"
                        onClick={() => openEditForm(member)}
                        aria-label={`Edit ${member.first_name}`}
                        title="Edit member"
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <div className="member-modal-overlay">
          <section
            className="member-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-form-title"
          >
            <div className="panel-heading">
              <div>
                <h2 id="member-form-title">
                  {editingId ? "Edit Member" : "Register Member"}
                </h2>
                <p>Enter the member's details below.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="member-form">
              <label>
                First name *
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={updateField}
                  required
                  maxLength={100}
                />
              </label>

              <label>
                Last name *
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={updateField}
                  required
                  maxLength={100}
                />
              </label>

              <label>
                Phone number
                <input
                  name="phone"
                  value={form.phone}
                  onChange={updateField}
                  maxLength={30}
                />
              </label>

              <label>
                Gender
                <select
                  name="gender"
                  value={form.gender}
                  onChange={updateField}
                >
                  <option value="">Not specified</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>

              <label>
                Branch *
                <input
                  name="branch"
                  value={form.branch}
                  onChange={updateField}
                  required
                  maxLength={150}
                />
              </label>

              <label>
                Date joined *
                <input
                  type="date"
                  name="date_joined"
                  value={form.date_joined}
                  onChange={updateField}
                  required
                />
              </label>

              {editingId && (
                <label>
                  Status
                  <select
                    name="status"
                    value={form.status}
                    onChange={updateField}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Transferred">Transferred</option>
                  </select>
                </label>
              )}

              {error && <p className="members-message error">{error}</p>}

              <div className="member-form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Save Changes"
                    : "Register Member"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

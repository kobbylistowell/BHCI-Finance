import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./ResetPassword.css";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function initializeReset() {
      const hash = window.location.hash || "";
      const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const tokenType = params.get("type");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setMessage(error.message || "This reset link is invalid or expired.");
          setReady(false);
          return;
        }
      }

      if (tokenType === "recovery" || accessToken || refreshToken) {
        setReady(true);
        return;
      }

      setMessage("This password reset link is invalid or has expired.");
      setReady(false);
    }

    initializeReset();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message || "Unable to update your password.");
      return;
    }

    setMessage("Password updated successfully. Redirecting to login...");

    setTimeout(() => {
      window.location.assign("/");
    }, 1500);
  }

  return (
    <main className="reset-password-page">
      <section className="reset-password-card">
        <h1>Set a new password</h1>
        <p>Choose a strong password for your BHCI Finance account.</p>

        {message && <p className="reset-message">{message}</p>}

        {ready ? (
          <form onSubmit={handleSubmit} className="reset-password-form">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <label htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="reset-back-button"
            onClick={() => window.location.assign("/")}
          >
            Back to login
          </button>
        )}
      </section>
    </main>
  );
}

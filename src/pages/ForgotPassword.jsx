import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./ForgotPassword.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("If your account exists, a password reset email will be sent.");
    }
  }

  return (
    <main className="forgot-password">
      <h1>Reset your password</h1>
      <p>Enter the email address associated with your account.</p>

      <form onSubmit={handleReset}>
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      {message && <p role="status">{message}</p>}
    </main>
  );
}

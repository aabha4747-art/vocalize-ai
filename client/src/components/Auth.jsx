import { useState } from "react";
import { supabase } from "../supabase";
import "./Auth.css";

function Auth() {
  const [mode, setMode] = useState("login");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  // ==============================
  // SWITCH LOGIN / SIGN UP
  // ==============================

  const switchMode = (newMode) => {
    setMode(newMode);

    setError("");
    setMessage("");

    setPassword("");
    setConfirmPassword("");
  };

  // ==============================
  // LOGIN
  // ==============================

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim()) {
      setError(
        "Please enter your email address."
      );

      return;
    }

    if (!password) {
      setError(
        "Please enter your password."
      );

      return;
    }

    try {
      setLoading(true);

      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        throw loginError;
      }

      // App.jsx listens for the authentication
      // change and automatically shows the app.
    } catch (err) {
      console.error(
        "Login error:",
        err
      );

      if (
        err.message
          ?.toLowerCase()
          .includes(
            "invalid login credentials"
          )
      ) {
        setError(
          "Incorrect email or password."
        );
      } else if (
        err.message
          ?.toLowerCase()
          .includes(
            "email not confirmed"
          )
      ) {
        setError(
          "Please confirm your email before logging in."
        );
      } else {
        setError(
          err.message ||
            "Unable to log in. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // SIGN UP
  // ==============================

  const handleSignUp = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim()) {
      setError(
        "Please enter your email address."
      );

      return;
    }

    if (!password) {
      setError(
        "Please create a password."
      );

      return;
    }

    if (password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );

      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match."
      );

      return;
    }

    try {
      setLoading(true);

      const {
        data,
        error: signUpError,
      } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

      if (signUpError) {
        throw signUpError;
      }

      /*
        If email confirmation is disabled,
        Supabase usually returns a session
        and App.jsx will open Vocalize AI.

        If confirmation is enabled,
        the account is created but there
        may be no session yet.
      */

      if (!data.session) {
        setMessage(
          "Account created. Check your email to confirm your account, then log in."
        );

        setMode("login");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      console.error(
        "Sign-up error:",
        err
      );

      if (
        err.message
          ?.toLowerCase()
          .includes(
            "already registered"
          )
      ) {
        setError(
          "An account with this email already exists."
        );
      } else {
        setError(
          err.message ||
            "Unable to create your account. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // UI
  // ==============================

  return (
    <div className="auth-page">

      <div className="auth-background-shape auth-shape-one" />
      <div className="auth-background-shape auth-shape-two" />

      <div className="auth-container">

        {/* BRAND */}

        <div className="auth-brand">

          <div className="auth-brand-icon">
            ◖
          </div>

          <div>
            <h1>
              Vocalize AI
            </h1>

            <p>
              Text to Speech
            </p>
          </div>

        </div>

        {/* CARD */}

        <div className="auth-card">

          <div className="auth-heading">

            <p className="auth-eyebrow">
              AI POWERED SPEECH
            </p>

            <h2>
              {mode === "login"
                ? "Welcome back"
                : "Create your account"}
            </h2>

            <p>
              {mode === "login"
                ? "Sign in to continue creating natural speech."
                : "Create an account to start using Vocalize AI."}
            </p>

          </div>

          {/* TABS */}

          <div className="auth-tabs">

            <button
              type="button"
              className={
                mode === "login"
                  ? "auth-tab active"
                  : "auth-tab"
              }
              onClick={() =>
                switchMode("login")
              }
            >
              Log In
            </button>

            <button
              type="button"
              className={
                mode === "signup"
                  ? "auth-tab active"
                  : "auth-tab"
              }
              onClick={() =>
                switchMode("signup")
              }
            >
              Create Account
            </button>

          </div>

          {/* FORM */}

          <form
            className="auth-form"
            onSubmit={
              mode === "login"
                ? handleLogin
                : handleSignUp
            }
          >

            {/* EMAIL */}

            <div className="auth-field">

              <label htmlFor="auth-email">
                Email address
              </label>

              <input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(
                    event.target.value
                  );

                  setError("");
                }}
                autoComplete="email"
              />

            </div>

            {/* PASSWORD */}

            <div className="auth-field">

              <label htmlFor="auth-password">
                Password
              </label>

              <input
                id="auth-password"
                type="password"
                placeholder={
                  mode === "login"
                    ? "Enter your password"
                    : "Create a password"
                }
                value={password}
                onChange={(event) => {
                  setPassword(
                    event.target.value
                  );

                  setError("");
                }}
                autoComplete={
                  mode === "login"
                    ? "current-password"
                    : "new-password"
                }
              />

            </div>

            {/* CONFIRM PASSWORD */}

            {mode === "signup" && (

              <div className="auth-field">

                <label htmlFor="confirm-password">
                  Confirm password
                </label>

                <input
                  id="confirm-password"
                  type="password"
                  placeholder="Enter your password again"
                  value={
                    confirmPassword
                  }
                  onChange={(event) => {
                    setConfirmPassword(
                      event.target.value
                    );

                    setError("");
                  }}
                  autoComplete="new-password"
                />

              </div>

            )}

            {/* ERROR */}

            {error && (

              <div className="auth-error">
                {error}
              </div>

            )}

            {/* SUCCESS */}

            {message && (

              <div className="auth-success">
                {message}
              </div>

            )}

            {/* SUBMIT */}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >

              {loading
                ? mode === "login"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "login"
                ? "Log In"
                : "Create Account"}

            </button>

          </form>

          {/* SWITCH MODE */}

          <div className="auth-footer">

            {mode === "login" ? (

              <p>
                Don't have an account?{" "}

                <button
                  type="button"
                  onClick={() =>
                    switchMode(
                      "signup"
                    )
                  }
                >
                  Create one
                </button>
              </p>

            ) : (

              <p>
                Already have an account?{" "}

                <button
                  type="button"
                  onClick={() =>
                    switchMode(
                      "login"
                    )
                  }
                >
                  Log in
                </button>
              </p>

            )}

          </div>

        </div>

        <p className="auth-bottom-text">
          Transform text into natural,
          expressive speech.
        </p>

      </div>

    </div>
  );
}

export default Auth;
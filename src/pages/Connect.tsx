import { useQuery } from "@tanstack/react-query";
import { ArrowRight, KeyRound } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { arbor } from "@/api/arbor";
import { useSession } from "@/auth/session";
import { discover, passwordGrant } from "@/auth/oidc";
import { Button, ErrorBlock, Field, LoadingBlock } from "@/components/app-ui";

type ConnectState = { from?: string };

export default function Connect() {
  const { connectOidc } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const config = useQuery({
    queryKey: ["auth-config"],
    queryFn: arbor.authConfig,
  });
  const destination = (location.state as ConnectState | null)?.from?.startsWith(
    "/",
  )
    ? (location.state as ConnectState).from!
    : "/";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!config.data || submitting) return;
    setPasswordError("");
    setSubmitting(true);
    try {
      const tokens = await passwordGrant(
        config.data,
        await discover(config.data),
        username.trim(),
        password,
      );
      await connectOidc(tokens);
      navigate(destination, { replace: true });
    } catch (cause) {
      setPasswordError(
        cause instanceof Error
          ? cause.message
          : "Sign-in could not be completed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="connect-page">
      <section className="connect-card">
        <div className="brand">
          <span className="brand-mark">A</span> ArborCursus
        </div>
        <div className="connect-heading">
          <span className="icon-disc">
            <KeyRound size={22} />
          </span>
          <p className="eyebrow">Secure workspace access</p>
          <h1>Sign in to your workspace</h1>
          <p>Enter your account credentials to continue.</p>
        </div>
        {config.isLoading ? (
          <LoadingBlock label="Loading identity configuration…" />
        ) : config.isError ? (
          <ErrorBlock
            message="The identity configuration is unavailable."
            retry={() => void config.refetch()}
          />
        ) : (
          <form onSubmit={submit}>
            <Field label="Email or username">
              <input
                required
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setPasswordError("");
                }}
                placeholder="you@example.com"
                autoComplete="username"
              />
            </Field>
            <Field label="Password" error={passwordError}>
              <input
                required
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setPasswordError("");
                }}
                autoComplete="current-password"
              />
            </Field>
            <Button
              type="submit"
              disabled={!username.trim() || !password || submitting}
            >
              {submitting ? "Signing in…" : "Sign in"}{" "}
              <ArrowRight size={16} />
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
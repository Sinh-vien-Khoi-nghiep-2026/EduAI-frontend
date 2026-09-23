import { AlertTriangle, ArrowRight, KeyRound, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { arbor } from "@/api/arbor";
import { useSession } from "@/auth/session";
import { discover, exchangeCode } from "@/auth/oidc";
import {
  clearPendingLogin,
  readPendingLogin,
} from "@/auth/session-transaction";
import { Button } from "@/components/app-ui";

export default function Callback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { connectOidc } = useSession();
  const handled = useRef(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    void (async () => {
      const providerError = params.get("error");
      if (providerError) {
        setMessage(
          `Sign-in was declined by the identity provider (${providerError}). Please start again.`,
        );
        return;
      }
      const code = params.get("code");
      const state = params.get("state");
      const pending = readPendingLogin();
      if (!pending || !code || !state || state !== pending.state) {
        setMessage("This sign-in link is invalid or has expired. Please start again.");
        return;
      }
      clearPendingLogin();
      try {
        const config = await arbor.authConfig();
        const discovery = await discover(config);
        const tokens = await exchangeCode(
          config,
          discovery,
          code,
          pending.verifier,
        );
        await connectOidc(tokens);
        navigate(pending.from.startsWith("/") ? pending.from : "/", {
          replace: true,
        });
      } catch (cause) {
        setMessage(
          cause instanceof Error
            ? cause.message
            : "Sign-in could not be completed.",
        );
      }
    })();
  }, [connectOidc, navigate, params]);

  return (
    <main className="connect-page">
      <section className="connect-card">
        <div className="brand">
          <span className="brand-mark">A</span> ArborCursus
        </div>
        <div className="connect-heading">
          <span className="icon-disc">
            {message ? (
              <AlertTriangle size={22} />
            ) : (
              <KeyRound size={22} />
            )}
          </span>
          <p className="eyebrow">Workspace sign-in</p>
          <h1>{message ? "Sign-in incomplete" : "Completing sign-in…"}</h1>
        </div>
        {message ? (
          <div className="connect-signin">
            <p className="connect-warn">{message}</p>
            <Button onClick={() => void navigate("/connect", { replace: true })}>
              Back to sign-in <ArrowRight size={16} />
            </Button>
          </div>
        ) : (
          <div className="state">
            <LoaderCircle className="spin" size={20} />
            <span>Contacting your identity provider…</span>
          </div>
        )}
      </section>
    </main>
  );
}
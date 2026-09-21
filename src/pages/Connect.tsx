import { useQuery } from "@tanstack/react-query";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { arbor } from "@/api/arbor";
import { useSession } from "@/auth/session";
import { Button, ErrorBlock, Field, LoadingBlock } from "@/components/app-ui";

type ConnectState = { from?: string };

export default function Connect() {
  const { connect } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const config = useQuery({ queryKey: ["auth-config"], queryFn: arbor.authConfig });
  const destination = (location.state as ConnectState | null)?.from?.startsWith("/") ? (location.state as ConnectState).from! : "/";
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try { await connect(token.trim()); navigate(destination, { replace: true }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The token could not be accepted."); }
    finally { setSubmitting(false); }
  }
  return <main className="connect-page"><section className="connect-card"><div className="brand"><span className="brand-mark">A</span> ArborCursus</div><div className="connect-heading"><span className="icon-disc"><KeyRound size={22}/></span><p className="eyebrow">Secure workspace access</p><h1>Connect your access token</h1><p>ArborCursus delegates sign-in to your organization’s OpenID Connect provider. Paste an API access token issued for this workspace.</p></div>{config.isLoading ? <LoadingBlock label="Loading identity configuration…"/> : config.isError ? <ErrorBlock message="The identity configuration is unavailable." retry={() => void config.refetch()}/> : <><div className="oidc-note"><ShieldCheck size={18}/><div><strong>{config.data?.issuer}</strong><span>Access-token audience: {config.data?.audience}</span></div></div><form onSubmit={submit}><Field label="Access token" error={error}><textarea required value={token} onChange={event => { setToken(event.target.value); setError(""); }} placeholder="Paste your bearer access token" rows={5} autoComplete="off"/></Field><Button type="submit" disabled={!token.trim() || submitting}>{submitting ? "Connecting…" : "Connect workspace"} <ArrowRight size={16}/></Button></form><p className="connect-foot">This browser stores the token only for this tab session. Browser login needs a separately configured web OIDC callback; the shipped backend provides a native client configuration only.</p></>}</section></main>;
}

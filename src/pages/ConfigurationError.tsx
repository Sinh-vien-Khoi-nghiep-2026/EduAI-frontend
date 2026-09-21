import { apiOrigin } from "@/api/client";

export default function ConfigurationError() {
  return <main className="connect-page"><section className="connect-card"><div className="brand"><span className="brand-mark">A</span> ArborCursus</div><div className="connect-heading"><p className="eyebrow">Configuration required</p><h1>API origin is missing</h1><p>Set <code>BUN_PUBLIC_API_BASE_URL</code> to the ArborCursus API origin before starting or building this frontend.</p>{apiOrigin && <p>Current value: {apiOrigin}</p>}</div></section></main>;
}

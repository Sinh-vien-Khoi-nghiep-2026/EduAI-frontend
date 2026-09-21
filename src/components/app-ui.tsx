import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { AlertTriangle, Inbox, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "quiet" }) {
  return <button className={cn("button", `button-${variant}`, className)} {...props} />;
}
export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{action && <div className="page-action">{action}</div>}</div>;
}
export function Panel({ children, className }: { children: ReactNode; className?: string }) { return <section className={cn("panel", className)}>{children}</section>; }
export function Status({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) { return <span className={`status status-${tone}`}>{children}</span>; }
export function LoadingBlock({ label = "Loading…" }: { label?: string }) { return <div className="state"><LoaderCircle className="spin" size={20} /><span>{label}</span></div>; }
export function ErrorBlock({ message, retry }: { message: string; retry?: () => void }) { return <div className="state state-error"><AlertTriangle size={20} /><div><strong>Couldn’t load this section</strong><span>{message}</span>{retry && <Button variant="quiet" onClick={retry}>Try again</Button>}</div></div>; }
export function EmptyBlock({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <div className="state state-empty"><Inbox size={22} /><div><strong>{title}</strong><span>{description}</span>{action}</div></div>; }
export function Field({ label, children, error, hint }: { label: string; children: ReactNode; error?: string; hint?: string }) { return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}{error && <small className="field-error">{error}</small>}</label>; }
export function formatError(error: unknown) { return error instanceof Error ? error.message : "The request could not be completed."; }

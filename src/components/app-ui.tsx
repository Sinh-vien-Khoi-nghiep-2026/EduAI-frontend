import { type ButtonHTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect, useRef } from "react";
import { AlertTriangle, Inbox, LoaderCircle } from "lucide-react";
import { ApiError } from "@/api/client";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "quiet" }) {
  return <button className={cn("button", `button-${variant}`, className)} type={type} {...props} />;
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
export function fieldError(error: unknown, field: string) { return error instanceof ApiError ? error.fieldErrors[field] : undefined; }
export function Dialog({ title, onClose, children, dismissible = true }: { title: string; onClose(): void; children: ReactNode; dismissible?: boolean }) {
  const dialog = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef<() => void>(() => {});
  const dismissibleRef = useRef(dismissible);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { dismissibleRef.current = dismissible; }, [dismissible]);
  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.querySelector<HTMLElement>("input, select, textarea, button:not([disabled]), [href]")?.focus();
    const canDismiss = () => dismissibleRef.current && !dialog.current?.querySelector('button[type="submit"][disabled], .button-danger[disabled]');
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && canDismiss()) onCloseRef.current(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      if (previousFocus.current?.isConnected && !previousFocus.current.hasAttribute("disabled")) previousFocus.current.focus();
    };
  }, []);
  function trapFocus(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>("input, select, textarea, button:not([disabled]), [href]") ?? []).filter(element => !element.hasAttribute("disabled"));
    if (!controls.length) return;
    const first = controls[0]!;
    const last = controls.at(-1)!;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  const canDismiss = () => dismissible && !dialog.current?.querySelector('button[type="submit"][disabled], .button-danger[disabled]');
  return <div className="modal-backdrop" onMouseDown={event => { if (canDismiss() && event.target === event.currentTarget) onClose(); }}><div className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={dialog} onKeyDown={trapFocus}>{children}</div></div>;
}

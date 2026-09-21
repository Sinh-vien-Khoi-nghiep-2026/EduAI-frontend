import { useQuery } from "@tanstack/react-query";
import { Bell, Building2, ChevronRight, FolderKanban, GraduationCap, LogOut, Menu, Search, Settings2, ShieldCheck, Sparkles, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { arbor } from "@/api/arbor";
import { useSession } from "@/auth/session";
import { Button, Status } from "@/components/app-ui";

const nav = [
  ["/", "Overview", Sparkles], ["/skills", "Skills", GraduationCap], ["/evidence", "Evidence", ShieldCheck], ["/portfolio", "Portfolio", FolderKanban], ["/records", "Academic records", GraduationCap], ["/organizations", "Organizations", Building2], ["/integrations", "Integrations", Settings2],
] as const;

export function AppLayout() {
  const { token, user, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const notes = useQuery({ queryKey: ["notifications"], queryFn: () => arbor.notifications(token!), enabled: Boolean(token) });
  const orgs = useQuery({ queryKey: ["organizations"], queryFn: () => arbor.organizations(token!), enabled: Boolean(token) });
  const unseen = notes.data?.filter(note => !note.read).length ?? 0;
  const recruiter = orgs.data?.some(item => item.approved && item.kind === "company" && (item.role === "recruiter" || item.role === "admin"));
  return <div className="app-frame"><aside className={open ? "sidebar sidebar-open" : "sidebar"}><div className="brand"><span className="brand-mark">A</span><span>ArborCursus</span><button className="mobile-close" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={18}/></button></div><nav aria-label="Primary navigation">{nav.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === "/"} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><Icon size={18}/><span>{label}</span></NavLink>)}{recruiter && <NavLink to="/candidates" onClick={() => setOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><Search size={18}/><span>Candidate search</span></NavLink>}<NavLink to="/notifications" onClick={() => setOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><Bell size={18}/><span>Notifications</span>{unseen > 0 && <b className="nav-count">{unseen}</b>}</NavLink></nav><div className="sidebar-foot"><div className="identity"><span>{user?.display_name?.[0]?.toUpperCase() ?? "U"}</span><div><strong>{user?.display_name ?? "Your profile"}</strong><small>{user?.email ?? "Connected account"}</small></div></div><Button variant="quiet" className="signout" onClick={signOut}><LogOut size={16}/> Sign out</Button></div></aside><div className={open ? "backdrop open" : "backdrop"} onClick={() => setOpen(false)}/><main><header className="topbar"><Button variant="quiet" className="menu-button" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu size={20}/></Button><div className="crumb"><span>Workspace</span><ChevronRight size={14}/><strong>{nav.find(([to]) => to === location.pathname)?.[1] ?? "Workspace"}</strong></div><NavLink to="/notifications" className="notification-button" aria-label="Notifications"><Bell size={18}/>{unseen > 0 && <i>{unseen}</i>}</NavLink></header><div className="content"><Outlet/></div></main></div>;
}

export function RecruiterAccess({ children }: { children: ReactNode }) {
  const { token } = useSession();
  const orgs = useQuery({ queryKey: ["organizations"], queryFn: () => arbor.organizations(token!) });
  const allowed = orgs.data?.some(item => item.approved && item.kind === "company" && (item.role === "recruiter" || item.role === "admin"));
  if (orgs.isLoading) return null;
  return allowed ? <>{children}</> : <div className="access-note"><Status tone="warning">Restricted</Status><p>Candidate search is available to approved company recruiters and organization admins.</p></div>;
}

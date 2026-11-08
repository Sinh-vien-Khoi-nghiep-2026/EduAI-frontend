import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, ClipboardList, GraduationCap, LayoutDashboard, Menu, ShieldCheck, Users, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { arbor } from "@/api/arbor";
import { capabilitiesFor, decodeClaims, isReviewerOnly } from "@/auth/permissions";
import { useSession } from "@/auth/session";
import { Button, Status } from "@/components/app-ui";

const adminSections = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true, capability: null },
  { to: "/admin/taxonomy", label: "Skill taxonomy", icon: GraduationCap, end: false, capability: "taxonomy.write" as const },
  { to: "/admin/users", label: "Accounts", icon: Users, end: false, capability: "users.manage" as const },
  { to: "/admin/organizations", label: "Organizations", icon: Building2, end: false, capability: "organizations.manage" as const },
  { to: "/admin/evidence", label: "Evidence", icon: ClipboardList, end: false, capability: "evidence.browse" as const },
  { to: "/admin/reviews", label: "Review decisions", icon: ShieldCheck, end: false, capability: "evidence.review" as const },
  { to: "/admin/access", label: "Access scope", icon: Building2, end: false, capability: null },
] as const;

const reviewerSections = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true, capability: null },
  { to: "/admin/reviews", label: "Evidence Review", icon: ShieldCheck, end: false, capability: null },
] as const;

export function AdminLayout() {
  const { token, user, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const organizations = useQuery({
    queryKey: ["organizations"],
    queryFn: () => arbor.organizations(token!),
    enabled: Boolean(token),
  });
  const capabilities = capabilitiesFor(decodeClaims(token), organizations.data);
  const reviewerOnly = isReviewerOnly(capabilities);
  const activeSections = reviewerOnly ? reviewerSections : adminSections;
  const visible = reviewerOnly
    ? reviewerSections
    : adminSections.filter(section => !section.capability || capabilities.has(section.capability));
  // Label lookup uses every section, not only the visible ones, so a direct
  // deep link still shows the right title in the breadcrumb.
  const current = activeSections.find(section =>
    section.end ? location.pathname === section.to : location.pathname.startsWith(section.to),
  ) ?? adminSections.find(section =>
    section.end ? location.pathname === section.to : location.pathname.startsWith(section.to),
  );

  return (
    <div className="admin-frame">
      <aside className={open ? "admin-rail admin-rail-open" : "admin-rail"}>
        <div className="admin-brand">
          <span className="brand-mark">A</span>
          <div>
            <strong>ArborCursus</strong>
            <small>{reviewerOnly ? "Review Evidence" : "Admin console"}</small>
          </div>
          <button
            type="button"
            className="mobile-close"
            aria-label={reviewerOnly ? "Close review navigation" : "Close admin navigation"}
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav aria-label={reviewerOnly ? "Review navigation" : "Admin navigation"}>
          {visible.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? "admin-link active" : "admin-link")}
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-rail-foot">
          <NavLink to="/" className="admin-link admin-exit" onClick={() => setOpen(false)}>
            <ArrowLeft size={17} />
            <span>Back to workspace</span>
          </NavLink>
          <div className="identity">
            <span>{user?.display_name?.[0]?.toUpperCase() ?? "U"}</span>
            <div>
              <strong>{user?.display_name ?? "Your profile"}</strong>
              <small>{user?.email ?? "Connected account"}</small>
            </div>
          </div>
          <Button variant="quiet" className="signout" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </aside>

      <div className={open ? "backdrop open" : "backdrop"} onClick={() => setOpen(false)} />
      <main className="admin-main">
        <header className="admin-topbar">
          <Button
            variant="quiet"
            className="menu-button"
            aria-label={reviewerOnly ? "Open review navigation" : "Open admin navigation"}
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </Button>
          <div className="admin-crumb">
            <span>{reviewerOnly ? "Review" : "Admin"}</span>
            <strong>{current?.label ?? (reviewerOnly ? "Review Evidence" : "Console")}</strong>
          </div>
          <div className="admin-badges">
            {capabilities.has("taxonomy.write") && <Status tone="success">Platform administrator</Status>}
            {capabilities.has("evidence.review") && <Status tone="neutral">Reviewer</Status>}
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

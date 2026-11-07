import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { arbor } from "@/api/arbor";
import { useSession } from "@/auth/session";
import { type Capability, capabilitiesFor, decodeClaims } from "@/auth/permissions";
import { ErrorBlock, LoadingBlock, Status } from "@/components/app-ui";

/**
 * Gates every /admin route on capabilities derived from the verified token and
 * the user's own memberships. The backend re-authorizes each mutation, so this
 * guard prevents misleading UI, not access to data.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { token, isLoading } = useSession();
  const location = useLocation();
  const organizations = useQuery({
    queryKey: ["organizations"],
    queryFn: () => arbor.organizations(token!),
    enabled: Boolean(token),
  });

  if (!token) return <Navigate to="/connect" replace state={{ from: location.pathname }} />;
  // Nothing administrative renders until both the session and the membership
  // list are known; a slow request must not reveal controls early.
  if (isLoading || organizations.isLoading) return <LoadingBlock label="Checking administrative access…" />;
  if (organizations.isError) {
    return (
      <ErrorBlock
        message="Administrative access could not be verified."
        retry={() => void organizations.refetch()}
      />
    );
  }

  const capabilities = capabilitiesFor(decodeClaims(token), organizations.data);
  if (capabilities.size === 0) {
    return (
      <div className="access-note">
        <Status tone="warning">Restricted</Status>
        <p>
          This console is available to platform administrators and to reviewers or admins of an
          approved organization. Your account has neither role, so no administrative data is shown.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

/**
 * Per-section gate. `AdminGuard` only answers "may this account use the
 * console at all"; without this, a reviewer could open /admin/users, render
 * the page shell, and read the resulting 403 as a load error. The backend still
 * refuses the data, but the UI must not offer the route.
 */
export function RequireCapability({
  capability,
  children,
}: {
  capability: Capability;
  children: ReactNode;
}) {
  const { token } = useSession();
  const organizations = useQuery({
    queryKey: ["organizations"],
    queryFn: () => arbor.organizations(token!),
    enabled: Boolean(token),
  });
  if (organizations.isLoading) return <LoadingBlock label="Checking access…" />;
  const capabilities = capabilitiesFor(decodeClaims(token), organizations.data);
  if (!capabilities.has(capability)) {
    return (
      <div className="access-note">
        <Status tone="warning">Restricted</Status>
        <p>
          This section needs a capability your account does not have. A platform administrator can
          grant it; organization roles alone never do.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { arbor } from "@/api/arbor";
import { useSession } from "@/auth/session";
import { capabilitiesFor, decodeClaims } from "@/auth/permissions";
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

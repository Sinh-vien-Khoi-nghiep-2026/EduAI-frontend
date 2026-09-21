import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "./session";
import { LoadingBlock } from "@/components/app-ui";
export function ProtectedRoute() { const { token, isLoading, user } = useSession(); const location = useLocation(); if (!token) return <Navigate to="/connect" replace state={{ from: location.pathname }} />; if (isLoading) return <div className="route-loading"><LoadingBlock label="Restoring your workspace…" /></div>; if (!user) return <Navigate to="/connect" replace />; return <Outlet />; }

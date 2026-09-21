import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";
import { apiOrigin, shouldRetryQuery } from "@/api/client";
import { SessionProvider } from "@/auth/session";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { AppLayout, RecruiterAccess } from "@/layout/AppLayout";
import Candidates from "@/pages/Candidates";
import ConfigurationError from "@/pages/ConfigurationError";
import Connect from "@/pages/Connect";
import Dashboard from "@/pages/Dashboard";
import Evidence from "@/pages/Evidence";
import Integrations from "@/pages/Integrations";
import NotFound from "@/pages/NotFound";
import Notifications from "@/pages/Notifications";
import Organizations from "@/pages/Organizations";
import Portfolio from "@/pages/Portfolio";
import Records from "@/pages/Records";
import Skills from "@/pages/Skills";

const client = new QueryClient({ defaultOptions: { queries: { retry: shouldRetryQuery, refetchOnWindowFocus: false } } });

export function App() {
  if (!apiOrigin()) return <ConfigurationError/>;
  return <QueryClientProvider client={client}><SessionProvider><BrowserRouter><Routes><Route path="/connect" element={<Connect/>}/><Route element={<ProtectedRoute/>}><Route element={<AppLayout/>}><Route path="/" element={<Dashboard/>}/><Route path="/skills" element={<Skills/>}/><Route path="/portfolio" element={<Portfolio/>}/><Route path="/records" element={<Records/>}/><Route path="/organizations" element={<Organizations/>}/><Route path="/integrations" element={<Integrations/>}/><Route path="/notifications" element={<Notifications/>}/><Route path="/evidence" element={<Evidence/>}/><Route path="/candidates" element={<RecruiterAccess><Candidates/></RecruiterAccess>}/></Route></Route><Route path="/404" element={<NotFound/>}/><Route path="*" element={<Navigate to="/404" replace/>}/></Routes></BrowserRouter></SessionProvider></QueryClientProvider>;
}

export default App;

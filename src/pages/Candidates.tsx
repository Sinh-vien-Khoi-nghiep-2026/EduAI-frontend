import { useMutation, useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useState } from "react";
import { arbor } from "@/api/arbor";
import { useSession } from "@/auth/session";
import { criterionFrom, pageFor, submitSearch, type Criterion, type SearchFilters, type SubmittedSearch } from "@/features/candidate-search";
import { Button, EmptyBlock, ErrorBlock, Field, formatError, LoadingBlock, PageHeader, Panel, Status } from "@/components/app-ui";

export default function Candidates() {
  const { token } = useSession();
  const [organizationId, setOrganizationId] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [skill, setSkill] = useState("");
  const [minimum, setMinimum] = useState("5");
  const [schoolId, setSchoolId] = useState("");
  const [match, setMatch] = useState<"all" | "any">("all");
  const [verified, setVerified] = useState(true);
  const [sharedProject, setSharedProject] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<SubmittedSearch | null>(null);
  const orgs = useQuery({ queryKey: ["organizations"], queryFn: () => arbor.organizations(token!) });
  const taxonomy = useQuery({ queryKey: ["skills"], queryFn: arbor.skills });
  const search = useMutation({ mutationFn: (request: SubmittedSearch) => arbor.candidateSearch(token!, request) });
  function addCriterion() {
    setError("");
    try {
      const criterion = criterionFrom(skill, minimum, criteria);
      setCriteria([...criteria, criterion]);
      setSkill("");
    } catch (cause) { setError(formatError(cause)); }
  }
  function submit() {
    setError("");
    const draft: SearchFilters = { organization_id: organizationId, match, skills: criteria, verified_only: verified, ...(schoolId ? { school_id: schoolId } : {}), require_shared_project: sharedProject };
    try {
      const request = submitSearch(draft);
      search.reset();
      setSubmitted(request);
      search.mutate(request, { onError: cause => setError(formatError(cause)) });
    } catch (cause) { setError(formatError(cause)); }
  }
  function changePage(page: number) {
    if (!submitted) return;
    const request = pageFor(submitted, page);
    setSubmitted(request);
    setError("");
    search.mutate(request, { onError: cause => setError(formatError(cause)) });
  }
  if (orgs.isLoading || taxonomy.isLoading) return <LoadingBlock label="Preparing candidate search…"/>;
  if (orgs.isError || taxonomy.isError) return <ErrorBlock message="Search requirements could not be loaded." retry={() => void Promise.all([orgs.refetch(), taxonomy.refetch()])}/>;
  const companies = orgs.data?.filter(item => item.approved && item.kind === "company" && (item.role === "recruiter" || item.role === "admin")) ?? [];
  const schools = orgs.data?.filter(item => item.approved && item.kind === "school") ?? [];
  return <div className="stack"><PageHeader eyebrow="Recruiter workspace" title="Candidate search" description="Search only returns candidates who have opted in and actively shared access with your approved company. The backend intentionally does not return a total count."/><Panel><div className="search-form"><Field label="Company organization"><select value={organizationId} onChange={event => setOrganizationId(event.target.value)}><option value="">Select approved company</option>{companies.map(item => <option key={item.id} value={item.id}>{item.name} · {item.role}</option>)}</select></Field><Field label="School" hint="Optional — limits results to an approved school organization."><select value={schoolId} onChange={event => setSchoolId(event.target.value)}><option value="">Any school</option>{schools.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><div className="criterion-builder"><Field label="Required skill"><select value={skill} onChange={event => setSkill(event.target.value)}><option value="">Select taxonomy skill</option>{taxonomy.data?.map(item => <option key={item.id} value={item.stable_id}>{item.name} · {item.stable_id}</option>)}</select></Field><Field label="Minimum level"><input type="number" min="0" max="10" step="1" value={minimum} onChange={event => setMinimum(event.target.value)}/></Field><Button variant="secondary" type="button" onClick={addCriterion}>Add criterion</Button></div><div className="criteria">{criteria.map(item => <span key={item.skill_id}>{item.skill_id} ≥ {item.min_level}<button aria-label={`Remove ${item.skill_id}`} onClick={() => setCriteria(criteria.filter(entry => entry.skill_id !== item.skill_id))}><X size={13}/></button></span>)}</div><div className="search-options"><Field label="Match"><select value={match} onChange={event => setMatch(event.target.value as "all" | "any")}><option value="all">All criteria</option><option value="any">Any criterion</option></select></Field><label className="check-row"><input type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)}/><span><strong>Verified skills only</strong></span></label><label className="check-row"><input type="checkbox" checked={sharedProject} onChange={event => setSharedProject(event.target.checked)}/><span><strong>Require shared project</strong></span></label></div>{error && <p className="form-error">{error}</p>}<Button onClick={submit} disabled={search.isPending || companies.length === 0}><Search size={16}/>{search.isPending ? "Searching…" : "Search candidates"}</Button></div></Panel>{search.isError && <ErrorBlock message={formatError(search.error)}/>} {search.data && <Panel><h2 className="section-title">Results · page {search.data.page}</h2>{search.data.items.length ? <div className="candidate-list">{search.data.items.map(item => <div key={item.id}><strong>{item.display_name ?? "Unnamed candidate"}</strong><Status tone="success">Eligible match</Status></div>)}</div> : <EmptyBlock title="No matching candidates" description="No candidates met these requirements, or eligible candidates have not shared their profile with this organization."/>}<div className="pager"><Button variant="secondary" disabled={search.data.page === 1 || search.isPending} onClick={() => changePage(search.data!.page - 1)}>Previous</Button><Button variant="secondary" disabled={search.data.items.length < search.data.page_size || search.isPending} onClick={() => changePage(search.data!.page + 1)}>Next</Button></div></Panel>}</div>;
}

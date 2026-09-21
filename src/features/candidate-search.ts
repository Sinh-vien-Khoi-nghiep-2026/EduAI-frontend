export type Criterion = { skill_id: string; min_level: number };
export type SearchFilters = { organization_id: string; match: "all" | "any"; skills: Criterion[]; verified_only: boolean; school_id?: string; require_shared_project: boolean };
export type SubmittedSearch = SearchFilters & { page: number; page_size: number };

export function criterionFrom(skillId: string, levelValue: string, existing: Criterion[]): Criterion {
  const skill_id = skillId.trim();
  const min_level = Number(levelValue);
  if (!skill_id) throw new Error("Choose a skill before adding a criterion.");
  if (!levelValue.trim() || !Number.isInteger(min_level) || min_level < 0 || min_level > 10) throw new Error("Minimum level must be a whole number from 0 to 10.");
  if (existing.length >= 50) throw new Error("Candidate search supports at most 50 skill criteria.");
  if (existing.some(item => item.skill_id === skill_id)) throw new Error("That skill is already in the search criteria.");
  return { skill_id, min_level };
}

export function submitSearch(filters: SearchFilters): SubmittedSearch {
  if (!filters.organization_id) throw new Error("Choose an approved company organization.");
  if (!filters.skills.length) throw new Error("Add at least one skill criterion.");
  if (filters.skills.length > 50) throw new Error("Candidate search supports at most 50 skill criteria.");
  return { ...filters, skills: filters.skills.map(item => ({ ...item })), page: 1, page_size: 20 };
}

export function pageFor(search: SubmittedSearch, page: number): SubmittedSearch {
  if (!Number.isInteger(page) || page < 1) throw new Error("Page must be a positive whole number.");
  return { ...search, skills: search.skills.map(item => ({ ...item })), page };
}


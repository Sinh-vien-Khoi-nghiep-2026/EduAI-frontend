# Recruiter Candidate Search Flow

## Overview
Recruiters search for student candidates who have:
1. Opted in (`users.recruiter_searchable = true`).
2. Granted active access to the recruiter's approved company (`ShareGrant` with scope `recruiter_search` and `active = true`).

## Flow
1. **Recruiter login**: User authenticates via PKCE authorization code flow.
2. **Authorized company scope**: The recruiter selects an approved company where their membership role is `recruiter` or `admin`. Scope is displayed explicitly (e.g. `Searching as <Company> · <role>`).
3. **Optional filters**:
   - `verified_only`: Defaults to `false`. When enabled, restricts skill matches to verified statuses.
   - `require_shared_project`: Defaults to `false`. When enabled, requires candidate to have an active shared non-private project grant.
4. **Skill criteria**:
   - Skill criteria are optional. If no skills are specified, `POST /api/v1/candidates/search` sends `skills: []` and returns all candidates matching the recruiter's company scope and consent permissions.
   - When criteria are added, recruiters can add up to 50 skill criteria with `match: "all" | "any"`.
5. **Results & Pagination**:
   - Results show eligible candidate matches with pagination (Previous/Next).
   - The API intentionally omits a total count to preserve privacy.

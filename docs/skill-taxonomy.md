# Skill Taxonomy

## Fields

- **name** (editable): Display name, 1–200 characters. Name changes trigger background user skill tree reconciliation.
- **path** (editable): Optional slash-separated taxonomy grouping, up to 500 characters. Rejects `//` and `.`/`..` segments.
- **parent_id** (editable): UUID of the parent skill or `null` to place at root. Cannot be self or any transitive descendant.
- **stable_id** (immutable): Permanent slug matching `/^[a-z0-9][a-z0-9._-]*$/`. Immutable because learner progress (`/skills/me/progress`), candidate search criteria (`/candidates/search`), and ObjectTree verification nodes reference it. Rejected with 422 if sent in `PATCH`.

## Cycle Prevention

- **Client**: `parentOptionsFor(skills, id)` uses `descendantIds` to compute all transitive children and filters out the skill and its descendants from the parent dropdown.
- **Server**: `PATCH /api/v1/skills/{skill_id}` checks `body.parent_id == skill_id` (`422 cannot_parent_self`) and walks up the parent chain up to 100 steps (`422 taxonomy_cycle`).

## Deletion Policy

- Blocked if the skill has child skills (`409 skill_has_children`). Client suppresses Delete when loaded data shows children.
- Blocked if any learner has recorded progress against the skill (`409 skill_in_use`). Server authoritative.

## Query Cache Invalidation

- Successful create, update, and delete invalidate `queryKey: ["skills"]`.

# Audit report template

Copy this file, fill in every section, and deliver it as `SECURITY_AUDIT_<date>.md` or paste it into the ticket. Empty sections mean the audit is not finished.

## Header

```
App:            <name>
Deployment:     <dev | prod deployment name>
Commit:         <sha>
Date:           <YYYY-MM-DD>
Auditor:        <name or agent>
Scope:          convex/ (all functions, schema, http.ts, crons.ts), env vars
Out of scope:   <client code, third party providers, infra, or "none">
```

## Summary

```
Critical: <n>
High:     <n>
Medium:   <n>
Low:      <n>

Public functions reviewed: <n>
Tables reviewed:           <n>
HTTP routes reviewed:      <n>
Scheduled targets traced:  <n>
```

Two or three sentences on the overall state. Name the single most important fix.

## Findings

One block per finding, ordered critical to low. Number them so fixes can reference them.

```
### F-01  <short title>

Severity:  Critical | High | Medium | Low
Location:  convex/<file>.ts, <functionName> (<query|mutation|action|httpAction>, <public|internal>)
Evidence:  What the code does, quoted or paraphrased closely enough to find.
           What a caller can do because of it.
Fix:       Concrete change. Name the helper or pattern (for example
           "wrap in authedMutation" or "gate getUrl behind ownership").
Verified:  How the issue was confirmed (dashboard function runner, script,
           reading only). "Reading only" is acceptable but say so.
Status:    Open | Fixed in <sha> | Accepted risk (by whom, why)
```

Severity guide:

| Severity | Test |
| --- | --- |
| Critical | An anonymous caller can read or change another user's data, or a secret is exposed |
| High | A signed in user can reach data or actions outside their scope |
| Medium | A gap in defense in depth with no direct exploit today |
| Low | Hygiene: validators, indexes, naming, missing return types |

## Data access matrix

One row per table in `convex/schema.ts`. "Scope" is the condition that limits which rows a caller sees or writes. "None" in a scope column on a public function is a finding.

| Table | Sensitive fields | Public readers | Read scope | Public writers | Write scope | Internal only functions | Finding refs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| users | email, role, tokenIdentifier | `users.me` | self via tokenIdentifier | `users.updateProfile` | self | `users.setRole` | |
| tasks | | `tasks.listMine`, `tasks.get` | by_user index; get compares userId | `tasks.create`, `tasks.update`, `tasks.remove` | update and remove compare userId | | F-01 |
| memberships | role | `orgs.members` | by_org after membership check | | | `orgs.addMember` | |
| ... | | | | | | | |

Notes under the table for anything that does not fit: tables with public visibility flags, tables written only by webhooks, tables with no public access at all.

## Public function inventory

Every exported `query`, `mutation`, and `action`. This is the list that step 1 of the audit produces, annotated.

| Function | Type | Auth | Intended caller | Costly | Rate limited | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| `posts.listPublished` | query | none | anonymous web | no | n/a | OK, intentionally anonymous |
| `tasks.update` | mutation | getCurrentUser | signed in owner | no | n/a | F-01 |
| `emails.sendInvite` | action | getCurrentUser | signed in org admin | yes | no | F-04 |
| `billing.syncCustomer` | mutation | none | webhook only | no | n/a | F-02, should be internal |

Auth column values: `none`, `getUserIdentity`, `getCurrentUser`, `authedQuery`, `adminMutation`, `orgQuery`, or the helper name used.

## HTTP routes

| Path | Method | Caller verification | Body validated | Calls | Verdict |
| --- | --- | --- | --- | --- | --- |
| `/webhooks/billing` | POST | HMAC signature | yes, after verify | `internal.billing.applyEvent` | OK |
| `/api/export` | GET | bearer JWT via getUserIdentity | n/a | `internal.exports.forUser` | OK |

## Scheduled and internal targets

For each `internal.*` function that is scheduled or run from a public function or route: where it is called from and whether the caller validated before scheduling.

| Internal function | Called from | Caller validated args and ownership | Verdict |
| --- | --- | --- | --- |
| `internal.exports.build` | `exports.request` (authedMutation) | userId derived from ctx.user | OK |
| `internal.emails.send` | `invites.create` (mutation) | `to` taken from client args, no membership check | F-04 |

## Storage

| Operation | Location | Gated by | Verdict |
| --- | --- | --- | --- |
| generateUploadUrl | `files.generateUploadUrl` | authedMutation | OK |
| getUrl | `files.url` | none, any storage ID | F-03 |

## Secrets and environment

```
Secret literals in source:        none | <file:line>
process.env reads in convex/:     <list>
process.env reads in src/:        <list, all must be public values>
Dev and prod use different keys:  yes | no | unknown
Keys rotated after this audit:    <list or none>
```

## Remediation order

Numbered list, criticals first. Group fixes that share a helper (for example "introduce authedMutation, then migrate F-01, F-05, F-06").

1. ...
2. ...

## Reviewed and accepted as is

Public functions, routes, or patterns that looked suspicious and were judged correct, with one line of reasoning each. This saves the next auditor from re deriving the same conclusion.

- `posts.listPublished`: anonymous by design, reads only rows with `published: true` through `by_published` index.
- ...

## Re check after fixes

Re run steps 1 through 7 of the audit procedure after remediation and record the result here.

```
Re check date:    <YYYY-MM-DD>
Commit:           <sha>
Open findings:    <list or none>
```

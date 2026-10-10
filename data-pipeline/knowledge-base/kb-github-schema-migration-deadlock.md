# Incident: GitHub Table Rename Deadlocks MySQL Read Replicas
- Service: MySQL read replicas behind Actions, API, Git operations, Issues, Pull Requests, Pages and more
- Date: 2021-11-27 (from 20:40 UTC, about 2 hours 50 minutes)
- Category: Database / Schema Migration / Replication / Cascading Load
- Source: https://github.blog/2021-12-01-github-availability-report-november-2021/

## Summary
Degraded availability hit GitHub Actions, API requests, Codespaces, Git operations, Issues, Packages, Pages, Pull Requests and Webhooks. Writes kept working throughout; the problem was in reads.

## Root Cause
In the final step of a MySQL schema migration (a table rename), a large share of the read replicas entered a semaphore deadlock. The deadlocked replicas went into crash recovery, which pushed more load onto the healthy replicas until too little capacity was left to serve production requests. The report does not describe the migration itself.

## Resolution & Takeaways
- Engineers promoted healthy internal read replicas to serve production traffic.
- They removed production traffic from the broken replicas until those could finish the table rename.
- Follow-ups stated by GitHub: partition MySQL clusters by function so migrations can be tried on a single shard first (canary), add more spare capacity per cluster, pause schema migrations pending investigation, and keep improving migration tooling.
- General lesson (not stated in the report): when some replicas fail, the survivors take their load, so a partial failure can turn into a full one. Spare capacity and a staged rollout limit the damage.

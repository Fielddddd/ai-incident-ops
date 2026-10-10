# Incident: CircleCI Stale Database Statistics After a Major Version Upgrade
- Service: Workflows (starting and canceling workflows and jobs)
- Date: April 2025 (report titled April 4, 2025); about 1 hour 37 minutes
- Category: Database / Upgrade / Query Planner / Latency
- Source: https://discuss.circleci.com/t/post-incident-report-april-4-2025-delays-in-starting-workflows/53113

## Summary
During a workflows upgrade that involved a database migration using a blue/green deployment, the new database performed badly. Starting and canceling workflows and jobs became slow and sometimes failed, and workflows were slow to appear in the UI.

## Root Cause
The ANALYZE step that rebuilds the database's statistics table was run too early in the procedure. A second major version upgrade then made those statistics stale. With out-of-date statistics, the query planner could not choose good plans, and the team saw that all queries on the new database were reading from disk.

## Resolution & Takeaways
- The team switched back: the old database was made primary again and the switchback finished about 10 minutes later. The job queue returned to normal shortly after.
- Follow-ups stated by the company: the blue/green procedure now runs the analysis step after each major version change, and automated tests plus manual checkpoints were added before future cutovers.
- General symptom to remember (not stated in the report): queries suddenly slow right after a database upgrade, with heavy disk reads, can mean the planner statistics are missing or stale. Refresh them after every major upgrade.

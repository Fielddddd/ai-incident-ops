# Incident: incident.io Postgres Extension (PGAudit) Hangs During a Routine Migration
- Service: Dashboard, Mobile App, Slack App and API
- Date: 2025-04-09 (14:16-14:27 UTC; database outage 14:25-14:27 UTC)
- Category: Database / Postgres Upgrade / Locking / Extensions
- Source: https://status.incident.io/incidents/01JRDFKAGE07YYDY0KZR137BX3/write-up

## Summary
Days after the database was upgraded to Postgres 17, a routine migration (create an empty table and add an index) caused intermittent slowness across the dashboard, mobile app, Slack app and API for about 11 minutes. The database itself was unavailable for about 2 minutes. On-call alerts and escalations kept working.

## Root Cause
The migration triggered an unexpected interaction with PGAudit, a Postgres extension that logs database activity and changes to structure and permissions. The extension became unresponsive while holding critical database locks, which blocked other work. The write-up does not explain why the interaction happened.

## Resolution & Takeaways
- The database was restarted to forcibly end the stuck process.
- PGAudit was disabled temporarily and then removed completely.
- Follow-ups stated by the company: investigate, hold an internal debrief, and improve processes and monitoring to detect and respond to similar situations.
- General practice, not stated in the report: after a major database upgrade, rehearse routine migrations in staging with the same extensions enabled, and watch for sessions that hold locks for a long time.

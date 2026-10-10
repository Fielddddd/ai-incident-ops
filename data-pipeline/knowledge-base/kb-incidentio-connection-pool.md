# Incident: incident.io Database Connection Pool Exhaustion
- Service: Core Application & Slack Integrations
- Category: Database / Connection Pooling / Latency

## Summary
The application experienced intermittent timeouts over a two-week period. Traces showed requests waiting up to 20 seconds to acquire a database connection from Go's database/sql pool, with latency contention spread across multiple endpoints.

## Root Cause
An unnecessary database transaction was wrapping every Slack modal submission. A large volume of small, fast transactions executed in parallel, collectively exhausting the database connection pool and starving other API endpoints of available connections.

## Resolution & Takeaways
- Removed unnecessary wrapping transactions on frequent modal submissions.
- Used custom middleware to measure and attribute connection-pool hold times per operation.
- Keep transaction scopes as small as possible to avoid connection pool starvation.
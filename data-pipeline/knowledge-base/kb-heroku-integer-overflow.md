# Incident: Heroku Database Foreign Key Integer Overflow
- Service: Heroku API & Deployment Pipeline
- Date: 2023-06-08
- Category: Database / Schema Design

## Summary
At 15:05 UTC on June 8, 2023, Heroku experienced an outage that prevented users from creating new authorizations and blocked customers from triggering new deployments. On-call operations initiated a full API outage mitigation to stabilize the service.

## Root Cause
A foreign key column in the authorization table used a smaller integer data type (such as 32-bit INT) than the primary key it referenced. Once the primary key table exceeded the maximum allowable value for that integer type, subsequent insertions caused an integer overflow error.

## Impact & Takeaways
- Prevented authorization token creation and customer deployments.
- Schema audits and database migrations must ensure foreign key and primary key types are strictly aligned across services.
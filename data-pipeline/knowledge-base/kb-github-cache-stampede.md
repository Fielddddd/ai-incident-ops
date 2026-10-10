# Incident: GitHub Cache TTL Reduction Cascading Failure
- Service: Auth & User Management Cluster (github.com, API, Actions, Copilot)
- Category: Caching / Thundering Herd / Write Amplification

## Summary
During a Monday traffic peak, a cascading failure overwhelmed the core authentication and user-management database clusters, degrading dependent services including github.com web, APIs, Actions, and Copilot.

## Root Cause
Two popular client applications had quietly increased their read traffic by 10x. Over the preceding weekend, a configuration change reduced the user-settings cache TTL from 12 hours to 2 hours. At peak load, the combined effect of high read volume and write amplification from rapid cache invalidations overwhelmed the database cluster.

## Impact & Takeaways
- Aggressive cache TTL reductions without gradual rollouts can trigger cache stampedes.
- Caching architecture must account for high-read client applications and write amplification before adjusting expiration timers.
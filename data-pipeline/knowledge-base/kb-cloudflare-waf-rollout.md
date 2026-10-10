# Incident: Cloudflare Global WAF Configuration Failure
- Service: Edge Proxy & Cloudflare Managed Ruleset
- Category: Configuration / Deployment Rollout / HTTP 500

## Summary
A global configuration change resulted in HTTP 500 errors across customer applications utilizing the Cloudflare Managed Ruleset, causing wide-scale service degradation.

## Root Cause
A configuration change meant to disable an internal WAF testing tool was pushed globally without a phased or gradual canary rollout. This triggered an unhandled Lua exception within the proxy's rulesets module, crashing edge request pipelines.

## Resolution & Takeaways
- Always enforce phased/canary deployments for proxy routing and firewall configurations.
- Ensure strict exception handling around dynamic ruleset parsing to prevent catastrophic edge crashes.
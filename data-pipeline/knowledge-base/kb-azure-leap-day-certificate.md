# Incident: Windows Azure Outage Caused by a Leap-Day Certificate Date
- Service: Windows Azure Compute, Access Control Service, Service Bus, SQL Azure Portal and Data Sync
- Date: 2012-02-28 4:00 PM PST (00:00 UTC on February 29) until about March 1
- Category: Time / Certificates / Software Bug / Cascading Failure
- Source: https://azure.microsoft.com/en-us/blog/summary-of-windows-azure-service-disruption-on-feb-29th-2012/

## Summary
A partial outage hit several Azure services. Some applications lost one or more virtual machines, although most applications with several VMs kept running at reduced capacity.

## Root Cause
When a VM starts, the Guest Agent creates a "transfer certificate". It worked out the end date of the certificate by taking the current date and adding one to the year. On February 29, 2012 that produced February 29, 2013, which does not exist, so certificate creation failed and the agent stopped. After a 25-minute timeout the Host Agent restarted the VM; after three timeouts it reported the server as faulty to the Fabric Controller, which started moving ("healing") the VMs to other servers, where the same bug happened again. When too many servers were marked as needing human investigation, the Fabric Controller stopped updates and disabled automatic service healing.

## Resolution & Takeaways
- Service management was disabled globally to stop customers adding to the problem, and fixed Guest Agent code was rolled out. A second problem, an incompatible Host Agent and network plug-in combination pushed to partly updated clusters, disconnected VMs from the network until a corrected package was deployed.
- Changes announced by Microsoft: better testing of time-related bugs, better code analysis tools, better separation of hardware faults from software faults, faster failure detection, a clearer service dashboard and more ways to reach customers. Affected customers received a 33% service credit.
- General lesson (not stated in the report): code that adds one year to a date, or treats an automatic retry as a hardware failure, can spread a single software bug across every server.

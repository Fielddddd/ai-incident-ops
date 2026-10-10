# Incident: AWS S3 Outage After a Mistyped Capacity-Removal Command
- Service: Amazon S3 (US-EAST-1), plus S3 console, EC2 launches, EBS snapshots and Lambda
- Date: 2017-02-28 (from 9:37 AM PST, about 4 hours 17 minutes)
- Category: Human Error / Operations Tooling / Blast Radius
- Source: https://aws.amazon.com/message/41926/

## Summary
S3 requests failed for hours, and services that depend on S3 were affected too: the S3 console, new EC2 instance launches, EBS snapshots and AWS Lambda.

## Root Cause
An engineer ran a command to remove a small number of servers from one S3 billing subsystem. One input was typed incorrectly, so a much larger set of servers was removed. Some of the removed servers supported two core subsystems: the index subsystem (metadata and location of every object, needed for GET, LIST, PUT and DELETE) and the placement subsystem (allocates storage for new objects, depends on the index). Both had to be restarted. Because S3 had grown a lot, restarting and running the safety checks that validate metadata took longer than expected.

## Resolution & Takeaways
- Recovery timeline: the index subsystem began to recover at 12:26 PM PST and was fully back at 1:18 PM; the placement subsystem recovered at 1:54 PM.
- Changes announced by AWS: the removal tool now works more slowly, and it refuses to remove capacity below a minimum level. Subsystems were to be split into smaller cells to reduce the blast radius, and the Service Health Dashboard was changed to run across multiple regions.
- General lesson (not stated in the report): tools that can remove capacity need limits, and a restart procedure that was last exercised long ago may no longer be fast enough.

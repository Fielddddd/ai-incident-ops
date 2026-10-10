# Incident: Cloudflare DNS Panics When the Leap Second Makes Time Go Backwards
- Service: RRDNS (Cloudflare's DNS proxy) and customers using CNAME records
- Date: 2017-01-01 (from 00:00 UTC, about 6 hours 45 minutes)
- Category: Time / Clock / Software Bug / DNS
- Source: https://blog.cloudflare.com/how-and-why-the-leap-second-affected-cloudflare-dns/

## Summary
At the leap second at midnight UTC on January 1, 2017, some DNS queries failed for customers who used CNAME records. At the peak about 0.2% of DNS queries failed, and fewer than 1% of HTTP requests returned errors. It happened on a small number of machines across 102 data centers.

## Root Cause
RRDNS measures how well each upstream resolver performs using the difference between two readings of the clock. The Go function time.Now() does not guarantee that time only moves forward, and during the leap second it returned an earlier time than a previous call. The round-trip time came out negative, the smoothing code passed the negative value along, and the resolver selection code handed it to rand.Int63n(), which panics on a negative argument.

## Resolution & Takeaways
- The fix was one character: check whether a time difference is negative and, if so, reset the performance tracking so a negative value never reaches the server selection code.
- Lesson stated by Cloudflare: do not assume time always moves forward.
- General symptom to remember (not stated in the report): crashes or odd behaviour exactly at a clock change (leap second, daylight saving, clock correction by NTP) point to code that subtracts timestamps.

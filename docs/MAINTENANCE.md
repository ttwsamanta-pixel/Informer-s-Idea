# Daily maintenance and GA4 tool events

Production entry point: `/home/u382937075/maintenance.cjs` (private, outside the web root).

Configure a daily custom command in Hostinger hPanel's Cron Jobs scheduler:

```sh
MAINTENANCE_MODULE_ROOT=/home/u382937075/phase2-setup-250642f /opt/alt/alt-nodejs24/root/usr/bin/node --env-file=/home/u382937075/domains/informersidea.com/hbuilds/config/.env /home/u382937075/maintenance.cjs >> /home/u382937075/private-backups/maintenance.log 2>&1
```

Use a daily schedule, for example `0 3 * * *` (server time). Confirm the next run in the private log. Scheduling is not yet confirmed; SSH has no crontab command. Hostinger managed backup scheduling and an off-server restore drill also remain unverified.

The script saves a transaction-consistent MySQL dump before cleanup, uses private file permissions, prevents overlapping runs, and expires only its own daily SQL snapshots after 30 days. Existing manual backups remain untouched. No passwords appear in command arguments or logs. The database contains uploaded media; check backup growth as uploads increase. An on-server snapshot does not protect against loss of the hosting account: retain Hostinger/off-server backups too.

Cleanup removes expired sessions, password reset tokens, rate limits and OAuth states; old first-party analytics follow the configured 7–365-day retention, audit logs retain 365 days and API usage retains 90 days. It does not seed content or run migrations. A production backup and cleanup run was successfully verified on 25 November 2026 (India time). A successful dump is not a tested restore.

GA4 events: `tool_started`, `tool_completed`, `tool_error`, `tool_cancelled`, and `tool_download`. The only event parameter is `tool_id`; no file names, contents, entered text, or raw errors are sent. Register `tool_id` as an event-scoped custom dimension in GA4 for reporting by tool. Converter processing is counted per file; ordinary batch tools count one processing run. Download events indicate the download action, not proof the user saved a file; converter downloads use `file-converter`. Page views remain owned by GA4 Enhanced Measurement. Admin routes, browser opt-out, DNT and GPC are excluded. GA4 reporting inside admin remains deferred.

## Background-removal finding

`@imgly/background-removal@1.7.0` (latest checked) depends on Zod 3 and embeds Zod code in its distribution. Advisory GHSA-mrhx-c7xc-m3w5 concerns memory exhaustion while validating oversized collections. The patched range starts at Zod 4.6.6; the app's root Zod is 4.6.7. A dependency override alone does not fix the embedded copy. The background tool is browser-only with fixed configuration; the package finding does not establish that the app exposes the vulnerable validation path. Keep the tool as requested while monitoring upstream or evaluating a replacement. Do not treat npm audit's downgrade suggestion as a verified fix.

Source: https://github.com/advisories/GHSA-mrhx-c7xc-m3w5

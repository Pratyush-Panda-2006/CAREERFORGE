# Local SIEM training workspace (#396)

The workspace near the bottom of the Sentinel page evaluates sample events only.
It makes no network calls and does not monitor or block real traffic.

The default rule matches five authentication failures AND one privilege change on
the same source in an inclusive 60-second window. Rules support two editable
conditions, AND/OR, thresholds, high/critical severity and windows of 1–300 seconds.
The engine supports up to four conditions for future UI extensions. A match is
evaluated on event arrival, clock advance and rule creation. An incident retains
its evidence and illustrative MITRE technique tags. Matching episodes produce one
incident until the condition becomes false; acknowledgment does not re-arm it.

All state is session-local. Retention is bounded to 20 rules, 1,000 events in
300 seconds and the latest 100 incidents. At event capacity, injection fails
visibly rather than dropping evidence. Advance the clock to expire old events.

Run `npm ci` and `npm run dev` at the repository root, then visit
`/showcase/cybersecurity-sentinel/index.html`.

1. Run the brute force + privilege-change scenario. Expect one critical incident.
2. Repeat it while the window still matches. Expect no duplicate incident.
3. Acknowledge the incident. Evidence remains visible.
4. Advance 61 seconds and repeat. Expect a new incident.
5. Inject failures on workstation-a and a privilege change on workstation-b.
   They must not combine.
6. Add an OR rule for a single privilege change and verify independent detection.
7. Start/pause the sample stream and verify keyboard controls and narrow layout.

Engine regressions (no dependencies, from repository root):

```sh
node --test public/showcase/cybersecurity-sentinel/siem-engine.test.js
```

AI-assisted implementation and tests using Codex.

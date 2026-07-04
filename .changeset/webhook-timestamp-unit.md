---
"@mailway/core": minor
---

Add `timestampUnit` to `WebhookScheme` so schemes with millisecond timestamps
(e.g. useSend) get a correct replay-window check. Defaults to `"seconds"`, so
existing schemes (Resend/Svix, AutoSend) are unaffected.

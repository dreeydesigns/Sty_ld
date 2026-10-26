# Gmail code delivery

Better Auth remains the only sign-in authority. Gmail only transports its codes. The same mailbox can send codes and receive a code when its owner signs in. A matching email address never grants admin privileges.

For the isolated Preview branch, set these Vercel environment variables:

| Name | Value |
| --- | --- |
| EMAIL_PROVIDER | gmail |
| GMAIL_USER | trystyld@gmail.com |
| GMAIL_APP_PASSWORD | Google App Password, entered directly as a sensitive variable |

Enable Google 2-Step Verification, then create an App Password at https://myaccount.google.com/apppasswords. Never use the regular Google password. Never paste the App Password into chat or commit it. Some Google accounts do not offer App Passwords.

References: [Google App Password guidance](https://support.google.com/mail/answer/185833) and [Nodemailer Gmail setup](https://nodemailer.com/guides/using-gmail).

Scope these variables to Preview and the test branch only. Redeploy that branch after saving them. Keep BETTER_AUTH_URL equal to its stable preview origin. Vercel preview access and STYLD sign-in are separate: the Vercel owner may need to open the preview first.

Missing credentials fail closed. SMTP rejection never reports success. Acceptance by Gmail means accepted for delivery, not proof of inbox arrival. Local tests use a fake SMTP server and do not send real mail. A real inbox, OTP verification, refresh and logout still require a controlled preview check after configuration.

Gmail has sending limits and may block automated traffic. This is a limited testing option, not proof of public marketplace readiness or unlimited free delivery. No paid service is enabled. WhatsApp is not enabled.

Rollback: restore the previous EMAIL_PROVIDER selection and its complete sender configuration, then redeploy the preview. No schema changes, user ID changes or production configuration changes are needed.

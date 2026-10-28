// One copy rule, stated once, used by tests/connection-notice.cjs and by the live accessibility
// audit that reads the notice while a page is open. A visitor must never be shown that something
// was saved, sent, queued, delivered or confirmed unless a server record proves it, so an
// unproven perfect is banned. A denial is not a claim: "Nothing has been sent" is the honest
// sentence, and the first live run flagged exactly that because the pattern matched the words
// inside the denial rather than reading what the sentence does.
const deliveryClaim = /(?<!\b(?:nothing|not|never|n't)\b.{0,14})\b(?:has been|have been|was|were|is|are)\s+(saved|sent|confirmed|delivered|queued|released)\b|\ball set\b|you'?re done|successfully/i;

module.exports = { deliveryClaim };

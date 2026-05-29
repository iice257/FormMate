# Live Public Form Review Dataset

Purpose: manually test the parser against public form surfaces without submitting responses, bypassing access controls, or collecting private data.

Review method:

1. Open each URL manually.
2. Paste the URL into FormMate, or upload visible screenshots when URL parsing is blocked or unsupported.
3. If FormMate returns a gate, use the suggested capture/screenshot path only on visible public fields.
4. Record observed parser status, bucket counts, warnings, and notes.

Bucket counts below are initial expected summaries. Observed results from the latest local run are recorded after the expected matrix.

| # | Category | URL | Expected difficulty | Expected parser status | Expected bucket summary | What to manually check |
|---:|---|---|---|---|---|---|
| 1 | Scholarship | https://www.cmcc.edu/scholarship-application-page/ | Medium | partial/success from page, external Microsoft form may need capture | profile: medium, ai: medium, manual: medium, uncertain: low | Whether link intake finds the actual application path or only the landing page. |
| 2 | Scholarship | https://dosswahls.org/application | Medium | partial/success from page, external Microsoft form may need capture | profile: medium, ai: medium, manual: medium, uncertain: low | Whether page text and embedded form link are handled separately. |
| 3 | Scholarship PDF/Form Link | https://cabcallowayschoolfund.org/wp-content/uploads/2025/CCSF-Scholarship-Information-and-Instructions-2026.pdf | Hard | unsupported/manual review | profile: low, ai: low, manual: high, uncertain: medium | Whether PDF/application instructions are clearly marked unsupported for parser v1. |
| 4 | Scholarship PDF/Form Link | https://www.zoonewengland.org/media/qn5dfw2z/zoocamp-scholarship-app-2025.pdf | Hard | unsupported/manual review | profile: low, ai: low, manual: high, uncertain: medium | Whether PDF forms become manual-review targets instead of false parses. |
| 5 | Volunteer | https://www.spreadjoy.info/how-to-volunteer | Medium | partial/success from page, Google Form gate for linked form | profile: medium, ai: low, manual: medium, uncertain: low | Whether Google Form link routes to screenshot gate. |
| 6 | Volunteer/Advocacy | https://docs.google.com/forms/d/e/1FAIpQLSddy0lqL_4xURvjYI0WOo8qZ9bp8Xb6SeeZCfCJY865jVoabg/viewform | Medium | blocked/upload_screenshots | profile: unknown, ai: unknown, manual: unknown, uncertain: unknown | Whether Google Forms never pretend URL-only parsing is complete. |
| 7 | Customer Feedback | https://cwinc.org/customer-feedback-survey/ | Medium | partial/success from page, Google Form gate for linked form | profile: low, ai: medium, manual: medium, uncertain: low | Whether survey fields classify choices as manual and comments as AI. |
| 8 | Customer Feedback | https://docs.google.com/forms/d/e/1FAIpQLSc8LBKob5s9QYnVsJpSlQbbgQfeTicd_oqYdM9HBLs4XGjM6w/viewform | Medium | blocked/upload_screenshots | profile: unknown, ai: unknown, manual: unknown, uncertain: unknown | Whether screenshot path is suggested directly. |
| 9 | Job/Volunteer Application | https://www.linkedin.com/jobs/view/board-member-volunteer-at-calwild-4390990794 | Hard | blocked/use_capture or no_form | profile: low, ai: medium, manual: high, uncertain: medium | Whether job portal/rendered page avoids false confidence. |
| 10 | Microsoft Form | https://forms.office.com/r/LHtNM0tdf2 | Medium | blocked/use_capture or partial | profile: medium, ai: medium, manual: medium, uncertain: medium | Whether Microsoft Forms behaves as visible capture or weak client-rendered structure. |
| 11 | Event Registration | https://ra.co/events/1780301 | Hard | partial/no_form, external Tally link may need capture | profile: low, ai: low, manual: high, uncertain: medium | Whether event page is treated as acquisition, not direct form structure. |
| 12 | Tally Form Surface | https://tally.so/r/3EdjZL | Medium | blocked/use_capture or partial | profile: medium, ai: medium, manual: medium, uncertain: medium | Whether client-rendered form surfaces route to capture when DOM is weak. |
| 13 | Public Survey | https://docs.google.com/forms/d/e/1FAIpQLSc8cav7rK4p6ih1GqWD4ycuU6m2thXbh-_yVQ9p-RvYwOsFUQ/viewform | Medium | blocked/upload_screenshots | profile: unknown, ai: unknown, manual: unknown, uncertain: unknown | Whether public Google survey still follows screenshot-first policy. |
| 14 | Public Survey | https://docs.google.com/forms/d/e/1FAIpQLScgTCRO_BJw4J1PLjh3CGdNjR3fC80wmBjx97X0bSyvC6NRUA/viewform | Medium | blocked/upload_screenshots | profile: unknown, ai: unknown, manual: unknown, uncertain: unknown | Whether survey choices are not inferred without visible capture. |
| 15 | Public Survey | https://docs.google.com/forms/d/e/1FAIpQLSdhtVfQxFZb5tJ24K-hRqrplzkVZD0hXAGwkSfwIrAkrPCacA/viewform | Medium | blocked/upload_screenshots | profile: unknown, ai: unknown, manual: unknown, uncertain: unknown | Whether feedback/UX survey uses the same gate. |
| 16 | Public Survey | https://docs.google.com/forms/d/e/1FAIpQLSeFVOp3d7WiMH4gotT2a9aTxJTVi7fdBCIBpkHmu8M9sOaOIA/viewform | Medium | blocked/upload_screenshots | profile: unknown, ai: unknown, manual: unknown, uncertain: unknown | Whether long survey links remain non-destructive. |
| 17 | Public Survey | https://docs.google.com/forms/d/e/1FAIpQLScgFVsIrO46_tHfUslZElB4QfTJvYUAmCxNe-wy7bUD-gm35w/viewform | Medium | blocked/upload_screenshots | profile: unknown, ai: unknown, manual: unknown, uncertain: unknown | Whether screenshot review produces stable buckets. |
| 18 | Municipal Survey PDF | https://www.cityofmanvel.com/DocumentCenter/View/415 | Hard | unsupported/manual review | profile: low, ai: low, manual: high, uncertain: high | Whether static/PDF-like public form documents fail cleanly. |
| 19 | Education Feedback PDF | https://resources.finalsite.net/images/v1728701177/bostonpublicschoolsorg/dayzi6ckocfgzaxgntsl/eltaskforcemembersfeedbackform.pdf | Hard | unsupported/manual review | profile: low, ai: low, manual: high, uncertain: high | Whether PDF-linked Google Form references are treated as review notes. |
| 20 | Airtable Public Form Reference | https://support.airtable.com/hc/en-us/articles/360058735154-How-to-create-a-form-in-Airtable | Easy | no_form/manual review | profile: none, ai: none, manual: none, uncertain: none | Whether documentation pages are not misread as forms. |

## Observed Results - May 29, 2026

Command: `npm run review:live-parser`

The current parser was intentionally conservative: all observed bucket counts were zero unless screenshot/capture input is supplied, which supports treating screenshots as a valid standalone intake path as well as optional link context.

| # | Observed status | Next action | Notes |
|---:|---|---|---|
| 1 | blocked | use_capture | Microsoft form gate. |
| 2 | blocked | use_capture | Microsoft form gate. |
| 3 | unsupported | upload_screenshots | PDF/document unsupported by URL parser. |
| 4 | unsupported | upload_screenshots | PDF/document unsupported by URL parser. |
| 5 | error | none | Fetch failed with `ECONNREFUSED`; retry later before treating this as parser behavior. |
| 6 | blocked | upload_screenshots | Google Form correctly gates to screenshots. |
| 7 | blocked | upload_screenshots | Google-linked surface correctly gates to screenshots. |
| 8 | blocked | upload_screenshots | Google Form correctly gates to screenshots. |
| 9 | blocked | use_capture | LinkedIn authentication required. |
| 10 | blocked | use_capture | Microsoft form gate. |
| 11 | blocked | use_capture | RA page presented CAPTCHA/access gate. |
| 12 | unsupported | use_capture | Tally page hit CAPTCHA/weak rendered DOM; provider detection downgraded. |
| 13 | blocked | upload_screenshots | Google Form correctly gates to screenshots. |
| 14 | blocked | upload_screenshots | Google Form correctly gates to screenshots. |
| 15 | blocked | upload_screenshots | Google Form correctly gates to screenshots. |
| 16 | blocked | upload_screenshots | Google Form correctly gates to screenshots. |
| 17 | blocked | upload_screenshots | Google Form correctly gates to screenshots. |
| 18 | unsupported | upload_screenshots | Document unsupported by URL parser. |
| 19 | unsupported | upload_screenshots | PDF/document unsupported by URL parser. |
| 20 | unsupported | use_capture | Airtable documentation page was not parsed as a form, but provider detection mislabeled it as Typeform; track as follow-up. |

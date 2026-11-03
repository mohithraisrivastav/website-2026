# mohithraisrivastav.com: site instructions

This repository holds the public website only. Business context, fees, client records and agent playbooks live in Studio Brain on Mohith's PC. Locked decision L-08: client work never lives in this repository. Do not add business files, proposals, fee notes or playbooks here.

## What this repository is

- Static HTML, CSS and vanilla JS, with GSAP and Lenis.
- Serverless functions in `api/`: Razorpay checkout and Resend email.
- Deploys to Vercel from `main` on GitHub.
- `.vercelignore` keeps notes, documents and tooling off the live site. Markdown, Word, Excel and script files never deploy.

## Sources of truth

- Workshop dates: `assets/js/workshop-cohorts.js` only. Never quote a date from memory.
- Prices shown on the site: the page that sells the item. Change them there first.
- `llms.txt` must match the pages. Update it in the same commit as any page change it describes.

## Writing on the site

Mohith writes the way he talks to a close friend: considered, warm, occasionally dry, never performing. Specific beats abstract. Name the thing: a laterite wall, a monsoon morning in Fontainhas.

Hard rules for every word on the site:

- No em dashes or en dashes used as pauses. Recast the sentence.
- No "not X, but Y" in any form. No opening with what something is not.
- No stacked fragments and no repetition ladders. Fold them into one sentence.
- No moral at the end of a passage. End where the thought ends.
- No credential parades in body copy.
- Banned words: leverage, proactive, pivotal, seamless, cutting edge, game-changer, realm, quest, unravel, embark, resilient, thrill, quietly, stunning, breathtaking, world-class, vibrant, rich, wonderful, incredible, transform, journey, shift.

## Before any commit

- Run `git status` and stage only the files the change needs.
- Never commit `.env` files, keys, client files, proposals, fee notes or agent playbooks.
- Check that every new non-page file is covered by `.vercelignore`.

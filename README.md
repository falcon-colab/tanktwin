# TankTwin

Plan your aquarium before you buy. Pick a tank, add fish, and see compatibility, stocking level, shared water parameters, filter flow and heater size. Every plan is a share link.

## Develop

```sh
npm install
npm run dev      # local site at http://localhost:4321
npm test         # planner logic tests
npm run check    # type check
npm run build    # static site in dist/
```

## Where things live

- `src/data/species.json`: the species database. Every page and every check reads from it.
- `src/lib/planner.ts`: stocking, compatibility, water and gear logic (tested in `planner.test.ts`).
- `src/components/Planner.tsx`: the interactive planner on the home page.
- `src/pages/fish/`: one care page per species, built from the data.

## Deploy (Cloudflare Pages)

Connect this repo in Cloudflare Pages with build command `npm run build` and output directory `dist`. Then add the custom domain `tanktwin.com` in the Pages project settings.

## Data note

Species values are guideline ranges drafted from public references and still need a review pass before launch.

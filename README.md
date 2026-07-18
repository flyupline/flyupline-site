# FlyUpLine — React

React (Vite) site for [flyupline.com](https://flyupline.com/) — a full premium redesign that keeps the FlyUp Line brand (logo, orange/amber palette, Rubik / Jost / Satisfy fonts) with an all-new layout, design system (`src/styles/theme.css`), and concierge quote-request experience. No Bootstrap or slider libraries — one hand-rolled CSS design system, custom SVG icon set, and scroll-snap carousels.

## Run

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
```

## Pages

| Route | Page |
| --- | --- |
| `/` | Home (hero slider, about, destinations, services tabs, how it works, features, testimonials, promo, contact strip) |
| `/about` | About Us |
| `/flight-booking` | Flight booking with Roundtrip / One-way / Multi-city forms |
| `/contact` | Contact form + info |
| `/privacy-policy` | Privacy Policy |
| `/terms-conditions` | Terms & Conditions |

## Structure

- `src/components/` — Header, Footer, Breadcrumb, Preloader, shared icons
- `src/components/home/` — homepage sections
- `src/components/booking/` — airport autocomplete, passenger dropdown, date fields
- `src/pages/` — route pages
- `src/styles/flyupline.css` — styles extracted from the original site (only the rules these pages use)
- `src/styles/custom-react.css` — small React-port additions (date popover, select styling, preloader fade)
- `public/assets/` — original site images, fonts, and the airport dataset (`assets/data/airports.json`, pre-filtered to IATA airports)

## Notes

- Sliders use [Swiper](https://swiperjs.com/react) with the same settings (speed, autoplay, fade effects, breakpoints) as the original site's `custom.js`.
- The jQuery daterangepicker was replaced by a small React popover with native date inputs; values format identically ("17 Jul - 24 Jul - 2026", "Mar 5, 2026").
- This is a single-page app: when deploying, configure your host to serve `index.html` for all routes (SPA fallback). A `robots.txt` and `sitemap.xml` ship in `public/`.

## Forms / going live

Quote and contact forms submit via `fetch` and show a branded success panel or an
error notice with direct contact details. The endpoints live in one place —
`src/lib/submitRequest.js`:

```js
export const ENDPOINTS = {
  roundtrip: '/roundtrip.php',
  oneway: '/oneway.php',
  multicity: '/multicity.php',
  contact: '/contact.php',
}
```

Point these at your live handlers (the original PHP scripts, a serverless
function, or a form service) before launch. In local dev they return 404, so
submitting shows the error notice — that's expected until the backend is wired.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Contact and speaker suggestion spam protection

The contact and speaker suggestion forms require Cloudflare Turnstile in Managed mode.
Create a widget restricted to `desci.nyc` and `www.desci.nyc`, then configure:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: the public widget key, available at build time.
- `TURNSTILE_SECRET_KEY`: the private verification key, stored only in the hosting environment.
- `TURNSTILE_ALLOWED_HOSTNAMES`: comma-separated exact hostnames; defaults to `desci.nyc,www.desci.nyc`.

Rebuild and deploy after setting the keys. Missing configuration, invalid or reused
tokens, unexpected hostnames/actions, and verification outages reject the submission
before any email is sent. Existing honeypot and submission limits remain in place.
Tokens must match the form action (`contact_form` or `suggest_speaker`), so a token
from one form cannot be used on the other. The email-list signup has no CAPTCHA.

For local UI testing, use Cloudflare's documented test widget keys only in the local
environment. Do not configure test keys in production. Run `npm test` for mocked
server verification checks that do not send email or call Cloudflare.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

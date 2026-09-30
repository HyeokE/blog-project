This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Install with Bun 1.4.2 and run the development server:

```bash
bun install --frozen-lockfile
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The local `vercel.json` pins the deployment install command to `bunx bun@1.4.2 install --frozen-lockfile` and the build command to `bunx bun@1.4.2 run build`. Keep `bun.lock` in source control. This changes repository configuration only; it does not update the linked Vercel project's remote settings or deploy the app. Verify those settings before the next deployment. Framework detection remains Next.js; no Bun server runtime override is configured.

See [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json) and [pinning a Bun version](https://vercel.com/kb/guide/how-to-pin-a-specific-bun-version-for-vercel-builds).

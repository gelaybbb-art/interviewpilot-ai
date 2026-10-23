# InterviewPilot AI — Static Frontend + Secure API Worker (No local Node.js)

This version uses plain HTML/CSS/JavaScript on GitHub Pages and a Cloudflare Worker as a secure server-side proxy for the OpenAI API. You do not need Node.js or npm installed on your Windows computer.

## Files

- `index.html`, `style.css`, `app.js` — static website
- `worker/index.js` — backend code to deploy to Cloudflare Workers
- `.nojekyll` — helps GitHub Pages serve static files
- `README.md` — setup guide

## Before you begin

- Create an OpenAI API key in the OpenAI developer platform.
- API usage is billed separately from a ChatGPT subscription and may require API billing to be set up.
- Never put your API key in `app.js`, `index.html`, GitHub, or any other public frontend file.

## Deploy the secure backend without installing Node.js locally

1. Sign in to the Cloudflare dashboard and open **Workers & Pages**.
2. Create a Worker (choose the option to start with a basic/Hello World Worker).
3. Open its online editor and replace the starter code with the full contents of `worker/index.js`.
4. In the Worker settings, open **Variables and Secrets** (wording may vary).
5. Add a secret named `OPENAI_API_KEY` and paste your API key into the secret field. Do not paste it into source code.
6. Add a regular variable named `OPENAI_MODEL` with value `gpt-4.1-mini` if you want to choose the model explicitly.
7. Save and deploy the Worker.
8. Copy the deployed Worker URL, for example `https://your-worker-name.your-subdomain.workers.dev`.
9. Open that URL followed by `/health` in your browser. It should return JSON showing `ok: true` and `configured: true`.

Cloudflare dashboard labels can change. Use the online editor and secret/variable settings; you do not need Wrangler or a local terminal for this setup.

## Connect the frontend

1. Open `app.js`.
2. At the top, find:

   ```js
   const API_BASE_URL = "PASTE_YOUR_CLOUDFLARE_WORKER_URL_HERE";
   ```

3. Replace the placeholder with your deployed Worker URL, without a trailing slash, for example:

   ```js
   const API_BASE_URL = "https://your-worker-name.your-subdomain.workers.dev";
   ```

4. Save the file.

For local testing, double-click `index.html`. Browser voice recognition may require a secure context (HTTPS or localhost); typed questions can be used if speech recognition is unavailable.

## Publish the static frontend on GitHub Pages

1. Create a GitHub repository such as `interviewpilot-ai`.
2. Upload `index.html`, `style.css`, `app.js`, `.nojekyll`, and this README to the repository root. Do not upload secrets.
3. In repository **Settings → Pages**, configure deployment from the `main` branch and `/(root)`.
4. Wait for GitHub Pages to publish your site.
5. For a production setup, change the Worker CORS header in `worker/index.js` from `"*"` to your exact GitHub Pages origin, e.g. `https://YOUR-USERNAME.github.io`. For a project page this origin is still the host origin; the path is not included in the Origin header.
6. Redeploy the Worker and test the live website.

## Test the API

- Open your Worker URL plus `/health`; expected shape: `{"ok":true,"configured":true}`.
- In the website, type a question such as: `Tell me about a time you solved a technical problem.`
- The answer panel should display an AI-generated response and key points.

If you receive an API error, check that the Worker secret is named exactly `OPENAI_API_KEY`, the key is valid, your OpenAI API billing is configured, and the selected model is available to your API project.

## Notes and safeguards

- Browser speech recognition varies by browser. It may be processed by the browser's speech provider; this app does not upload raw audio to the Worker.
- The app asks for explicit confirmation before it starts voice capture. Use it only when everyone involved has permissioned the use and the interview rules allow it.
- The Worker includes basic per-isolate rate limiting, but this is not a full production rate limiter. Before public launch, restrict CORS to your site origin, add robust global rate limiting/abuse controls, set spending limits, and monitor usage.
- AI answers can be incorrect or generic. Check them and keep personal examples truthful.

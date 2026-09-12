<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/9ae79763-cfd8-425e-b1d4-e3e363896365

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Firebase web-app values. Add `GEMINI_API_KEY` only if Gemini-backed features are enabled.
3. Run the app:
   `npm run dev`

## Firebase setup

- Enable Google sign-in in Firebase Authentication.
- Create Firestore in production mode.
- Add each deployed domain to Authentication > Settings > Authorized domains.
- The server uses Application Default Credentials on Google Cloud. For local development, authenticate with the Google Cloud CLI or provide standard Firebase Admin credentials through your environment. Never commit a private key.

## Deploy

The app requires its Node/Express server for verified admin access, payment status, and Stripe webhooks. Deploy the repository as a server-backed service, set the variables documented in `.env.example`, run `npm run build`, and start it with `npm start`.

# Kamayagi Church of God – Website

Website and admin panel for **Kamayagi Church of God**, Kamayagi Market, Thagicu Sub-County, Mwingi North, Kitui County, Kenya.

All text, photos, service times, sermons, events, ministries, testimonies, giving details and live-stream links are stored in the database and edited from the admin panel at `/admin`. No code changes are needed to update the site.

## Pages

Home · About Us · Service Times · Ministries · Sermons · Events · Testimonies · Gallery · Watch Live (YouTube + Facebook) · Give (M-Pesa) · Contact · Prayer Request

## Admin panel (`/admin`)

- **Website content:** service times, sermons, events, ministries, testimonies (approve visitor submissions), photo gallery, church leaders
- **Settings:** church name, logo, colors, home page text and banner, about page, pastor, contact details and map, M-Pesa giving, live streaming, social media links
- **Go live button:** shows a "We are LIVE" banner across the site
- **Prayer Requests:** requests sent from the Prayer Request page, with "keep private" and "please call me" flags and a *Mark as prayed for* button
- **Messages:** contact form messages
- **Admins & Password:** add or remove admin accounts, change password

### Admin access levels

- The first admin is the **super admin** and can do everything.
- Only a super admin can add admins and choose what each one may use (each content type, Prayer Requests, Messages, and each Settings section). Areas an admin is not given are hidden from their menu and blocked.

### Login security

- An admin must log in again after leaving the admin panel: opening the public website, going to another site, closing the tab or browser, or opening the admin panel in a new tab.
- Admins are also logged out after 30 minutes without activity, or straight away with **Log out**.

## Run locally

Requirements: Node.js 20+ and MongoDB (local or Atlas).

```bash
cp .env.example .env   # edit values
npm install
npm run dev            # http://localhost:3000, admin at /admin
```

Without `ADMIN_EMAIL`/`ADMIN_PASSWORD` in development, the first admin is `admin@example.com` / `admin123`.

## Deploy for free (Render + MongoDB Atlas)

1. **Database:** create a free account at <https://www.mongodb.com/cloud/atlas>, create a free **M0** cluster, add a database user, and under *Network Access* allow `0.0.0.0/0`. Copy the connection string (`mongodb+srv://...`) and add a database name, e.g. `.../kamayagi?retryWrites=true&w=majority`.
2. **Website:** create a free account at <https://render.com>, choose **New → Blueprint**, and select this GitHub repository. Render reads `render.yaml`.
3. Fill in `MONGODB_URI`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` when asked, then deploy.
4. Open `https://<your-app>.onrender.com/admin`, log in and replace the placeholder content.

Note: Render's free plan sleeps after 15 minutes without visitors, so the first visit after that takes about a minute to load. Upgrading the Render plan removes this.

Uploaded photos are resized automatically and stored in MongoDB, so they survive restarts. The free Atlas cluster holds 512 MB, which is roughly 2,000+ photos.

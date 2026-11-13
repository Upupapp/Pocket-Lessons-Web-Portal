# Pocket Lessons · Teacher Web Portal

Teacher portal for **Pocket Lessons: Baong Aral Kahit Walang Signal**, a lesson channel that carries a teacher's recorded voice to struggling Grade 1 to 4 readers on the family phone, even without signal. A partnership of AHA Learning Center and UpUp Technologies.

> **Pilot preview.** This version saves everything in the browser (localStorage and IndexedDB). There is no server yet. All names and figures are sample data.

## What it does

| Area | Screens | What the teacher can do |
|---|---|---|
| Intro | Splash | Animated intro: the teacher's voice lesson travels to the phone by hotspot, phone to phone or online. Plays once per session; skippable. |
| Welcome | WEB-W1 to W3 | Three pages on how Pocket Lessons works. |
| Access | WEB-A2, WEB-A1 | Sign in, or join a center with an invitation code. |
| Dashboard | WEB-01 | Key numbers, lessons in progress, reading-level spread, children due a reading check, recent checks. |
| Create lessons | WEB-05 to WEB-13 | Lesson basics, pages with text, picture and **recorded voice**, tap-only activities, live **2 MB pack check**, reading-level assignment, child-view preview, versioned publishing. |
| Assess | WEB-02 to WEB-04 | Learners grouped by TaRL level, learner profile with level path, **reading-level placement** and **timed reading** with accuracy and words correct per minute. |

## Run it locally

Needs Node.js 22 or newer.

```bash
npm install
npm start            # http://localhost:4200
```

On Windows you can also double-click `run-local.cmd`.

Sign in with the sample account (button on the sign-in page), or join with a preview invitation code: `TONDO-2027`, `SUNRISE-2027`, `SMOKEY-2027`, `TRIAS-2027`.

Recording needs a microphone and a secure address (`localhost` or `https`).

Other commands:

```bash
npm run build        # production build in dist/pocket-lessons-portal/browser
npm test             # unit tests (Vitest)
```

## Deploy on Netlify

Connect this repository in Netlify. `netlify.toml` sets the build command, the publish folder, the redirect that keeps deep links working, and `noindex` headers. No extra settings are needed.

## Project layout

```
src/app/
  core/        models, browser storage, auth, data service, route guards
  splash/      animated intro
  layout/      signed-in shell with sidebar
  shared/      logo, voice recorder, picture tools
  pages/       welcome, sign-in, overview, lessons, lesson-editor, learners, learner-detail, assess
```

`core/data.service.ts` and `core/auth.service.ts` are the only files that read or write storage. When the Node API is ready, swap their load and save calls for API calls; the pages do not change.

## Not in this version

- Server, real accounts and multi-device sync (needs the Node API and database)
- Word-by-word timing in the read-along editor (the preview spreads highlights evenly)
- Hotspot box distribution, reading-recording inbox, follow-up queue, reports and program admin
- Reset data: clear this site's storage in the browser settings

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
| Create lessons | WEB-05 to WEB-13 | Lesson basics, pages with text, picture and **recorded voice**, tap-only activities with 2 to 4 choices and a recorded question, practice words, live **2 MB pack check**, reading-level assignment, child-view preview, versioned publishing. |
| Import a lesson file | Lessons → Import | Upload a reading lesson PDF (story, comprehension questions, answer key) or paste its text. The portal splits the story into short lessons of about 100 words on one learning path, picks practice words, makes "tap the word you hear" activities, and turns the questions into a **checkpoint** (pass mark 80%, proposed). The file is read in the browser; nothing is uploaded. |
| Child-view preview | Lesson editor → Preview as the child | A phone that plays the lesson as the child sees it, offline: start on the path, read along with the teacher's voice, tap answers with a hint and a second try (one try in the checkpoint), and a finish screen with the learning-day sun and review words. Notes beside the phone explain each screen. |
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
  core/        models, browser storage, auth, data service, route guards,
               lesson-import (story/question/key parser and unit planner), pdf-text (pdf.js reader)
  splash/      animated intro
  layout/      signed-in shell with sidebar
  shared/      logo, coach character, voice recorder, picture tools
  pages/       welcome, sign-in, overview, lessons, lesson-import, lesson-editor, learners, learner-detail, assess
```

`core/data.service.ts` and `core/auth.service.ts` are the only files that read or write storage. When the Node API is ready, swap their load and save calls for API calls; the pages do not change.

## Not in this version

- Server, real accounts and multi-device sync (needs the Node API and database)
- Word-by-word timing in the read-along editor (the preview spreads highlights evenly)
- Reading scanned PDFs (pictures of text) or Word files; paste the text instead
- Spaced review on the phone and the "Ready to move up" list (they need the mobile app and the API)
- Hotspot box distribution, reading-recording inbox, follow-up queue, reports and program admin
- Reset data: clear this site's storage in the browser settings

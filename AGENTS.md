# AGENTS.md — Projekt- & Ökosystem-Kontext

> **Zweck dieser Datei:** Dauerhaftes Gedächtnis für KI-Agenten (und Menschen),
> die an diesem Projekt arbeiten. Ein neuer Agent startet ohne Vorwissen — diese
> Datei bringt ihn sofort auf Stand.
>
> **WICHTIG — Pflege:** Diese Datei muss aktuell gehalten werden. Wer das
> Datenmodell, den Auth-Flow, die Routen oder das Zusammenspiel der Repos ändert,
> aktualisiert hier den passenden Abschnitt im selben PR. "Immer den Ordner fit
> halten."

---

## 1. Das große Ganze: drei Repos, eine Datenbank

Dieses Repo (`coach-customer-app`) ist **eine von drei** Komponenten eines
Coaching-Systems. Alle drei teilen sich **dieselbe Supabase-(Postgres-)Datenbank**.

```
                    ┌─────────────────────────────────────┐
                    │      Supabase (Postgres) — geteilt   │
                    └─────────────────────────────────────┘
                        ▲              ▲               ▲
        schreibt Logs   │   liest/     │   liest        │
        & Profile       │   schreibt   │   (überw. read)│
                        │              │               │
   ┌────────────────┐   │   ┌──────────────────┐   ┌──────────────────────┐
   │  coach-bot     │───┘   │  coach-app       │   │ coach-customer-app   │
   │ Python/FastAPI │       │ Next.js          │   │ Next.js  ← DIESES REPO│
   │ Telegram+Claude│       │ Coach-Dashboard  │   │ Kunden-PWA           │
   └────────────────┘       │ + KI-Planer      │   │ Login via Telegram   │
   Kunde chattet            └──────────────────┘   └──────────────────────┘
   per Telegram             Coach verwaltet         Kunde sieht Pläne,
                            Kunden + Pläne          loggt Workouts
```

| Repo | Tech | Rolle |
|---|---|---|
| `Attila0604/coach-bot` | Python, FastAPI, Anthropic Claude, Railway | **Eingang.** Telegram-Onboarding (Intake-Agent), Food-Logging per Text & Foto (Vision), Coach-Quick-Commands. Schreibt `customers`, `customer_profiles`, `food_logs`, `messages`, `conversation_states`. |
| `Attila0604/coach-app` | Next.js 14, Supabase-Auth, Claude (Sonnet) | **Coach-Steuerzentrale.** E-Mail/Passwort-Login, KI-Trainingsplan-Generator, Meal-Plan-Editor, Kunden-Monitoring. Schreibt `training_plans/days/exercises`, `meal_plans`, `coach_notes`, Makro-Ziele. |
| `Attila0604/coach-customer-app` | Next.js 14, Supabase | **Dieses Repo. Kunden-Frontend.** Telegram-Magic-Code-Login, zeigt Dashboard/Ernährung/Training, eigener Workout-Player. Schreibt `workout_sessions`, `workout_logs`. |

> Aus einem Cloud-Agent heraus ist standardmäßig nur **dieses** Repo
> commit-/push-bar. Die anderen beiden bei Bedarf read-only klonen
> (`git clone .../coach-app` bzw. `.../coach-bot`) als Referenz.

---

## 2. Dieses Repo (`coach-customer-app`) im Detail

**Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Supabase
(`@supabase/ssr` + `@supabase/supabase-js`). Mobile-first (`max-w-md`), dunkler
"Premium"-Look (Farben `ink`/`bone`/`gold`, Serifen-Font Fraunces, Sans Inter).
Sprache durchgängig Deutsch.

### Auth (passwortlos, via Telegram)
- `app/page.tsx` — Login: Telegram-Username → fordert Code an.
- `app/api/auth/request-code/route.ts` — erzeugt 6-stelligen Code, speichert in
  `magic_codes`, versendet ihn per **Telegram-Bot** (`TELEGRAM_BOT_TOKEN`).
- `app/login/verify/page.tsx` + `app/api/auth/verify-code/route.ts` — prüft Code,
  setzt httpOnly-Cookie `coach_customer_id` (30 Tage).
- `app/api/auth/logout/route.ts` — löscht Cookie.
- `middleware.ts` — schützt alle `/me`-Routen (Redirect auf `/` ohne Cookie).

### Geschützter Bereich `/me`
- `app/me/page.tsx` — Dashboard: Begrüßung, Streak, Wochen-Kalorien, Makros heute,
  Check-in, Coach-Tipp/Nachricht, letzte Aktivität.
- `app/me/nutrition/page.tsx` — Ernährungsplan (veröffentlichte `meal_plans`,
  14-Tage-Streifen).
- `app/me/training/page.tsx` — Trainingsplan, Wochenübersicht, heutiges Workout.
- `app/me/training/session/[sessionId]/page.tsx` + `components/workout/WorkoutPlayer.tsx`
  — Workout-Player: Satz-Logging, Rest-Timer, Pause/Abbruch, PR-Erkennung,
  Abschluss-Statistik.
- `components/workout/StartWorkoutButton.tsx` — startet/setzt Sessions fort.

### Supabase-Clients (`lib/supabase/`)
- `admin.ts` — Service-Role-Key (umgeht RLS, serverseitig). **Wird aktuell überall
  genutzt**, da der Kunde keinen eigenen Supabase-Auth-User hat (Session läuft über
  das eigene Cookie).
- `server.ts` / `client.ts` — SSR-/Browser-Clients (vorbereitet, kaum genutzt).

### Server Actions (`lib/actions/workout.ts`)
Start/Resume, `logSet`, `deleteSetLog`, `completeWorkoutSession` (Volumen + PR),
`abortWorkoutSession`, `pause`/`resume`, `getActiveSession`, `getRecentWorkoutSessions`.
Jede Action prüft `customer_id` aus Cookie gegen Ownership.

### Env-Variablen
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`.

---

## 3. Geteiltes Datenmodell (Supabase)

Tabellen und wer sie wie nutzt (B = coach-bot, A = coach-app, C = coach-customer-app):

| Tabelle | B | A | C | Zweck |
|---|---|---|---|---|
| `coaches` | r/w | r (Auth, Rolle, Scoping) | — | Coach-Konten; `role` (`admin` sieht alle), `user_id` (Supabase-Auth), `telegram_chat_id` |
| `customers` | r/w | r/w | r | Kunden; `status` (`intake/active/paused/archived`), `telegram_chat_id`, `telegram_username`, `coach_id` |
| `customer_profiles` | w (Intake) | r/w (Ziele, KI-Input) | r | Profil + Makro-Ziele (`daily_kcal_target` etc.) |
| `food_logs` | w | r (Monitoring) | r (Dashboard) | Mahlzeiten; `meal_type` **deutsch** (`fruehstueck/mittag/abend/snack`) |
| `checkins` | (w geplant) | r | r | Wöchentliche Check-ins; `weight_kg`, `mood_rating`, `week_of` |
| `messages` | r/w | r (Stream) | — | Chat-Historie; `direction` = `'in'`/`'out'`, `tokens_used` (Cost-Tracking) |
| `conversation_states` | r/w | — | — | Multi-Step-Flow-State des Bots (Intake) |
| `magic_codes` | — | — | r/w | Einmal-Login-Codes der Kunden-App |
| `coach_notes` | — | w | r | Coach-Nachrichten (global oder pro Kunde), `is_active`, `expires_at` |
| `training_plans` | — | r/w (KI + Editor) | r | `status` (`draft/active/paused/completed`), `weeks`, `current_week` |
| `training_days` | — | r/w | r | `weekday` (0=Mo..6=So), `time_of_day`, `day_number`, `sort_order` |
| `exercises` | — | r/w | r | `sets`, `reps_min/max`, `weight_kg`, `weight_type` (`kg/body/band`), `rest_seconds` |
| `workout_sessions` | — | r (Monitoring) | r/w | `status` (`in_progress/paused/completed/aborted`), `total_duration_seconds` |
| `workout_logs` | — | r | r/w | Pro Satz: `set_number`, `reps_done`, `weight_used_kg` |
| `meal_plans` | — | r/w | r | Ernährungsplan; `status` (`published`), `plan_date`, `meals` (jsonb), Makros. `meals[].meal_type` **englisch** (`breakfast/lunch/dinner/snack`) |
| `scheduled_reminders` | r/w | — | — | Geplante Erinnerungen |

---

## 4. Offene Punkte / bekannte Inkonsistenzen

> Beim Beheben hier abhaken/aktualisieren. **Stand: alle 6 Punkte adressiert.**

1. ~~**Unversioniertes DB-Schema.** Die später hinzugefügten Tabellen
   (`training_*`, `workout_*`, `meal_plans`, `coach_notes`, `magic_codes`) und Felder
   waren nur live in Supabase, nicht versioniert.~~ ✅ Behoben — rekonstruiertes Schema
   unter `db/schema.reference.sql` (PR #5). **To-do:** durch echten
   `supabase db dump` ersetzen, sobald verfügbar.
2. ~~**Zeitzonen-Inkonsistenz.** `nutrition`/`training` nutzten Server-Lokalzeit
   statt `Europe/Vienna` → auf Vercel (UTC) falsches "heute".~~ ✅ Behoben —
   gemeinsame DST-sichere Helfer in `lib/date.ts` (PR #3).
3. ~~**Falsch benannter Ordner** `app/me Dateiname: loading.tsx/loading.tsx`.~~
   ✅ Behoben — Datei liegt jetzt unter `app/me/loading.tsx` (PR #2).
4. ~~**Debug-Logs** in `app/page.tsx` (`handleSubmit`).~~ ✅ Behoben — entfernt (PR #2).
5. ~~**`meal_type`-Konvention uneinheitlich** (`food_logs` deutsch vs.
   `meal_plans.meals` englisch).~~ ✅ Konsumseite robust gemacht — zentrale
   Normalisierung in `lib/meals.ts` (PR #4). Die DB-Konvention selbst bleibt
   uneinheitlich (bewusst, da Änderung Bot + Coach-App + Migration beträfe).
6. ~~**Toter Code:** `coach-app` prüfte `messages.direction === 'outbound'`, das
   DB-Enum kennt nur `'in'`/`'out'`.~~ ✅ Behoben im Repo `coach-app`.

### Neue / verbleibende To-dos
- `db/schema.reference.sql` durch echten `supabase db dump` ersetzen (autoritativ).
- Optional: `package-lock.json` in `coach-customer-app` einchecken (reproduzierbare Builds).
- `AGENTS.md` auch in `coach-bot` und `coach-app` anlegen (eigene Agenten je Repo).

---

## 5. Konventionen & Arbeitsweise

- **Sprache:** UI-Texte und Commit-/PR-Beschreibungen auf Deutsch.
- **Branches:** `cursor/<beschreibung>-8d20`, off `main`. Pro logischer Änderung ein Commit.
- **PRs:** Standardmäßig Draft; Basis `main`.
- **Style:** Tailwind, Palette `ink`/`bone`/`gold` (s. `tailwind.config.ts`), keine
  überflüssigen Kommentare im Code.
- **Zeit:** Neue datumsbezogene Logik immer `Europe/Vienna`-sicher (Helfer aus
  `app/me/page.tsx` bzw. `coach-app` übernehmen).

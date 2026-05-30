-- ============================================================================
-- REKONSTRUIERTE SCHEMA-REFERENZ — coach-* Ökosystem (Supabase / Postgres)
-- ============================================================================
--
-- HERKUNFT & STATUS — BITTE LESEN:
--   * Die acht Basistabellen stammen aus `coach-bot/sql/001_init.sql` (MVP).
--   * ALLE weiteren Tabellen/Spalten wurden aus den Queries der drei Repos
--     (coach-bot, coach-app, coach-customer-app) REKONSTRUIERT — sie sind in
--     der Live-Supabase vorhanden, waren aber bisher NICHT versioniert.
--   * Das ist daher eine BEST-EFFORT-Referenz, KEIN Dump der Produktion.
--     Typen, Defaults, Constraints und Indizes sind plausibel gewählt, aber
--     nicht garantiert deckungsgleich mit der echten DB.
--
-- AUTORITATIVE QUELLE:
--   Den echten Stand bitte aus Supabase ziehen und damit abgleichen:
--     supabase db dump --schema public > db/schema.sql
--   Danach diese Referenz durch den echten Dump ersetzen.
--
-- Verwendung der Tabellen (B=coach-bot, A=coach-app, C=coach-customer-app):
--   siehe AGENTS.md, Abschnitt "Geteiltes Datenmodell".
-- ============================================================================

-- ============================================================================
-- BASIS (aus coach-bot/sql/001_init.sql)
-- ============================================================================

create table if not exists coaches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  telegram_chat_id bigint unique,           -- Admin-Benachrichtigungen
  brand_voice text,                         -- "locker, motivierend, du-Form"
  default_currency text default 'EUR',
  is_active boolean default true,
  created_at timestamptz default now(),
  -- Ergänzungen (rekonstruiert, von coach-app genutzt):
  user_id uuid,                             -- FK auf auth.users(id) (Supabase-Auth)
  role text default 'coach'                 -- 'admin' sieht alle Kunden
    check (role in ('admin', 'coach'))
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete restrict,
  telegram_chat_id bigint unique not null,
  telegram_username text,
  first_name text not null,
  status text not null default 'intake'
    check (status in ('intake', 'active', 'paused', 'archived')),
  onboarded_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_customers_coach on customers(coach_id);

create table if not exists customer_profiles (
  customer_id uuid primary key references customers(id) on delete cascade,
  age int,
  gender text check (gender in ('m', 'f', 'd')),
  height_cm int,
  weight_start_kg numeric(5,2),
  weight_target_kg numeric(5,2),
  goal text check (goal in ('abnehmen', 'muskelaufbau', 'erhalt', 'ausdauer')),
  experience_level text check (experience_level in ('anfaenger', 'fortgeschritten', 'profi')),
  equipment text check (equipment in ('home_none', 'home_basic', 'gym')),
  allergies text[],
  food_preferences text[],
  daily_kcal_target int,
  protein_target_g int,
  carbs_target_g int,
  fat_target_g int,
  notes text,
  updated_at timestamptz default now()
);

create table if not exists food_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  logged_at timestamptz default now(),
  meal_type text check (meal_type in ('fruehstueck', 'mittag', 'abend', 'snack')),
  raw_description text not null,
  parsed_items jsonb,
  total_kcal int,
  protein_g numeric(5,1),
  carbs_g numeric(5,1),
  fat_g numeric(5,1)
);
create index if not exists idx_food_logs_customer_date
  on food_logs(customer_id, logged_at desc);

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  week_of date not null,
  weight_kg numeric(5,2),
  waist_cm numeric(5,1),
  hip_cm numeric(5,1),
  energy_rating int check (energy_rating between 1 and 10),
  sleep_rating int check (sleep_rating between 1 and 10),
  mood_rating int check (mood_rating between 1 and 10),
  notes text,
  created_at timestamptz default now(),
  unique(customer_id, week_of)
);
create index if not exists idx_checkins_customer_week
  on checkins(customer_id, week_of desc);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  content text not null,
  agent_name text,                          -- 'intake', 'food_log', ...
  model_used text,
  tokens_used int,
  created_at timestamptz default now()
);
create index if not exists idx_messages_customer_time
  on messages(customer_id, created_at desc);

create table if not exists scheduled_reminders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  reminder_type text not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_reminders_pending
  on scheduled_reminders(scheduled_for) where sent_at is null;

create table if not exists conversation_states (
  customer_id uuid primary key references customers(id) on delete cascade,
  current_flow text,
  current_step text,
  state_data jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- ============================================================================
-- AUTH-LOGIN DER KUNDEN-APP (coach-customer-app)
-- ============================================================================

-- Einmal-Login-Codes, per Telegram zugestellt (request-code / verify-code).
create table if not exists magic_codes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  code text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_magic_codes_customer
  on magic_codes(customer_id, created_at desc);

-- ============================================================================
-- COACH-NACHRICHTEN / NOTIZEN (coach-app schreibt, coach-customer-app liest)
-- ============================================================================

-- customer_id NULL = globale Notiz für alle Kunden des Coaches.
create table if not exists coach_notes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  content text not null,
  is_active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_coach_notes_customer
  on coach_notes(customer_id, is_active, created_at desc);

-- ============================================================================
-- TRAININGSPLÄNE (coach-app erstellt, coach-customer-app zeigt + Player)
-- ============================================================================

create table if not exists training_plans (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  coach_id uuid not null references coaches(id) on delete restrict,
  name text not null,
  weeks int not null default 4,
  current_week int not null default 1,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'completed')),
  start_date date,
  notify_telegram boolean default true,
  notify_coach_telegram boolean default false,
  reminder_minutes_before int default 30,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_training_plans_customer
  on training_plans(customer_id, status);

create table if not exists training_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references training_plans(id) on delete cascade,
  day_number int not null,
  title text not null,
  subtitle text,
  sort_order int not null default 0,
  weekday smallint check (weekday between 0 and 6),  -- 0=Mo .. 6=So (DB-Konvention)
  time_of_day time,
  created_at timestamptz default now()
);
create index if not exists idx_training_days_plan
  on training_days(plan_id, sort_order);

create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references training_days(id) on delete cascade,
  sort_order int not null default 0,
  name text not null,
  sets int,
  reps_min int,
  reps_max int,
  weight_kg numeric(6,2),
  weight_type text default 'kg' check (weight_type in ('kg', 'body', 'band')),
  notes text,
  rest_seconds int,
  created_at timestamptz default now()
);
create index if not exists idx_exercises_day
  on exercises(day_id, sort_order);

-- ============================================================================
-- WORKOUT-SESSIONS / -LOGS (coach-customer-app schreibt beim Training)
-- ============================================================================

create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  plan_id uuid references training_plans(id) on delete set null,
  day_id uuid references training_days(id) on delete set null,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'paused', 'completed', 'aborted')),
  started_at timestamptz default now(),
  ended_at timestamptz,
  total_duration_seconds int,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_workout_sessions_customer
  on workout_sessions(customer_id, started_at desc);

create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  set_number int not null,
  reps_done int,
  weight_used_kg numeric(6,2),
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_workout_logs_session
  on workout_logs(session_id);
create index if not exists idx_workout_logs_exercise
  on workout_logs(exercise_id);

-- ============================================================================
-- ERNÄHRUNGSPLÄNE (coach-app erstellt + published, coach-customer-app zeigt)
-- ============================================================================

-- meals = jsonb-Array. WICHTIG: meals[].meal_type ist ENGLISCH
-- (breakfast/lunch/dinner/snack) — abweichend von food_logs.meal_type (deutsch).
create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  coach_id uuid references coaches(id) on delete set null,
  plan_date date not null,
  plan_type text default 'weekly',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'replaced')),
  meals jsonb default '[]'::jsonb,
  total_kcal int,
  total_protein_g numeric(6,1),
  total_carbs_g numeric(6,1),
  total_fat_g numeric(6,1),
  ai_model text,
  ai_summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_meal_plans_customer_date
  on meal_plans(customer_id, plan_date);
create index if not exists idx_meal_plans_published
  on meal_plans(customer_id, status, plan_date);

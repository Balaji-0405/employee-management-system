CREATE TABLE IF NOT EXISTS calendar_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID        REFERENCES employees(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  description     TEXT,
  event_date      DATE        NOT NULL,
  start_time      TIME,
  end_time        TIME,
  event_type      TEXT        DEFAULT 'personal'
                              CHECK (event_type IN (
                                'personal','meeting','reminder',
                                'deadline','holiday','team','company'
                              )),
  color           TEXT        DEFAULT 'blue',
  is_all_day      BOOLEAN     DEFAULT false,
  is_company_wide BOOLEAN     DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_employee
  ON calendar_events(employee_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_date
  ON calendar_events(event_date);

import type { ReviewNote, Session, Settings, TimerState } from "../types";

// Thin, defensive localStorage wrappers. All app state that must survive a
// reload / screen-lock lives here (doc §4-1, §7).

const K = {
  timer: "st.timer.v1",
  sessions: "st.sessions.v1",
  notes: "st.notes.v1",
  todos: "st.todos.v1",
  settings: "st.settings.v1",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
}

export const DEFAULT_SETTINGS: Settings = { studyDayStart: 5, rowHeight: 30 };

export const DEFAULT_TIMER: TimerState = {
  selectedId: 1,
  running: false,
  liveStartTs: 0,
  sittingBase: 0,
};

export const loadTimer = () => read<TimerState>(K.timer, DEFAULT_TIMER);
export const saveTimer = (t: TimerState) => write(K.timer, t);

export const loadSessions = () => read<Session[]>(K.sessions, []);
export const saveSessions = (s: Session[]) => write(K.sessions, s);

export const loadNotes = () => read<ReviewNote[]>(K.notes, []);
export const saveNotes = (n: ReviewNote[]) => write(K.notes, n);

export const loadTodos = () => read<Record<string, boolean>>(K.todos, {});
export const saveTodos = (t: Record<string, boolean>) => write(K.todos, t);

export const loadSettings = () => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(K.settings, {}) });
export const saveSettings = (s: Settings) => write(K.settings, s);

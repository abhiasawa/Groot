// ──────────────────────────────────────────────
// Shared API response types for Groot
// Used by both the web portal and the mobile app
// ──────────────────────────────────────────────

// ── Primitives / reusable fragments ──────────

export interface Memory {
  id: string;
  content: string;
  media_url?: string | null;
  media_description?: string | null;
  message_type: string;
  metadata?: Record<string, unknown> | null;
  card_category?: "task" | "idea" | "reflection" | "emotion" | "media" | null;
  bookmarked?: boolean;
  created_at: string;
  /** Groot's preceding message that prompted this user message (computed at query time) */
  context_message?: string | null;
}

/** Stories share the same DB shape as memories. */
export type Story = Memory;

export interface Habit {
  id: string;
  name: string;
  category: string;
  target_value: number;
  target_unit: string;
  frequency?: string;
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
  recentCheckins?: string[];
}

export interface Task {
  id: string;
  content: string;
  category: string | null;
  is_completed: boolean;
  due_date: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  week_start: string;
  week_end: string;
  summary: string;
  key_topics: string[] | null;
  mood_trend: string | null;
  insights: string | null;
  created_at: string;
}

export interface Topic {
  name: string;
  memoryCount: number;
  lastMentioned: string;
  dominantMood: string | null;
  sampleMemories: TopicMemory[];
}

export interface TopicMemory {
  id: string;
  content: string;
  message_type: string;
  created_at: string;
  mood: string | null;
}

export interface Person {
  name: string;
  relationship: string | null;
  context?: string | null;
  lastMentioned: string | null;
  mentionCount: number;
  source: "profile" | "contacts" | "ai_detected";
}

export interface ProfileFact {
  id: string;
  key: string;
  value: string;
  confidence: number;
  source: string;
  lastMentioned: string | null;
}

export interface Preferences {
  morning_checkin: boolean;
  evening_journal: boolean;
  weekly_report: boolean;
  feature_tips: boolean;
  [key: string]: boolean;
}

export interface CurrentUser {
  id: string;
  whatsapp_number: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  onboarding_step: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
}

// ── Flashback ────────────────────────────────

export interface Flashback {
  content: string;
  created_at: string;
}

// ── Recent memory (subset used in home) ──────

export interface RecentMemory {
  id: string;
  message_type: string;
  content: string;
  created_at: string;
}

// ── Daily mood entry ─────────────────────────

export interface DailyMood {
  date: string;
  mood: string;
  score: number;
}

export interface WeeklyTrend {
  weekStart: string;
  avgScore: number;
}

// ── API response envelopes ───────────────────

/** GET /api/memories */
export interface MemoriesResponse {
  memories: Memory[];
  total: number;
}

/** GET /api/memories?month=YYYY-MM (calendar dots) */
export interface CalendarDotsResponse {
  dates: string[];
}

/** GET /api/stories */
export interface StoriesResponse {
  stories: Story[];
  total: number;
}

/** GET /api/stories?stats=true */
export interface StoryStats {
  total: number;
  thisMonth: number;
  lastMonth: number;
  streak: number;
  topTags: { tag: string; count: number }[];
}

/** GET /api/mood */
export interface MoodResponse {
  dailyMoods: DailyMood[];
  weeklyTrend: WeeklyTrend[];
  recentMood: string | null;
}

/** GET /api/habits */
export interface HabitsResponse {
  habits: Habit[];
}

/** GET /api/tasks */
export interface TasksResponse {
  tasks: Task[];
}

/** GET /api/reports */
export interface ReportsResponse {
  reports: Report[];
}

/** GET /api/topics */
export interface TopicsData {
  topics: Topic[];
  totalTopics: number;
  totalTaggedMemories: number;
}

/** GET /api/people */
export interface PeopleResponse {
  people: Person[];
}

/** GET /api/profile */
export interface ProfileData {
  facts: {
    static: ProfileFact[];
    dynamic: ProfileFact[];
    preference: ProfileFact[];
    goal: ProfileFact[];
  };
}

/** GET /api/settings */
export interface SettingsResponse {
  preferences: Preferences;
}

/** GET /api/me */
export interface MeResponse {
  user: CurrentUser;
}

// ── Mutation payloads ────────────────────────

/** PATCH /api/tasks body */
export interface ToggleTaskPayload {
  taskId: string;
  is_completed: boolean;
}

/** PATCH /api/settings body */
export interface UpdatePreferencePayload {
  key: string;
  value: boolean;
}

/** DELETE /api/profile body */
export interface DeleteProfileFactPayload {
  factId: string;
}

/** POST /api/mood body */
export interface RecordMoodPayload {
  mood: string;
}

/** POST /api/mood response */
export interface RecordMoodResponse {
  ok: true;
  mood: string;
  score: number;
}

/** POST /api/habits body */
export interface CreateHabitPayload {
  name: string;
  category?: string;
  target_value?: number;
  target_unit?: string;
  frequency?: string;
}

/** POST /api/habits response */
export interface CreateHabitResponse {
  ok: true;
  habit: Habit;
}

/** PUT /api/habits body */
export interface UpdateHabitPayload {
  habitId: string;
  name?: string;
  target_value?: number;
  target_unit?: string;
  frequency?: string;
  category?: string;
}

/** DELETE /api/habits body */
export interface DeleteHabitPayload {
  habitId: string;
}

/** POST /api/habits/checkin body */
export interface HabitCheckinPayload {
  habitId: string;
  value?: number;
  note?: string;
}

/** POST /api/habits/checkin response */
export interface HabitCheckinResponse {
  ok: true;
  streak: {
    current_streak: number;
    longest_streak: number;
    last_checkin_date: string | null;
  };
  isMilestone: boolean;
}

/** PUT /api/tasks body */
export interface UpdateTaskPayload {
  taskId: string;
  content?: string;
  due_date?: string | null;
  category?: string | null;
}

/** Generic success response from mutations */
export interface OkResponse {
  ok: true;
}

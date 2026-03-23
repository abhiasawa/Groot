import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";

import type {
  MemoriesResponse,
  CalendarDotsResponse,
  MeResponse,
  TasksResponse,
} from "../../../shared/types/api";

// ── Query key factory ────────────────────────

export const qk = {
  memories: (params?: MemoriesParams) => ["memories", params] as const,
  calendarDots: (yearMonth: string) => ["calendarDots", yearMonth] as const,
  currentUser: ["currentUser"] as const,
  tasks: ["tasks"] as const,
};

// ── Param types ──────────────────────────────

export interface MemoriesParams {
  q?: string;
  type?: string;
  date?: string;
  limit?: number;
  offset?: number;
}

// ── Hooks ────────────────────────────────────

/** GET /api/memories */
export function useMemories(params?: MemoriesParams) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.type) search.set("type", params.type);
  if (params?.date) search.set("date", params.date);
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));

  const qs = search.toString();
  const path = `/api/memories${qs ? `?${qs}` : ""}`;

  return useQuery<MemoriesResponse>({
    queryKey: qk.memories(params),
    queryFn: () => apiFetch<MemoriesResponse>(path),
    staleTime: 30_000,
  });
}

/** GET /api/memories?month=YYYY-MM (calendar dots) */
export function useCalendarDots(yearMonth: string) {
  return useQuery<CalendarDotsResponse>({
    queryKey: qk.calendarDots(yearMonth),
    queryFn: () =>
      apiFetch<CalendarDotsResponse>(`/api/memories?month=${yearMonth}`),
    staleTime: 30_000,
    enabled: !!yearMonth,
  });
}

/** GET /api/me */
export function useCurrentUser() {
  return useQuery<MeResponse>({
    queryKey: qk.currentUser,
    queryFn: () => apiFetch<MeResponse>("/api/me"),
    staleTime: 300_000,
  });
}

// ── Tasks ────────────────────────────────────

/** GET /api/tasks */
export function useTasks() {
  return useQuery<TasksResponse>({
    queryKey: qk.tasks,
    queryFn: () => apiFetch<TasksResponse>("/api/tasks"),
    staleTime: 15_000,
  });
}

/** PATCH /api/tasks — toggle completion */
export async function toggleTask(taskId: string, is_completed: boolean) {
  return apiFetch("/api/tasks", {
    method: "PATCH",
    body: JSON.stringify({ taskId, is_completed }),
  });
}

/** POST /api/tasks — create a task */
export async function createTask(
  content: string,
  category?: string,
  due_date?: string,
) {
  return apiFetch("/api/tasks", {
    method: "POST",
    body: JSON.stringify({ content, category, due_date }),
  });
}

/** DELETE /api/tasks — delete a task */
export async function deleteTask(taskId: string) {
  return apiFetch(`/api/tasks?taskId=${taskId}`, { method: "DELETE" });
}

// ── Habit types ─────────────────────────────

interface HabitWithStats {
  id: string;
  name: string;
  category: string;
  target_value: number | null;
  target_unit: string | null;
  frequency: string | null;
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
  recentCheckins?: string[];
}

interface HabitsResponse {
  habits: HabitWithStats[];
}

/** GET /api/habits */
export function useHabits(includeCheckins = false) {
  const path = includeCheckins ? "/api/habits?include=checkins" : "/api/habits";
  return useQuery<HabitsResponse>({
    queryKey: ["habits", { includeCheckins }],
    queryFn: () => apiFetch<HabitsResponse>(path),
    staleTime: 30_000,
  });
}

// ── Mood types ──────────────────────────────

interface DailyMood {
  date: string;
  mood: string;
  score: number;
}

interface WeeklyTrend {
  weekStart: string;
  avgScore: number;
}

interface MoodResponse {
  dailyMoods: DailyMood[];
  weeklyTrend: WeeklyTrend[];
  recentMood: string | null;
}

/** GET /api/mood */
export function useMoodData(year?: number) {
  const y = year ?? new Date().getFullYear();
  return useQuery<MoodResponse>({
    queryKey: ["mood", y],
    queryFn: () => apiFetch<MoodResponse>(`/api/mood?year=${y}`),
    staleTime: 60_000,
  });
}

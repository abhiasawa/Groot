import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";

import type {
  HomeData,
  MemoriesResponse,
  CalendarDotsResponse,
  StoriesResponse,
  StoryStats,
  MoodResponse,
  TasksResponse,
  ReportsResponse,
  TopicsData,
  PeopleResponse,
  ProfileData,
  SettingsResponse,
  MeResponse,
} from "../../../shared/types/api";

// ── Query key factory ────────────────────────

export const qk = {
  home: ["home"] as const,
  memories: (params?: MemoriesParams) => ["memories", params] as const,
  calendarDots: (yearMonth: string) => ["calendarDots", yearMonth] as const,
  stories: ["stories"] as const,
  storyStats: ["storyStats"] as const,
  mood: (year: number) => ["mood", year] as const,
  tasks: ["tasks"] as const,
  reports: ["reports"] as const,
  topics: ["topics"] as const,
  people: ["people"] as const,
  profile: ["profile"] as const,
  settings: ["settings"] as const,
  currentUser: ["currentUser"] as const,
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

/** GET /api/garden/home */
export function useHome() {
  return useQuery<HomeData>({
    queryKey: qk.home,
    queryFn: () => apiFetch<HomeData>("/api/garden/home"),
    staleTime: 30_000,
  });
}

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

/** GET /api/stories */
export function useStories() {
  return useQuery<StoriesResponse>({
    queryKey: qk.stories,
    queryFn: () => apiFetch<StoriesResponse>("/api/stories"),
    staleTime: 30_000,
  });
}

/** GET /api/stories?stats=true */
export function useStoryStats() {
  return useQuery<StoryStats>({
    queryKey: qk.storyStats,
    queryFn: () => apiFetch<StoryStats>("/api/stories?stats=true"),
    staleTime: 30_000,
  });
}

/** GET /api/mood?year=YYYY */
export function useMood(year: number) {
  return useQuery<MoodResponse>({
    queryKey: qk.mood(year),
    queryFn: () => apiFetch<MoodResponse>(`/api/mood?year=${year}`),
    staleTime: 60_000,
  });
}

/** GET /api/tasks */
export function useTasks() {
  return useQuery<TasksResponse>({
    queryKey: qk.tasks,
    queryFn: () => apiFetch<TasksResponse>("/api/tasks"),
    staleTime: 30_000,
  });
}

/** GET /api/reports */
export function useReports() {
  return useQuery<ReportsResponse>({
    queryKey: qk.reports,
    queryFn: () => apiFetch<ReportsResponse>("/api/reports"),
    staleTime: 30_000,
  });
}

/** GET /api/topics */
export function useTopics() {
  return useQuery<TopicsData>({
    queryKey: qk.topics,
    queryFn: () => apiFetch<TopicsData>("/api/topics"),
    staleTime: 60_000,
  });
}

/** GET /api/people */
export function usePeople() {
  return useQuery<PeopleResponse>({
    queryKey: qk.people,
    queryFn: () => apiFetch<PeopleResponse>("/api/people"),
    staleTime: 60_000,
  });
}

/** GET /api/profile */
export function useProfile() {
  return useQuery<ProfileData>({
    queryKey: qk.profile,
    queryFn: () => apiFetch<ProfileData>("/api/profile"),
    staleTime: 30_000,
  });
}

/** GET /api/settings */
export function useSettings() {
  return useQuery<SettingsResponse>({
    queryKey: qk.settings,
    queryFn: () => apiFetch<SettingsResponse>("/api/settings"),
    staleTime: 30_000,
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

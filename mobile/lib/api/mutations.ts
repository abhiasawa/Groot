import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { qk } from "./queries";

import type {
  ToggleTaskPayload,
  UpdatePreferencePayload,
  DeleteProfileFactPayload,
  OkResponse,
  TasksResponse,
  SettingsResponse,
  ProfileData,
  ProfileFact,
} from "../../../shared/types/api";

// ── Context types for optimistic mutations ───

interface TaskMutationContext {
  previous: TasksResponse | undefined;
}

interface SettingsMutationContext {
  previous: SettingsResponse | undefined;
}

interface ProfileMutationContext {
  previous: ProfileData | undefined;
}

// ── useToggleTask ────────────────────────────

/**
 * PATCH /api/tasks — toggle a task's completion status.
 * Optimistically flips `is_completed` in the cache.
 */
export function useToggleTask() {
  const queryClient = useQueryClient();

  return useMutation<
    OkResponse,
    Error,
    ToggleTaskPayload,
    TaskMutationContext
  >({
    mutationFn: (payload) =>
      apiFetch<OkResponse>("/api/tasks", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),

    onMutate: async (payload): Promise<TaskMutationContext> => {
      await queryClient.cancelQueries({ queryKey: qk.tasks });

      const previous = queryClient.getQueryData<TasksResponse>(qk.tasks);

      queryClient.setQueryData<TasksResponse>(
        qk.tasks,
        (old: TasksResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            tasks: old.tasks.map((t) =>
              t.id === payload.taskId
                ? { ...t, is_completed: payload.is_completed }
                : t,
            ),
          };
        },
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(qk.tasks, context.previous);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.tasks });
      // Home screen shows pending task count
      void queryClient.invalidateQueries({ queryKey: qk.home });
    },
  });
}

// ── useUpdatePreference ──────────────────────

/**
 * PATCH /api/settings — update a single notification preference.
 * Optimistically patches the preference in the cache.
 */
export function useUpdatePreference() {
  const queryClient = useQueryClient();

  return useMutation<
    OkResponse,
    Error,
    UpdatePreferencePayload,
    SettingsMutationContext
  >({
    mutationFn: (payload) =>
      apiFetch<OkResponse>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),

    onMutate: async (payload): Promise<SettingsMutationContext> => {
      await queryClient.cancelQueries({ queryKey: qk.settings });

      const previous =
        queryClient.getQueryData<SettingsResponse>(qk.settings);

      queryClient.setQueryData<SettingsResponse>(
        qk.settings,
        (old: SettingsResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            preferences: {
              ...old.preferences,
              [payload.key]: payload.value,
            },
          };
        },
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(qk.settings, context.previous);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.settings });
    },
  });
}

// ── useDeleteProfileFact ─────────────────────

/**
 * DELETE /api/profile — remove a profile fact.
 * Optimistically removes the fact from all category arrays in the cache.
 */
export function useDeleteProfileFact() {
  const queryClient = useQueryClient();

  return useMutation<
    OkResponse,
    Error,
    DeleteProfileFactPayload,
    ProfileMutationContext
  >({
    mutationFn: (payload) =>
      apiFetch<OkResponse>("/api/profile", {
        method: "DELETE",
        body: JSON.stringify(payload),
      }),

    onMutate: async (payload): Promise<ProfileMutationContext> => {
      await queryClient.cancelQueries({ queryKey: qk.profile });

      const previous = queryClient.getQueryData<ProfileData>(qk.profile);

      queryClient.setQueryData<ProfileData>(
        qk.profile,
        (old: ProfileData | undefined) => {
          if (!old) return old;

          const removeFact = (facts: ProfileFact[]) =>
            facts.filter((f) => f.id !== payload.factId);

          return {
            ...old,
            facts: {
              static: removeFact(old.facts.static),
              dynamic: removeFact(old.facts.dynamic),
              preference: removeFact(old.facts.preference),
              goal: removeFact(old.facts.goal),
            },
          };
        },
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(qk.profile, context.previous);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.profile });
      // People tab derives from profile facts
      void queryClient.invalidateQueries({ queryKey: qk.people });
    },
  });
}

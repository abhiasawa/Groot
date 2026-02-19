/**
 * Date/time detector — extracts temporal references from messages.
 *
 * Used by AI metadata extraction to parse reminder times.
 */

export interface DetectedReminder {
  content: string;
  remindAt: Date;
  rawTimeRef: string;
}

/**
 * Parse reminder text into a structured reminder with a resolved date.
 */
export function parseReminderText(text: string): DetectedReminder | null {
  const now = new Date();

  // Try relative time: "in X hours/minutes/days"
  const relativeMatch = text.match(
    /(.+?)\s+in\s+(\d+)\s*(hours?|hrs?|minutes?|mins?|days?)\s*$/i,
  );
  if (relativeMatch?.[1] && relativeMatch[2] && relativeMatch[3]) {
    const content = relativeMatch[1].trim();
    const amount = parseInt(relativeMatch[2]);
    const unit = relativeMatch[3].toLowerCase();
    const remindAt = new Date(now);

    if (unit.startsWith("hour") || unit.startsWith("hr")) {
      remindAt.setHours(remindAt.getHours() + amount);
    } else if (unit.startsWith("min")) {
      remindAt.setMinutes(remindAt.getMinutes() + amount);
    } else if (unit.startsWith("day")) {
      remindAt.setDate(remindAt.getDate() + amount);
    }

    return {
      content,
      remindAt,
      rawTimeRef: `in ${amount} ${unit}`,
    };
  }

  // Try "tomorrow at Xpm/am"
  const tomorrowMatch = text.match(
    /(.+?)\s+tomorrow(?:\s+at)?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*$/i,
  );
  if (tomorrowMatch?.[1] && tomorrowMatch[2]) {
    const content = tomorrowMatch[1].trim();
    const remindAt = new Date(now);
    remindAt.setDate(remindAt.getDate() + 1);

    let hour = parseInt(tomorrowMatch[2]);
    const minute = tomorrowMatch[3] ? parseInt(tomorrowMatch[3]) : 0;
    const ampm = tomorrowMatch[4]?.toLowerCase();

    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;

    remindAt.setHours(hour, minute, 0, 0);

    return {
      content,
      remindAt,
      rawTimeRef: "tomorrow",
    };
  }

  // Try day of week: "friday at 2pm"
  const dayMatch = text.match(
    /(.+?)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+at)?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*$/i,
  );
  if (dayMatch?.[1] && dayMatch[2] && dayMatch[3]) {
    const content = dayMatch[1].trim();
    const targetDay = dayOfWeek(dayMatch[2].toLowerCase());
    const remindAt = getNextDayOfWeek(now, targetDay);

    let hour = parseInt(dayMatch[3]);
    const minute = dayMatch[4] ? parseInt(dayMatch[4]) : 0;
    const ampm = dayMatch[5]?.toLowerCase();

    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;

    remindAt.setHours(hour, minute, 0, 0);

    return {
      content,
      remindAt,
      rawTimeRef: dayMatch[2],
    };
  }

  return null;
}

function dayOfWeek(day: string): number {
  const days: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  return days[day] ?? 0;
}

function getNextDayOfWeek(from: Date, dayIndex: number): Date {
  const result = new Date(from);
  const currentDay = result.getDay();
  let daysAhead = dayIndex - currentDay;
  if (daysAhead <= 0) daysAhead += 7;
  result.setDate(result.getDate() + daysAhead);
  return result;
}

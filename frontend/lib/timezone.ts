/**
 * Timezone utility functions
 *
 * Timezone preference is stored in both:
 * 1. Database - for cross-device sync and persistence
 * 2. localStorage - for fast access and offline capability
 */

const TIMEZONE_KEY = "user_timezone";

// Get all available timezones
export function getTimezones(): string[] {
  return Intl.supportedValuesOf("timeZone");
}

// Get commonly used timezones for quick selection
export function getCommonTimezones(): { label: string; value: string }[] {
  return [
    { label: "UTC", value: "UTC" },
    { label: "America/New_York (EST/EDT)", value: "America/New_York" },
    { label: "America/Chicago (CST/CDT)", value: "America/Chicago" },
    { label: "America/Denver (MST/MDT)", value: "America/Denver" },
    { label: "America/Los_Angeles (PST/PDT)", value: "America/Los_Angeles" },
    { label: "Europe/London (GMT/BST)", value: "Europe/London" },
    { label: "Europe/Paris (CET/CEST)", value: "Europe/Paris" },
    { label: "Europe/Istanbul (TRT)", value: "Europe/Istanbul" },
    { label: "Asia/Dubai (GST)", value: "Asia/Dubai" },
    { label: "Asia/Shanghai (CST)", value: "Asia/Shanghai" },
    { label: "Asia/Tokyo (JST)", value: "Asia/Tokyo" },
    { label: "Asia/Singapore (SGT)", value: "Asia/Singapore" },
    { label: "Australia/Sydney (AEDT/AEST)", value: "Australia/Sydney" },
  ];
}

// Get user's timezone from localStorage or browser default
export function getUserTimezone(): string {
  if (typeof window === "undefined") {
    return "UTC";
  }

  const stored = localStorage.getItem(TIMEZONE_KEY);
  if (stored) {
    return stored;
  }

  // Fallback to browser's timezone
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Save user's timezone preference to localStorage
export function setUserTimezone(timezone: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TIMEZONE_KEY, timezone);
  }
}

// Initialize timezone from database (used on app load)
// This syncs the database value to localStorage cache
export function initializeTimezoneFromDatabase(timezone: string): void {
  if (typeof window !== "undefined" && timezone) {
    localStorage.setItem(TIMEZONE_KEY, timezone);
  }
}

// Format a date string or Date object to user's timezone
export function formatDateInUserTimezone(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const timezone = getUserTimezone();
  const dateObj = typeof date === "string" ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZone: timezone,
    ...options,
  };

  return new Intl.DateTimeFormat("en-US", defaultOptions).format(dateObj);
}

// Format date for display in alerts and other UI
export function formatAlertDate(date: string | Date): string {
  return formatDateInUserTimezone(date, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true,
  });
}

// Format date for short display (without seconds)
export function formatDateShort(date: string | Date): string {
  return formatDateInUserTimezone(date, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
}

// Format date for very short display (date only)
export function formatDateOnly(date: string | Date): string {
  return formatDateInUserTimezone(date, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

// Get timezone abbreviation
export function getTimezoneAbbreviation(timezone?: string): string {
  const tz = timezone || getUserTimezone();
  const date = new Date();

  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    }).format(date);

    // Extract the timezone abbreviation (e.g., "EST", "PDT")
    const match = formatted.match(/([A-Z]{2,5})$/);
    return match ? match[1] : "";
  } catch {
    return "";
  }
}

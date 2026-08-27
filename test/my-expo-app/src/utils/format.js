// Format an ISO date/Date to "08.00 AM" style used in the dashboard cards.
export function formatClock(value) {
  if (!value) return "--:--";
  const d = new Date(value);
  if (isNaN(d)) return "--:--";
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}.${String(m).padStart(2, "0")} ${ampm}`;
}

export function formatTimeShort(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d)) return "";
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

// "24 September 2023"
export function formatLongDate(value = new Date()) {
  const d = new Date(value);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// minutes -> "7h 45m"
export function formatMinutes(mins = 0) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

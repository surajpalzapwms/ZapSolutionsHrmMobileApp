// Central palette derived from the HRM attendance design.
export const colors = {
  primary: "#6C4EE0",
  primaryDark: "#5B3FD0",
  primaryLight: "#8B72EA",
  primarySoft: "#EDE8FB", // chips / selected states

  screen: "#F5F3FB", // soft lavender app background
  card: "#FFFFFF",
  headerFrom: "#7B5CF0",
  headerTo: "#5B3FD0",

  text: "#1E1B2E",
  textMuted: "#8E8AA3",
  textOnPrimary: "#FFFFFF",

  success: "#16A34A",
  successSoft: "#E6F7EC",
  danger: "#F04438",
  dangerSoft: "#FDE7E7",
  warning: "#F59E0B",

  border: "#EFEDF6",
  track: "#F0EEF7",
  shadow: "#3A2E6B",
  
  halfDay: "#F59E0B",
  swapLeave: "#A855F7",
  paidLeave: "#2F80ED",
  sundayTint: "#F7A8A8",
  holidayGray: "#9CA3AF",
  todaySoft: "#DCEAFD",
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };

export const spacing = (n) => n * 4;

export const shadow = {
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  soft: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};
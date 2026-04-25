// LeetCode Widget (Übersicht)
// Glassmorphism + Animated + Stable Fetch

import { css } from "uebersicht";

/* ---------------- CONFIG ---------------- */
const widgetWidth = 317;
const widgetHeight = 140;
const widgetLeft = 15;
const widgetTop = 380;

export const refreshFrequency = 3600000;

const leetcodeUsername = "LEETCODE_USERNAME";
const API_BASE = "https://alfa-leetcode-api.onrender.com";

/* ---------------- FETCH ---------------- */
export const command = (dispatch) => {
  const userUrl = `${API_BASE}/${leetcodeUsername}/calendar`;
  const profileUrl = `${API_BASE}/${leetcodeUsername}/profile`;

  Promise.allSettled([
    fetch(userUrl, { headers: { Accept: "application/json" } }).then(res => res.text()),
    fetch(profileUrl, { headers: { Accept: "application/json" } }).then(res => res.text())
  ])
    .then(([userRes, profileRes]) => {
      let userData = {};
      let profileData = {};

      // --- Parse USER (calendar + streak) ---
      if (userRes.status === "fulfilled") {
        try {
          userData = JSON.parse(userRes.value);
        } catch {
          userData = {};
        }
      }

      // --- Parse PROFILE (stats) ---
      if (profileRes.status === "fulfilled") {
        try {
          profileData = JSON.parse(profileRes.value);
        } catch {
          profileData = {};
        }
      }

      // --- Calendar ---
      let submissionCalendar = {};
      try {
        submissionCalendar =
          typeof userData.submissionCalendar === "string"
            ? JSON.parse(userData.submissionCalendar)
            : userData.submissionCalendar || {};
      } catch {
        submissionCalendar = {};
      }

      const weeks = transformCalendarData(submissionCalendar);
      const calendarSVG = generateCalendarSVG(weeks);
      const stats = calculateStats(weeks, submissionCalendar);

      // --- Stats from PROFILE ---
      const totalSolved = profileData.totalSolved || 0;
      const easy = profileData.easySolved || 0;
      const medium = profileData.mediumSolved || 0;
      const hard = profileData.hardSolved || 0;

      dispatch({
        type: "SET_DATA",
        data: {
          calendarSVG,
          stats,
          totalSolved,
          easy,
          medium,
          hard,
          error: null,
        },
      });
    })
    .catch((err) => {
      dispatch({
        type: "SET_ERROR",
        error: err.message,
      });
    });
};

/* ---------------- STATE ---------------- */
export const initialState = {
  data: {
    calendarSVG: "",
    stats: { maxStreak: 0, currentStreak: 0 },
    totalSolved: 0,
    easy: 0,
    medium: 0,
    hard: 0,
    error: null,
  },
};

export const updateState = (event, prev) => {
  switch (event.type) {
    case "SET_DATA":
      return { ...prev, data: event.data };
    case "SET_ERROR":
      return {
        ...prev,
        data: { ...prev.data, error: event.error },
      };
    default:
      return prev;
  }
};

/* ---------------- DATA TRANSFORM ---------------- */
const transformCalendarData = (submissionCalendar) => {
  const now = new Date();

  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

  const weeks = [];
  let week = [];

  // Fill empty cells before month starts
  for (let i = 0; i < startDayOfWeek; i++) {
    week.push({ count: -1 }); // empty cell
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    date.setUTCHours(0, 0, 0, 0);

    const ts = Math.floor(date.getTime() / 1000).toString();

    week.push({
      count: submissionCalendar[ts] || 0,
    });

    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  // Fill remaining cells
  while (week.length > 0 && week.length < 7) {
    week.push({ count: -1 });
  }

  if (week.length) weeks.push(week);

  return weeks;
};

/* ---------------- STATS ---------------- */
const calculateStats = (weeks, raw) => {
  let maxStreak = 0;
  let currentStreak = 0;
  let temp = 0;

  // Flatten safely
  const days = weeks.flat().filter(d => d && d.count >= 0);

  // Max streak
  days.forEach((d) => {
    if (d.count > 0) {
      temp++;
      maxStreak = Math.max(maxStreak, temp);
    } else {
      temp = 0;
    }
  });

  // Current streak (from raw timestamps)
  const sorted = Object.keys(raw)
    .map((t) => ({
      date: new Date(t * 1000),
      count: raw[t],
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.date - a.date);

  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) currentStreak = 1;
    else {
      const diff =
        (sorted[i - 1].date - sorted[i].date) /
        (1000 * 60 * 60 * 24);

      if (diff === 1) currentStreak++;
      else break;
    }
  }

  return { maxStreak, currentStreak };
};

/* ---------------- SVG ---------------- */
const getColor = (c) =>
  c === 0
    ? "#1a1a1a"
    : c === 1
    ? "#85e085"
    : c === 2
    ? "#5cd65c"
    : "#33cc33";

    const generateCalendarSVG = (weeks) => {
      const size = 17;
      const gap = 3;
    
      let rects = "";
    
      weeks.forEach((week, row) => {
        week.forEach((day, col) => {
          if (!day || day.count === -1) return; // skip empty cells
    
          rects += `<rect 
            x="${col * (size + gap)}" 
            y="${row * (size + gap)}" 
            width="${size}" 
            height="${size}" 
            fill="${getColor(day.count)}" 
            rx="3"
          />`;
        });
      });
    
      const width = 7 * (size + gap);
      const height = weeks.length * (size + gap);
    
      return `<svg width="${width}" height="${height}">${rects}</svg>`;
    };

/* ---------------- STYLES ---------------- */
const container = css`
  position: absolute;
  left: ${widgetLeft}px;
  top: ${widgetTop}px;
  width: ${widgetWidth}px;
  height: ${widgetHeight}px;
  padding: 12px;
  border-radius: 18px;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(15px);
  box-shadow: 0 0px 1px rgb(255, 255, 255);
  color: white;
  font-family: -apple-system;
  animation: fadeIn 0.6s ease;
`;


const header = css`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
`;

const streak = css`
  font-size: 12px;
  color:rgb(255, 255, 255);
`;

const content = css`
  display: flex;
  gap: 10px;
  margin-top: 8px;
`;

const calendarBox = css`
  width: 50%;
  padding: 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
`;

const statsBox = css`
  width: 50%;
  padding: 8px;
  border-radius: 10px;

  display: flex;
  flex-direction: column;
  justify-content: center;

  background: rgba(0, 0, 0, 0.1);
`;


const errorBox = css`
  margin-top: 10px;
  color: #ff6b6b;
  font-size: 12px;
`;

const label = css`
  color:rgb(255, 255, 255);
  font-size: 17px;
  font-weight: 500;
  margin-bottom: 10px;
  text-decoration: underline;
`

const easyStats = css`
  color :#1cb8b8;
  font-size: 15px;
`

const mediumStats = css`
  color :#ffb800;
  font-size: 15px;
`

const hardStats = css`
  color :#f63636;
  font-size: 15px;
`

/* ---------------- RENDER ---------------- */
export const render = ({ data }) => {
  const { calendarSVG, stats, totalSolved, easy, medium, hard, error } = data;

  if (!calendarSVG && !error) {
    return <div className={container}>Loading...</div>;
  }

  return (
    <div className={container}>
      <div className={header}>
        <span>LeetCode</span>
        <span>{new Date().toLocaleString("default", {day:"2-digit", month:"long", year:"2-digit"})}</span>
        <span className={streak}>🔥 Streak {stats.currentStreak}</span>
      </div>

      {error ? (
        <div className={errorBox}>⚠ {error}</div>
      ) : (
        <div className={content}>
          {/* LEFT: Calendar */}
          <div className={calendarBox}>
            <div dangerouslySetInnerHTML={{ __html: calendarSVG }} />
          </div>

          {/* RIGHT: Stats */}
          <div className={statsBox}>
            <div className={label}>Solved : {totalSolved}/3911</div>
            <div className={easyStats}>Easy: {easy}/939</div>
            <div className={mediumStats}>Medium: {medium}/2046</div>
            <div className={hardStats}>Hard: {hard}/926</div>
          </div>
        </div>
      )}
    </div>
  );
};

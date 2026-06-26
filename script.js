const ACTIVITIES_KEY = "oreBuoneActivitiesV1";
const GOALS_KEY = "oreBuoneGoalsV1";

const activityForm = document.getElementById("activityForm");
const goalForm = document.getElementById("goalForm");

const titleInput = document.getElementById("titleInput");
const categoryInput = document.getElementById("categoryInput");
const dateInput = document.getElementById("dateInput");
const hoursInput = document.getElementById("hoursInput");
const notesInput = document.getElementById("notesInput");
const goalInput = document.getElementById("goalInput");
const monthFilter = document.getElementById("monthFilter");

const totalHours = document.getElementById("totalHours");
const activityCount = document.getElementById("activityCount");
const goalSummary = document.getElementById("goalSummary");
const goalHint = document.getElementById("goalHint");
const currentMonthLabel = document.getElementById("currentMonthLabel");
const progressCaption = document.getElementById("progressCaption");
const progressPercent = document.getElementById("progressPercent");
const progressFill = document.getElementById("progressFill");
const activityTableBody = document.getElementById("activityTableBody");
const emptyState = document.getElementById("emptyState");
const exportButton = document.getElementById("exportButton");

let activities = loadData(ACTIVITIES_KEY, []);
let goals = loadData(GOALS_KEY, {});

function loadData(key, fallback) {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch {
    return fallback;
  }
}

function saveActivities() {
  localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
}

function saveGoals() {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

function getTodayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentMonthISO() {
  return getTodayISO().slice(0, 7);
}

function formatHours(value) {
  const hours = Number(value) || 0;

  return `${hours.toLocaleString("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })} h`;
}

function formatMonth(monthValue) {
  if (!monthValue) return "";

  const [year, month] = monthValue.split("-").map(Number);
  const date = new Date(year, month - 1, 1);

  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatDate(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getSelectedMonth() {
  return monthFilter.value || getCurrentMonthISO();
}

function getGoalForMonth(month) {
  return Number(goals[month]) || 0;
}

function getActivitiesForMonth(month) {
  return activities
    .filter((activity) => activity.date.startsWith(month))
    .sort((a, b) => {
      const dateComparison = b.date.localeCompare(a.date);

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return b.createdAt - a.createdAt;
    });
}

function createCell(content, className = "") {
  const cell = document.createElement("td");

  if (className) {
    cell.className = className;
  }

  if (content instanceof HTMLElement) {
    cell.appendChild(content);
  } else {
    cell.textContent = content;
  }

  return cell;
}

function renderTable(month) {
  const monthlyActivities = getActivitiesForMonth(month);

  activityTableBody.innerHTML = "";
  emptyState.style.display = monthlyActivities.length ? "none" : "block";

  monthlyActivities.forEach((activity) => {
    const row = document.createElement("tr");

    const name = document.createElement("span");
    name.className = "activity-name";
    name.textContent = activity.title;

    const category = document.createElement("span");
    category.className = "category-badge";
    category.textContent = activity.category;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "Elimina";
    deleteButton.dataset.id = activity.id;

    row.appendChild(createCell(formatDate(activity.date)));
    row.appendChild(createCell(name));
    row.appendChild(createCell(category));
    row.appendChild(createCell(formatHours(activity.hours), "hours-cell"));
    row.appendChild(createCell(activity.notes || "—", "note-cell"));
    row.appendChild(createCell(deleteButton));

    activityTableBody.appendChild(row);
  });

  exportButton.disabled = monthlyActivities.length === 0;
}

function renderDashboard() {
  const selectedMonth = getSelectedMonth();
  const monthlyActivities = getActivitiesForMonth(selectedMonth);
  const hours = monthlyActivities.reduce(
    (sum, activity) => sum + Number(activity.hours),
    0
  );

  const goal = getGoalForMonth(selectedMonth);
  const percentage = goal > 0 ? Math.min(100, Math.round((hours / goal) * 100)) : 0;

  currentMonthLabel.textContent = formatMonth(selectedMonth);
  totalHours.textContent = formatHours(hours);
  activityCount.textContent = monthlyActivities.length;

  goalInput.value = goal || "";

  if (goal > 0) {
    goalSummary.textContent = `${formatHours(hours)} / ${formatHours(goal)}`;
    goalHint.textContent =
      hours >= goal
        ? "Obiettivo raggiunto"
        : `${formatHours(Math.max(goal - hours, 0))} ancora da registrare`;

    progressCaption.textContent =
      hours >= goal
        ? "Hai raggiunto l’obiettivo. Ora puoi fare finta che fosse tutto pianificato."
        : `Sei a ${percentage}% del tuo traguardo mensile.`;
  } else {
    goalSummary.textContent = "Nessuno";
    goalHint.textContent = "Imposta un traguardo mensile";
    progressCaption.textContent =
      "Imposta un obiettivo per vedere il progresso.";
  }

  progressPercent.textContent = `${percentage}%`;
  progressFill.style.width = `${percentage}%`;
  progressFill.parentElement.setAttribute("aria-valuenow", String(percentage));

  renderTable(selectedMonth);
}

function createActivityId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseHours(value) {
  return Number(String(value).replace(",", "."));
}

activityForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const hours = parseHours(hoursInput.value);
  const date = dateInput.value;

  if (!title || !date || !Number.isFinite(hours) || hours <= 0) {
    return;
  }

  activities.push({
    id: createActivityId(),
    title,
    category: categoryInput.value,
    date,
    hours,
    notes: notesInput.value.trim(),
    createdAt: Date.now()
  });

  saveActivities();

  monthFilter.value = date.slice(0, 7);

  activityForm.reset();
  dateInput.value = getTodayISO();
  hoursInput.value = "1";
  categoryInput.value = "Volontariato";

  renderDashboard();
});

goalForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const selectedMonth = getSelectedMonth();
  const goal = parseHours(goalInput.value);

  if (!goal || goal <= 0) {
    delete goals[selectedMonth];
  } else {
    goals[selectedMonth] = goal;
  }

  saveGoals();
  renderDashboard();
});

monthFilter.addEventListener("change", () => {
  renderDashboard();
});

activityTableBody.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-button");

  if (!button) {
    return;
  }

  const activityId = button.dataset.id;
  const activity = activities.find((item) => item.id === activityId);

  if (!activity) {
    return;
  }

  const confirmed = window.confirm(
    `Vuoi eliminare l'attività "${activity.title}"?`
  );

  if (!confirmed) {
    return;
  }

  activities = activities.filter((item) => item.id !== activityId);
  saveActivities();
  renderDashboard();
});

function escapeCsvValue(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

exportButton.addEventListener("click", () => {
  const selectedMonth = getSelectedMonth();
  const monthlyActivities = getActivitiesForMonth(selectedMonth);

  if (!monthlyActivities.length) {
    return;
  }

  const rows = [
    ["Data", "Attività", "Categoria", "Ore", "Note"],
    ...monthlyActivities.map((activity) => [
      activity.date,
      activity.title,
      activity.category,
      String(activity.hours).replace(".", ","),
      activity.notes
    ])
  ];

  const csv = rows
    .map((row) => row.map(escapeCsvValue).join(";"))
    .join("\n");

  const blob = new Blob(["\ufeff" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `ore-buone-${selectedMonth}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  const originalText = exportButton.textContent;
  exportButton.textContent = "CSV scaricato";

  setTimeout(() => {
    exportButton.textContent = originalText;
  }, 1600);
});

dateInput.value = getTodayISO();
monthFilter.value = getCurrentMonthISO();

renderDashboard();
/**
 * TaskFlow — Important tasks page
 *
 * api.js and auth.js must load before this script.
 *
 * Important-task rule:
 * 1. High-priority incomplete tasks are always important.
 * 2. Medium-priority incomplete tasks are always important.
 * 3. Low-priority incomplete tasks only appear if their due date is
 *    within the next 2 days (today, tomorrow, day after) — or already
 *    overdue. Otherwise they are not shown here at all.
 */

let allTasks = [];
let currentFilter = "all";
let currentSearch = "";

const taskList = document.getElementById("task-list");
const loadingState = document.getElementById("task-loading");
const emptyState = document.getElementById("task-empty");
const errorState = document.getElementById("task-error");
const summaryCount = document.getElementById("summary-count");
const searchInput = document.getElementById("task-search");
const filters = document.querySelectorAll(".filter");

const userAvatarElement = document.getElementById("userAvatar");
const userNameElement = document.getElementById("userName");
const userEmailElement = document.getElementById("userEmail");

// How many days out a low-priority task is allowed to surface.
const LOW_PRIORITY_DUE_WINDOW_DAYS = 2;


function getToday() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
}

function parseDueDate(value) {
    if (!value) return null;

    // Backend returns YYYY-MM-DD for the current SQLAlchemy Date field.
    const date = new Date(value + "T00:00:00");
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDueDate(value) {
    const date = parseDueDate(value);
    if (!date) return "No due date";

    return date.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function priorityRank(priority) {
    const value = String(priority || "medium").toLowerCase();

    if (value === "high") return 3;
    if (value === "medium") return 2;
    return 1;
}

function priorityClass(priority) {
    const value = String(priority || "medium").toLowerCase();

    if (value === "high") return "priority-high";
    if (value === "low") return "priority-low";
    return "priority-medium";
}

function priorityLabel(priority) {
    const value = String(priority || "medium").toLowerCase();
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function isOverdue(task) {
    if (!task.due_date || task.is_completed) return false;

    const due = parseDueDate(task.due_date);
    if (!due) return false;

    return due < getToday();
}

function isDueThisWeek(task) {
    if (!task.due_date) return false;

    const due = parseDueDate(task.due_date);
    if (!due) return false;

    const today = getToday();
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return due >= monday && due <= sunday;
}

/**
 * USER PROFILE (SIDEBAR)
 * Same pattern as dashboard.js / tasks.js / calendar.js.
 */
async function loadUserProfile() {
    try {

        const user = await apiRequest("/user/is_auth", { method: "GET" });

        if (user) {
            updateUserUI(user);
            return user;
        }

    } catch (error) {

        console.error("Failed to fetch user data from database:", error);

        if (error.status === 401) {
            return null;
        }
    }

    return null;
}

function updateUserUI(user) {
    if (userNameElement) {
        userNameElement.textContent = user.name || user.username || "User";
    }

    if (userEmailElement) {
        userEmailElement.textContent = user.email || "";
    }

    if (userAvatarElement) {
        userAvatarElement.textContent = getInitials(user.name || user.username);
    }
}

function getInitials(name) {
    if (!name) return "U";

    const parts = name.trim().split(" ");

    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    return parts[0].substring(0, 2).toUpperCase();
}

function daysUntilDue(task) {
    if (!task.due_date) return Number.POSITIVE_INFINITY;

    const due = parseDueDate(task.due_date);
    if (!due) return Number.POSITIVE_INFINITY;

    return Math.ceil(
        (due.getTime() - getToday().getTime()) / 86400000
    );
}

/**
 * Picks which tasks count as "important" for this page:
 * - High and medium priority incomplete tasks: always included.
 * - Low priority incomplete tasks: only included if overdue, or due
 *   within LOW_PRIORITY_DUE_WINDOW_DAYS days from today. A low-priority
 *   task with no due date, or one due further out, is excluded entirely.
 */
function selectImportantTasks(tasks) {
    const incomplete = tasks.filter(task => !task.is_completed);

    const high = incomplete.filter(
        task => priorityRank(task.priority) === 3
    );

    const medium = incomplete.filter(
        task => priorityRank(task.priority) === 2
    );

    const lowSoon = incomplete.filter(task => {
        if (priorityRank(task.priority) !== 1) {
            return false;
        }

        const days = daysUntilDue(task);

        // No due date at all -> never shown (nothing to judge "soon" against).
        if (!Number.isFinite(days)) {
            return false;
        }

        // Overdue (negative) or due within the window -> show it.
        return days <= LOW_PRIORITY_DUE_WINDOW_DAYS;
    });

    return [...high, ...medium, ...lowSoon]
        .filter(
            (task, index, array) =>
                array.findIndex(item => item.id === task.id) === index
        )
        .sort((a, b) => {
            // Overdue first.
            const overdueDifference =
                Number(isOverdue(b)) - Number(isOverdue(a));

            if (overdueDifference !== 0) {
                return overdueDifference;
            }

            // Then high > medium > low.
            const priorityDifference =
                priorityRank(b.priority) - priorityRank(a.priority);

            if (priorityDifference !== 0) {
                return priorityDifference;
            }

            // Then nearest due date.
            return daysUntilDue(a) - daysUntilDue(b);
        });
}

function applyFilters(tasks) {
    let filtered = tasks;

    if (currentFilter === "overdue") {
        filtered = filtered.filter(isOverdue);
    } else if (currentFilter === "due-this-week") {
        filtered = filtered.filter(isDueThisWeek);
    }

    if (currentSearch) {
        const query = currentSearch.toLowerCase();

        filtered = filtered.filter(task => {
            const title = String(task.title || "").toLowerCase();
            const description =
                String(task.description || "").toLowerCase();
            const priority =
                String(task.priority || "").toLowerCase();

            return (
                title.includes(query) ||
                description.includes(query) ||
                priority.includes(query)
            );
        });
    }

    return filtered;
}

function createTaskCard(task) {
    const card = document.createElement("article");
    card.className = "task-card";

    if (task.is_completed) {
        card.classList.add("completed-task");
    }

    const overdue = isOverdue(task);
    const priority = priorityLabel(task.priority);

    const statusText = task.is_completed
        ? "Completed"
        : overdue
            ? "Overdue"
            : "To Do";

    const statusClass = task.is_completed
        ? "status-completed"
        : overdue
            ? "status-overdue"
            : "status-todo";

    const description = String(task.description || "").trim();

    card.innerHTML = `
        <div class="task-star" aria-hidden="true">★</div>

        <div class="task-main">
            <h2 class="task-title" title="${escapeHtml(task.title || "Untitled task")}">
                ${escapeHtml(task.title || "Untitled task")}
            </h2>

            <div class="task-meta">
                <span class="status ${statusClass}">
                    ${statusText}
                </span>
                ${
                    description
                        ? `<span class="meta-separator">·</span>
                           <span title="${escapeHtml(description)}">
                               ${escapeHtml(truncate(description, 70))}
                           </span>`
                        : ""
                }
            </div>
        </div>

        <div class="task-priority ${priorityClass(task.priority)}">
            <span class="priority-dot"></span>
            ${priority}
        </div>

        <div class="task-due ${overdue ? "overdue" : ""}">
            <span class="due-label">Due</span>
            <time datetime="${escapeHtml(task.due_date || "")}">
                ${formatDueDate(task.due_date)}
            </time>
        </div>

        <a
            href="/tasks/${encodeURIComponent(task.id)}"
            class="task-arrow"
            aria-label="Open ${escapeHtml(task.title || "task")}"
        >
            →
        </a>
    `;

    return card;
}

function renderTasks() {
    const importantTasks = selectImportantTasks(allTasks);
    const visibleTasks = applyFilters(importantTasks);

    taskList.innerHTML = "";

    summaryCount.textContent = visibleTasks.length;

    if (visibleTasks.length === 0) {
        emptyState.classList.remove("hidden");
    } else {
        emptyState.classList.add("hidden");

        const fragment = document.createDocumentFragment();

        visibleTasks.forEach(task => {
            fragment.appendChild(createTaskCard(task));
        });

        taskList.appendChild(fragment);
    }
}

async function loadTasks() {
    loadingState.classList.remove("hidden");
    errorState.classList.add("hidden");

    try {

        // apiRequest() already returns parsed JSON — NOT a fetch Response.
        // Do not call .ok or .json() on it.
        const data = await apiRequest("/tasks/all_tasks", { method: "GET" });

        if (!Array.isArray(data)) {
            throw new Error("Invalid task response");
        }

        allTasks = data;

        loadingState.classList.add("hidden");
        renderTasks();

    } catch (error) {

        console.error("Failed to load important tasks:", error);

        // api.js already clears the token and redirects to /login on 401.
        if (error.status === 401) {
            return;
        }

        loadingState.classList.add("hidden");
        taskList.innerHTML = "";
        summaryCount.textContent = "0";
        emptyState.classList.add("hidden");
        errorState.classList.remove("hidden");

    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function truncate(value, maxLength) {
    return value.length > maxLength
        ? value.slice(0, maxLength - 1) + "…"
        : value;
}

filters.forEach(filter => {
    filter.addEventListener("click", event => {
        event.preventDefault();

        filters.forEach(item => item.classList.remove("active"));
        filter.classList.add("active");

        currentFilter = filter.getAttribute("href").replace("#", "");
        renderTasks();
    });
});

searchInput.addEventListener("input", event => {
    currentSearch = event.target.value.trim();
    renderTasks();
});

document.querySelector(".search-form").addEventListener("submit", event => {
    event.preventDefault();
    currentSearch = searchInput.value.trim();
    renderTasks();
});

// Load immediately and refresh periodically so changes made from
// the Tasks page appear here without manually rebuilding the page.
loadUserProfile();
loadTasks();

setInterval(loadTasks, 30000);

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        loadTasks();
    }
});
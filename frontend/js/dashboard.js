/**
 * TaskFlow Dashboard
 *
 * Requirements: api.js must be loaded before this script.
 */

const TASKS_API = "/tasks/all_tasks";
const USER_API = "/user/is_auth";


/* =========================================================
   AUTHENTICATION & USER PROFILE
   ========================================================= */

/**
 * Fetches the authenticated user profile from the database via /user/is_auth
 */
async function loadUserProfile() {
    try {
        const user = await apiRequest(USER_API, { method: "GET" });

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

/**
 * Updates UI elements with real-time user data fetched from DB
 */
function updateUserUI(user) {
    // 1. Update Welcome Greeting strictly using the username
    updateGreeting(user.username);

    // 2. Update Sidebar Profile using full name and email
    const userNameEl = document.getElementById("sidebarUserName");
    const userEmailEl = document.getElementById("sidebarUserEmail");
    const avatarEl = document.getElementById("sidebarAvatar");

    if (userNameEl) {
        userNameEl.textContent = user.name || user.username || "User"; 
    }

    if (userEmailEl) {
        userEmailEl.textContent = user.email || "";
    }

    if (avatarEl) {
        avatarEl.textContent = getInitials(user.name || user.username);
    }
}

/**
 * Generates up to 2 uppercase avatar initials based on the provided name string
 */
function getInitials(name) {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
}


/* =========================================================
   GREETING
   ========================================================= */

/**
 * Updates greeting header using the exact logged-in username
 */
function updateGreeting(username) {
    const hour = new Date().getHours();
    const welcomeTitle = document.getElementById("welcomeTitle");

    if (!welcomeTitle) return;

    let greetingText = "Good morning";
    if (hour >= 12 && hour < 18) {
        greetingText = "Good afternoon";
    } else if (hour >= 18) {
        greetingText = "Good evening";
    }

    const displayUsername = username || "User";
    welcomeTitle.textContent = `${greetingText}, ${displayUsername} 👋`;
}


/* =========================================================
   LOAD DASHBOARD TASKS
   ========================================================= */

async function loadDashboard() {
    try {
        console.log("Loading tasks from:", TASKS_API);

        const response = await apiRequest(TASKS_API, { method: "GET" });

        let tasks = [];
        if (Array.isArray(response)) {
            tasks = response;
        } else if (response && Array.isArray(response.tasks)) {
            tasks = response.tasks;
        } else if (response && Array.isArray(response.data)) {
            tasks = response.data;
        }

        /* Update dashboard sections */
        updateStatistics(tasks);
        renderRecentTasks(tasks);
        updateProductivity(tasks);
        renderActivity(tasks);

    } catch (error) {
        console.error("Dashboard loading error:", error);

        if (error.status === 401) return;

        const container = document.getElementById("recentTasks");
        if (container) {
            container.innerHTML = `
                <div class="task-item">
                    <div class="task-content">
                        <div class="task-name">Unable to load tasks</div>
                        <div class="task-meta">
                            ${escapeHtml(error.message || "Unable to connect to the server.")}
                        </div>
                    </div>
                </div>
            `;
        }
    }
}


/* =========================================================
   UPDATE STATISTICS
   ========================================================= */

function updateStatistics(tasks) {
    if (!Array.isArray(tasks)) tasks = [];

    const total = tasks.length;
    const completed = tasks.filter(task => task && task.is_completed === true).length;
    const inProgress = total - completed;
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

    const totalElement = document.getElementById("totalTasks");
    const completedElement = document.getElementById("completedTasks");
    const inProgressElement = document.getElementById("inProgressTasks");
    const completionRateElement = document.getElementById("completionRate");

    if (totalElement) totalElement.textContent = total;
    if (completedElement) completedElement.textContent = completed;
    if (inProgressElement) inProgressElement.textContent = inProgress;
    if (completionRateElement) completionRateElement.textContent = `${completionRate}%`;
}


/* =========================================================
   RENDER RECENT TASKS & TASK DETAILS NAVIGATION
   ========================================================= */

function renderRecentTasks(tasks) {
    const container = document.getElementById("recentTasks");
    if (!container) return;

    if (!Array.isArray(tasks) || tasks.length === 0) {
        container.innerHTML = `
            <div class="task-item">
                <div class="task-content">
                    <div class="task-name">No tasks yet</div>
                    <div class="task-meta">Create your first task to get started.</div>
                </div>
            </div>
        `;
        return;
    }

    const recentTasks = tasks.slice(-4).reverse();

    container.innerHTML = recentTasks
        .map(function (task) {
            const completed = task.is_completed === true;
            const statusClass = completed ? "status-done" : "status-progress";
            const statusText = completed ? "Done" : "In Progress";

            // Linked directly to FastAPI router path @frontend_router.get("/tasks/{task_id}")
            const taskDetailUrl = `/tasks/${encodeURIComponent(task.id)}`;

            return `
                <a href="${taskDetailUrl}" class="task-item">
                    <span class="task-check ${completed ? "completed" : ""}">
                        ${completed ? "✓" : ""}
                    </span>

                    <div class="task-content">
                        <div class="task-name">
                            ${escapeHtml(task.title)}
                        </div>
                        <div class="task-meta">
                            ${escapeHtml(task.description || "No description")}
                        </div>
                    </div>

                    <span class="task-status ${statusClass}">
                        ${statusText}
                    </span>
                </a>
            `;
        })
        .join("");
}


/* =========================================================
   PRODUCTIVITY
   ========================================================= */

function updateProductivity(tasks) {
    if (!Array.isArray(tasks)) tasks = [];

    const total = tasks.length;
    const completed = tasks.filter(task => task && task.is_completed === true).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    const percentageElement = document.getElementById("productivityPercentage");
    const textElement = document.getElementById("productivityText");
    const progressElement = document.getElementById("progressFill");
    const messageElement = document.getElementById("productivityMessage");

    if (percentageElement) {
        percentageElement.textContent = `${percentage}%`;
        const circleElement = percentageElement.closest(".progress-circle");
        if (circleElement) {
            circleElement.style.setProperty("--progress", percentage);
            if (percentage === 100 && total > 0) {
                circleElement.classList.add("completed-ring");
            } else {
                circleElement.classList.remove("completed-ring");
            }
        }
    }

    if (textElement) {
        textElement.textContent = `${completed} / ${total} tasks`;
    }

    if (progressElement) {
        progressElement.style.width = `${percentage}%`;
        if (percentage === 100 && total > 0) {
            progressElement.classList.add("completed-bar");
        } else {
            progressElement.classList.remove("completed-bar");
        }
    }

    if (!messageElement) return;

    if (percentage === 100 && total > 0) {
        messageElement.textContent = "Excellent work! 🎉";
    } else if (percentage >= 75) {
        messageElement.textContent = "Great progress!";
    } else if (percentage >= 50) {
        messageElement.textContent = "You're doing well!";
    } else if (percentage > 0) {
        messageElement.textContent = "Keep going!";
    } else {
        messageElement.textContent = "Let's get started!";
    }
}


/* =========================================================
   RECENT ACTIVITY
   ========================================================= */

function renderActivity(tasks) {
    const container = document.getElementById("activityList");
    if (!container) return;

    if (!Array.isArray(tasks) || tasks.length === 0) {
        container.innerHTML = `
            <div class="activity-item">
                <span class="activity-dot"></span>
                <div class="activity-text">
                    <strong>No activity</strong>
                    Create a task to get started.
                </div>
            </div>
        `;
        return;
    }

    const recentTasks = tasks.slice(-4).reverse();

    container.innerHTML = recentTasks
        .map(function (task) {
            const action = task.is_completed ? "completed" : "created";
            return `
                <div class="activity-item">
                    <span class="activity-dot"></span>
                    <div class="activity-text">
                        <strong>You ${action}</strong>
                        ${escapeHtml(task.title)}
                    </div>
                </div>
            `;
        })
        .join("");
}


/* =========================================================
   HTML ESCAPING
   ========================================================= */

function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   INITIALIZE DASHBOARD
   ========================================================= */

document.addEventListener("DOMContentLoaded", async function () {
    // 1. Fetch real-time user data from DB first and update DOM
    await loadUserProfile();

    // 2. Load dashboard tasks data
    await loadDashboard();

    // 3. Auto-refresh tasks every 10 seconds
    setInterval(loadDashboard, 10000);
});
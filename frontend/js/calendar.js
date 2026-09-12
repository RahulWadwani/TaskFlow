// ============================================================
// TaskFlow Calendar
// Database connected calendar
// ============================================================

const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];


// ------------------------------------------------------------
// GLOBAL DATA
// ------------------------------------------------------------

let ALL_TASKS = [];

let currentDate = new Date();

let currentYear = currentDate.getFullYear();
let currentMonth = currentDate.getMonth();

let selectedDate = null;


// ------------------------------------------------------------
// INITIALIZE
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async function () {

    setupCalendarEvents();

    await loadUserProfile();

    await loadTasksFromDatabase();

    // Refresh database every 30 seconds
    setInterval(async function () {
        await loadTasksFromDatabase();
    }, 30000);

});


// ------------------------------------------------------------
// USER PROFILE (SIDEBAR)
// Same pattern as dashboard.js / tasks.js, targeting
// calendar.html's sidebar element ids.
// ------------------------------------------------------------

async function loadUserProfile() {

    try {

        const user = await apiRequest(
            "/user/is_auth",
            {
                method: "GET"
            }
        );

        if (user) {
            updateUserUI(user);
            return user;
        }

    } catch (error) {

        console.error(
            "Failed to fetch user data from database:",
            error
        );

        if (error.status === 401) {
            return null;
        }
    }

    return null;
}


function updateUserUI(user) {

    const userNameEl =
        document.getElementById("userName");

    const userEmailEl =
        document.getElementById("userEmail");

    const avatarEl =
        document.getElementById("userAvatar");

    if (userNameEl) {
        userNameEl.textContent =
            user.name || user.username || "User";
    }

    if (userEmailEl) {
        userEmailEl.textContent = user.email || "";
    }

    if (avatarEl) {
        avatarEl.textContent =
            getInitials(user.name || user.username);
    }
}


function getInitials(name) {

    if (!name) {
        return "U";
    }

    const parts = name.trim().split(" ");

    if (parts.length >= 2) {
        return (
            parts[0][0] +
            parts[parts.length - 1][0]
        ).toUpperCase();
    }

    return parts[0].substring(0, 2).toUpperCase();
}


// ------------------------------------------------------------
// FETCH TASKS FROM FASTAPI DATABASE
// ------------------------------------------------------------

async function loadTasksFromDatabase() {

    try {

        const response = await apiRequest(
            "/tasks/all_tasks",
            {
                method: "GET"
            }
        );

        if (!response) {
            return;
        }

        if (!Array.isArray(response)) {

            console.error(
                "Expected task array but received:",
                response
            );

            return;
        }

        ALL_TASKS = response;

        console.log(
            "Calendar tasks loaded from database:",
            ALL_TASKS
        );

        renderMonth(
            currentYear,
            currentMonth
        );

        // If a day is currently open, refresh it too
        if (selectedDate) {
            openDayView(selectedDate);
        }

        checkUpcomingTasks();

    } catch (error) {

        console.error(
            "Unable to load calendar tasks:",
            error
        );

    }
}


// ------------------------------------------------------------
// GET TASKS FOR PARTICULAR DATE
// ------------------------------------------------------------

function getTasksForDate(dateKey) {

    return ALL_TASKS.filter(function (task) {

        if (!task.due_date) {
            return false;
        }

        return task.due_date === dateKey;

    });

}


// ------------------------------------------------------------
// RENDER MONTH
// ------------------------------------------------------------

function renderMonth(year, month) {

    const grid =
        document.getElementById("calendarGrid");

    const label =
        document.getElementById("calendarMonthLabel");

    if (!grid || !label) {
        return;
    }

    label.textContent =
        MONTH_NAMES[month] + " " + year;

    grid.innerHTML = "";

    const firstOfMonth =
        new Date(year, month, 1);

    const daysInMonth =
        new Date(year, month + 1, 0).getDate();

    const firstWeekday =
        (firstOfMonth.getDay() + 6) % 7;

    const daysInPrevMonth =
        new Date(year, month, 0).getDate();

    const totalCells =
        Math.ceil(
            (firstWeekday + daysInMonth) / 7
        ) * 7;

    const today = new Date();

    for (let i = 0; i < totalCells; i++) {

        const dayOffset =
            i - firstWeekday + 1;

        let cellDate;
        let isOtherMonth;

        if (dayOffset < 1) {

            cellDate =
                new Date(
                    year,
                    month - 1,
                    daysInPrevMonth + dayOffset
                );

            isOtherMonth = true;

        } else if (dayOffset > daysInMonth) {

            cellDate =
                new Date(
                    year,
                    month + 1,
                    dayOffset - daysInMonth
                );

            isOtherMonth = true;

        } else {

            cellDate =
                new Date(
                    year,
                    month,
                    dayOffset
                );

            isOtherMonth = false;
        }

        grid.appendChild(
            buildDayCell(
                cellDate,
                isOtherMonth,
                today
            )
        );
    }
}


// ------------------------------------------------------------
// BUILD CALENDAR DAY
// ------------------------------------------------------------

function buildDayCell(
    cellDate,
    isOtherMonth,
    today
) {

    const dateKey =
        formatDateKey(cellDate);

    const isToday =
        isSameDay(cellDate, today);

    const cell =
        document.createElement("div");

    cell.className =
        "calendar-day" +
        (isOtherMonth ? " other-month" : "") +
        (isToday ? " today" : "");

    // Date number
    const numberEl =
        document.createElement("div");

    numberEl.className =
        "calendar-day-number";

    numberEl.textContent =
        cellDate.getDate();

    cell.appendChild(numberEl);


    // Get database tasks for this day
    const tasks =
        getTasksForDate(dateKey);


    // Display maximum 3 tasks
    tasks.slice(0, 3).forEach(function (task) {

        const chip =
            document.createElement("span");

        const priority =
            normalizePriority(task.priority);

        chip.className =
            "day-task-chip priority-" +
            priority;

        chip.textContent =
            task.title;

        cell.appendChild(chip);

    });


    // More tasks
    if (tasks.length > 3) {

        const more =
            document.createElement("span");

        more.className =
            "day-task-more";

        more.textContent =
            "+" + (tasks.length - 3) + " more";

        cell.appendChild(more);
    }


    // Click day
    cell.addEventListener(
        "click",
        function () {

            openDayView(cellDate);

        }
    );


    return cell;
}


// ------------------------------------------------------------
// OPEN DAY VIEW
// ------------------------------------------------------------

function openDayView(cellDate) {

    selectedDate =
        new Date(cellDate);


    setActiveView("day");


    const dateKey =
        formatDateKey(cellDate);


    const title =
        document.getElementById(
            "dayViewTitle"
        );


    title.textContent =
        MONTH_NAMES[cellDate.getMonth()] +
        " " +
        cellDate.getDate() +
        ", " +
        cellDate.getFullYear();


    const scheduleEl =
        document.getElementById(
            "dayViewSchedule"
        );


    scheduleEl.innerHTML = "";


    const tasks =
        getTasksForDate(dateKey);


    // No tasks
    if (tasks.length === 0) {

        const empty =
            document.createElement("div");

        empty.className =
            "empty-state";

        empty.innerHTML = `
            <h3>No tasks scheduled</h3>
            <p>
                You have no tasks scheduled for this day.
                Enjoy the free time or get ahead on another task.
            </p>
        `;

        scheduleEl.appendChild(empty);

        return;
    }


    // Show tasks from database
    tasks.forEach(function (task, index) {

        const taskEl =
            document.createElement("div");

        taskEl.className =
            "schedule-task";


        // Task number
        const numberEl =
            document.createElement("div");

        numberEl.className =
            "schedule-time";

        numberEl.textContent =
            "#" + (index + 1);

        taskEl.appendChild(numberEl);


        // Task content
        const contentEl =
            document.createElement("div");

        contentEl.className =
            "schedule-content";


        // Title
        const nameEl =
            document.createElement("div");

        nameEl.className =
            "schedule-task-name";

        nameEl.textContent =
            task.title;

        contentEl.appendChild(nameEl);


        // Description
        if (task.description) {

            const descriptionEl =
                document.createElement("div");

            descriptionEl.className =
                "schedule-task-description";

            descriptionEl.textContent =
                task.description;

            contentEl.appendChild(
                descriptionEl
            );
        }


        // Priority
        const priority =
            normalizePriority(task.priority);

        const priorityEl =
            document.createElement("div");

        priorityEl.className =
            "schedule-task-priority";

        priorityEl.innerHTML =
            `
            <span class="priority-dot ${priority}"></span>
            ${capitalize(priority)} Priority
            `;

        contentEl.appendChild(
            priorityEl
        );


        // Completed status
        const statusEl =
            document.createElement("div");

        statusEl.className =
            "schedule-task-status";

        if (task.is_completed) {

            statusEl.textContent =
                "✓ Completed";

        } else {

            statusEl.textContent =
                "○ Pending";

        }

        contentEl.appendChild(
            statusEl
        );


        taskEl.appendChild(
            contentEl
        );

        scheduleEl.appendChild(
            taskEl
        );

    });

}


// ------------------------------------------------------------
// VIEW SWITCHING
// ------------------------------------------------------------

function setActiveView(viewName) {

    document
        .querySelectorAll(".view-tab")
        .forEach(function (tab) {

            tab.classList.toggle(
                "active",
                tab.dataset.view === viewName
            );

        });


    const monthView =
        document.getElementById(
            "monthView"
        );

    const weekView =
        document.getElementById(
            "weekView"
        );

    const dayView =
        document.getElementById(
            "dayView"
        );


    if (monthView) {

        monthView.style.display =
            viewName === "month"
                ? ""
                : "none";
    }


    if (weekView) {

        weekView.style.display =
            viewName === "week"
                ? ""
                : "none";
    }


    if (dayView) {

        dayView.style.display =
            viewName === "day"
                ? ""
                : "none";
    }

}


// ------------------------------------------------------------
// DATE HELPERS
// ------------------------------------------------------------

function formatDateKey(date) {

    const y =
        date.getFullYear();

    const m =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const d =
        String(
            date.getDate()
        ).padStart(2, "0");

    return (
        y +
        "-" +
        m +
        "-" +
        d
    );
}


function isSameDay(a, b) {

    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );

}


// ------------------------------------------------------------
// PRIORITY HELPERS
// ------------------------------------------------------------

function normalizePriority(priority) {

    const value =
        String(
            priority || "medium"
        ).toLowerCase();


    if (
        value !== "low" &&
        value !== "medium" &&
        value !== "high"
    ) {

        return "medium";

    }

    return value;

}


function capitalize(value) {

    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );

}


// ------------------------------------------------------------
// UPCOMING TASK ALERTS
// ------------------------------------------------------------

function checkUpcomingTasks() {

    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );


    ALL_TASKS.forEach(function (task) {

        if (!task.due_date) {
            return;
        }

        if (task.is_completed) {
            return;
        }


        const dueDate =
            parseDateOnly(
                task.due_date
            );


        const difference =
            Math.round(
                (
                    dueDate.getTime() -
                    today.getTime()
                ) /
                (1000 * 60 * 60 * 24)
            );


        if (
            difference >= 0 &&
            difference <= 1
        ) {

            showTaskReminder(
                task,
                difference
            );

        }

    });

}


// ------------------------------------------------------------
// PARSE DATABASE DATE SAFELY
// ------------------------------------------------------------

function parseDateOnly(dateString) {

    const parts =
        dateString.split("-");

    return new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    );

}


// ------------------------------------------------------------
// TASK REMINDER
// ------------------------------------------------------------

function showTaskReminder(
    task,
    difference
) {

    const storageKey =
        "taskflow_reminder_" +
        task.id +
        "_" +
        task.due_date;


    if (
        localStorage.getItem(storageKey)
    ) {

        return;

    }


    let message;


    if (difference === 0) {

        message =
            `🔥 Your task "${task.title}" is due TODAY. `
            +
            `You've got this — finish it as soon as possible!`;

    } else {

        message =
            `⏰ Your task "${task.title}" is due TOMORROW. `
            +
            `Get ahead now and make tomorrow easier!`;

    }


    // Browser notification
    if (
        "Notification" in window &&
        Notification.permission === "granted"
    ) {

        new Notification(
            "TaskFlow — Task Reminder",
            {
                body: message
            }
        );

    } else {

        // Fallback
        showCalendarToast(
            message
        );

    }


    localStorage.setItem(
        storageKey,
        "true"
    );

}


// ------------------------------------------------------------
// TOAST
// ------------------------------------------------------------

function showCalendarToast(message) {

    let toast =
        document.getElementById(
            "calendarToast"
        );


    if (!toast) {

        toast =
            document.createElement("div");

        toast.id =
            "calendarToast";

        toast.style.position =
            "fixed";

        toast.style.right =
            "25px";

        toast.style.bottom =
            "25px";

        toast.style.maxWidth =
            "380px";

        toast.style.padding =
            "16px 20px";

        toast.style.borderRadius =
            "12px";

        toast.style.background =
            "#171923";

        toast.style.color =
            "#ffffff";

        toast.style.border =
            "1px solid rgba(255,255,255,0.12)";

        toast.style.boxShadow =
            "0 10px 40px rgba(0,0,0,0.4)";

        toast.style.zIndex =
            "9999";

        document.body.appendChild(
            toast
        );
    }


    toast.textContent =
        message;


    clearTimeout(
        toast._timeout
    );


    toast._timeout =
        setTimeout(function () {

            toast.remove();

        }, 7000);

}


// ------------------------------------------------------------
// EVENT HANDLERS
// ------------------------------------------------------------

function setupCalendarEvents() {

    // Month / Week / Day

    document
        .querySelectorAll(".view-tab")
        .forEach(function (tab) {

            tab.addEventListener(
                "click",
                function () {

                    setActiveView(
                        tab.dataset.view
                    );

                }
            );

        });


    // Previous month

    const prevButton =
        document.getElementById(
            "prevMonthBtn"
        );


    if (prevButton) {

        prevButton.addEventListener(
            "click",
            function () {

                currentMonth--;

                if (currentMonth < 0) {

                    currentMonth = 11;
                    currentYear--;

                }

                renderMonth(
                    currentYear,
                    currentMonth
                );

            }
        );

    }


    // Next month

    const nextButton =
        document.getElementById(
            "nextMonthBtn"
        );


    if (nextButton) {

        nextButton.addEventListener(
            "click",
            function () {

                currentMonth++;

                if (currentMonth > 11) {

                    currentMonth = 0;
                    currentYear++;

                }

                renderMonth(
                    currentYear,
                    currentMonth
                );

            }
        );

    }


    // Back to month

    const backButton =
        document.getElementById(
            "backToMonthBtn"
        );


    if (backButton) {

        backButton.addEventListener(
            "click",
            function () {

                setActiveView(
                    "month"
                );

            }
        );

    }


    // Refresh whenever user comes back to tab

    document.addEventListener(
        "visibilitychange",
        function () {

            if (
                document.visibilityState === "visible"
            ) {

                loadTasksFromDatabase();

            }

        }
    );

}
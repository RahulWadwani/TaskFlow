/**
 * TaskFlow Tasks Board
 *
 * api.js (and auth.js) must be loaded before this script.
 */

const TASKS_API = "/tasks/all_tasks";
const USER_API = "/user/is_auth";


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

let taskModal;
let modalBackdrop;
let modalTitleElement;
let taskForm;
let saveButton;

let openModalButtons;
let closeModalButton;
let cancelModalButton;

let todoColumn;
let completedColumn;

let statTotalElement;
let statCompletedElement;
let statInProgressElement;
let statCompletionRateElement;

let todoCountElement;
let completedCountElement;

let searchInputElement;
let filterButtons;

let userAvatarElement;
let userNameElement;
let userEmailElement;


/* =========================================================
   STATE
   ========================================================= */

let allTasks = [];

let currentFilter = "all";

let searchQuery = "";

let editingTaskId = null;
/* null = creating a new task, otherwise editing an existing one */


/* =========================================================
   MODAL CONTROLS
   ========================================================= */

function openModal() {

    if (!taskModal) {
        return;
    }

    taskModal.classList.add("active");

    taskModal.setAttribute(
        "aria-hidden",
        "false"
    );

    const titleInput =
        document.getElementById("taskTitle");

    if (titleInput) {
        titleInput.focus();
    }
}


function closeModal() {

    if (taskModal) {

        taskModal.classList.remove("active");

        taskModal.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    if (taskForm) {
        taskForm.reset();
    }

    if (modalTitleElement) {
        modalTitleElement.textContent = "Create new task";
    }

    if (saveButton) {
        saveButton.textContent = "Create task";
    }

    editingTaskId = null;
}


function openCreateForm() {

    editingTaskId = null;

    if (modalTitleElement) {
        modalTitleElement.textContent = "Create new task";
    }

    if (saveButton) {
        saveButton.textContent = "Create task";
    }

    openModal();
}


function openEditForm(task) {

    editingTaskId = task.id;

    const titleElement =
        document.getElementById("taskTitle");

    const descriptionElement =
        document.getElementById("taskDescription");

    const priorityElement =
        document.getElementById("priority");

    const dueDateElement =
        document.getElementById("dueDate");

    if (titleElement) {
        titleElement.value = task.title || "";
    }

    if (descriptionElement) {
        descriptionElement.value = task.description || "";
    }

    if (priorityElement) {
        priorityElement.value = task.priority || "medium";
    }

    if (dueDateElement) {
        dueDateElement.value = task.due_date || "";
    }

    if (modalTitleElement) {
        modalTitleElement.textContent = "Edit task";
    }

    if (saveButton) {
        saveButton.textContent = "Save changes";
    }

    openModal();
}


/* =========================================================
   USER PROFILE (SIDEBAR)
   Mirrors dashboard.js's loadUserProfile()/updateUserUI(),
   targeting tasks.html's sidebar element ids.
   ========================================================= */

async function loadUserProfile() {

    try {

        const user =
            await apiRequest(
                USER_API,
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

    if (userNameElement) {
        userNameElement.textContent =
            user.name || user.username || "User";
    }

    if (userEmailElement) {
        userEmailElement.textContent = user.email || "";
    }

    if (userAvatarElement) {
        userAvatarElement.textContent =
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


/* =========================================================
   LOAD TASKS
   ========================================================= */

async function loadTasks() {

    try {

        console.log(
            "Loading tasks from:",
            TASKS_API
        );

        const response =
            await apiRequest(
                TASKS_API,
                {
                    method: "GET"
                }
            );

        console.log(
            "Tasks received:",
            response
        );

        if (Array.isArray(response)) {

            allTasks = response;

        } else if (
            response &&
            Array.isArray(response.tasks)
        ) {

            allTasks = response.tasks;

        } else if (
            response &&
            Array.isArray(response.data)
        ) {

            allTasks = response.data;

        } else {

            allTasks = [];
        }

        renderBoard();

    } catch (error) {

        console.error(
            "Error loading tasks:",
            error
        );

        if (error.status === 401) {
            return;
        }

        if (todoColumn) {

            todoColumn.innerHTML = `
                <div class="task-list-error">
                    ${escapeHtml(
                        error.message ||
                        "Failed to load tasks."
                    )}
                </div>
            `;
        }
    }
}


/* =========================================================
   CREATE / UPDATE TASK
   (same form + button handles both cases)
   ========================================================= */

async function handleTaskFormSubmit(event) {

    event.preventDefault();

    const titleElement =
        document.getElementById("taskTitle");

    const descriptionElement =
        document.getElementById("taskDescription");

    const priorityElement =
        document.getElementById("priority");

    const dueDateElement =
        document.getElementById("dueDate");

    const title =
        titleElement
            ? titleElement.value.trim()
            : "";

    const description =
        descriptionElement
            ? descriptionElement.value.trim()
            : "";

    const priority =
        priorityElement
            ? priorityElement.value
            : "medium";

    const dueDate =
        dueDateElement && dueDateElement.value
            ? dueDateElement.value
            : null;

    if (!title) {

        alert("Please enter a task title.");

        return;
    }

    const payload = {
        title: title,
        description: description,
        is_completed: false,
        priority: priority,
        due_date: dueDate
    };

    const wasEditing = Boolean(editingTaskId);

    try {

        if (saveButton) {

            saveButton.disabled = true;

            saveButton.textContent =
                wasEditing
                    ? "Saving..."
                    : "Creating...";
        }

        if (wasEditing) {

            /*
             * Preserve the existing is_completed state on edit —
             * the form has no completion checkbox, so don't
             * accidentally reset a completed task back to incomplete.
             */
            const existingTask =
                allTasks.find(
                    task =>
                        String(task.id) ===
                        String(editingTaskId)
                );

            payload.is_completed =
                existingTask
                    ? existingTask.is_completed
                    : false;

            await apiRequest(
                `/tasks/update_task/${editingTaskId}`,
                {
                    method: "PUT",
                    body: payload
                }
            );

        } else {

            await apiRequest(
                "/tasks/create",
                {
                    method: "POST",
                    body: payload
                }
            );
        }

        closeModal();

        await loadTasks();

    } catch (error) {

        console.error(
            "Error saving task:",
            error
        );

        if (error.status === 401) {
            return;
        }

        alert(
            error.message ||
            "Failed to save task."
        );

    } finally {

        if (saveButton) {

            saveButton.disabled = false;

            saveButton.textContent =
                wasEditing
                    ? "Save changes"
                    : "Create task";
        }
    }
}


/* =========================================================
   TOGGLE COMPLETION
   ========================================================= */

async function toggleTaskComplete(task) {

    const updatedPayload = {
        title: task.title,
        description: task.description || "",
        is_completed: !task.is_completed,
        priority: task.priority || "medium",
        due_date: task.due_date || null
    };

    try {

        await apiRequest(
            `/tasks/update_task/${task.id}`,
            {
                method: "PUT",
                body: updatedPayload
            }
        );

        await loadTasks();

    } catch (error) {

        console.error(
            "Error updating task:",
            error
        );

        if (error.status === 401) {
            return;
        }

        alert(
            error.message ||
            "Failed to update task."
        );
    }
}


/* =========================================================
   DELETE TASK
   ========================================================= */

async function deleteTask(taskId) {

    const confirmed =
        confirm("Are you sure you want to delete this task?");

    if (!confirmed) {
        return;
    }

    try {

        await apiRequest(
            `/tasks/delete_task/${taskId}`,
            {
                method: "DELETE"
            }
        );

        await loadTasks();

    } catch (error) {

        console.error(
            "Error deleting task:",
            error
        );

        if (error.status === 401) {
            return;
        }

        alert(
            error.message ||
            "Failed to delete task."
        );
    }
}


/* =========================================================
   FILTER TASKS
   ========================================================= */

function filterTasks() {

    const todayString =
        new Date()
            .toISOString()
            .split("T")[0];

    return allTasks.filter(function (task) {

        const title =
            String(task.title || "")
                .toLowerCase();

        const description =
            String(task.description || "")
                .toLowerCase();

        const matchesSearch =
            title.includes(searchQuery) ||
            description.includes(searchQuery);

        if (!matchesSearch) {
            return false;
        }

        if (currentFilter === "today") {
            return task.due_date === todayString;
        }

        if (currentFilter === "upcoming") {
            return (
                Boolean(task.due_date) &&
                task.due_date > todayString
            );
        }

        if (currentFilter === "completed") {
            return task.is_completed === true;
        }

        /* "all" */
        return true;
    });
}


/* =========================================================
   RENDER BOARD
   ========================================================= */

function renderBoard() {

    const filteredTasks = filterTasks();

    if (todoColumn) {
        todoColumn.innerHTML = "";
    }

    if (completedColumn) {
        completedColumn.innerHTML = "";
    }

    let todoTotal = 0;

    let completedTotal = 0;

    /*
     * The board only has two columns — To do and Completed — driven
     * directly by is_completed. There is no separate "in progress"
     * status on the backend.
     */
    filteredTasks.forEach(function (task) {

        const card = createTaskCard(task);

        if (task.is_completed === true) {

            if (completedColumn) {
                completedColumn.appendChild(card);
            }

            completedTotal = completedTotal + 1;

        } else {

            if (todoColumn) {
                todoColumn.appendChild(card);
            }

            todoTotal = todoTotal + 1;
        }
    });

    if (todoCountElement) {
        todoCountElement.textContent = String(todoTotal);
    }

    if (completedCountElement) {
        completedCountElement.textContent = String(completedTotal);
    }

    updateStatistics();
}


/* =========================================================
   UPDATE STATISTICS
   Mirrors dashboard.js's updateStatistics(): stats always use
   the FULL task list, not the filtered board view.
   ========================================================= */

function updateStatistics() {

    const tasks =
        Array.isArray(allTasks)
            ? allTasks
            : [];

    const total = tasks.length;

    const completed =
        tasks.filter(
            task =>
                task &&
                task.is_completed === true
        ).length;

    const inProgress = total - completed;

    const completionRate =
        total === 0
            ? 0
            : Math.round(
                (completed / total) * 100
            );

    if (statTotalElement) {
        statTotalElement.textContent = total;
    }

    if (statCompletedElement) {
        statCompletedElement.textContent = completed;
    }

    if (statInProgressElement) {
        statInProgressElement.textContent = inProgress;
    }

    if (statCompletionRateElement) {
        statCompletionRateElement.textContent = `${completionRate}%`;
    }
}


/* =========================================================
   CREATE TASK CARD
   ========================================================= */

function createTaskCard(task) {

    const card = document.createElement("div");

    card.className =
        `task-card ${task.is_completed ? "completed" : ""}`.trim();

    card.setAttribute(
        "data-id",
        task.id
    );

    const priority = task.priority || "medium";

    const formattedDate =
        task.due_date
            ? new Date(task.due_date).toLocaleDateString(
                "en-US",
                {
                    month: "short",
                    day: "numeric"
                }
            )
            : "No due date";

    card.innerHTML = `
        <div class="card-header">

            <label class="checkbox-container">
                <input
                    type="checkbox"
                    class="task-checkbox"
                    ${task.is_completed ? "checked" : ""}
                >
            </label>

            <span class="priority-badge priority-${escapeHtml(priority)}">
                ${escapeHtml(priority)}
            </span>

        </div>

        <div class="card-body">

            <h3 class="card-title">
                ${escapeHtml(task.title || "")}
            </h3>

            ${
                task.description
                    ? `<p class="card-desc">${escapeHtml(task.description)}</p>`
                    : ""
            }

        </div>

        <div class="card-footer">

            <span class="due-date">
                ◷ ${escapeHtml(formattedDate)}
            </span>

            <div class="card-actions">
                <button type="button" class="edit-btn" title="Edit task">✎</button>
                <button type="button" class="delete-btn" title="Delete task">✕</button>
            </div>

        </div>
    `;

    const checkbox =
        card.querySelector(".task-checkbox");

    if (checkbox) {

        checkbox.addEventListener(
            "change",
            function () {
                toggleTaskComplete(task);
            }
        );
    }

    const editButton =
        card.querySelector(".edit-btn");

    if (editButton) {

        editButton.addEventListener(
            "click",
            function (event) {
                event.stopPropagation();
                openEditForm(task);
            }
        );
    }

    const deleteButton =
        card.querySelector(".delete-btn");

    if (deleteButton) {

        deleteButton.addEventListener(
            "click",
            function (event) {
                event.stopPropagation();
                deleteTask(task.id);
            }
        );
    }

    return card;
}


/* =========================================================
   HTML ESCAPING
   Matches dashboard.js's escapeHtml() exactly.
   ========================================================= */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   INITIALIZE TASKS BOARD
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        taskModal = document.getElementById("taskModal");
        modalBackdrop = document.getElementById("modalBackdrop");
        modalTitleElement = document.getElementById("modalTitle");
        taskForm = document.getElementById("taskForm");
        saveButton = document.getElementById("saveTaskBtn");

        openModalButtons =
            document.querySelectorAll(
                "#openTaskModalBtn, .open-task-modal"
            );

        closeModalButton = document.getElementById("closeTaskModalBtn");
        cancelModalButton = document.getElementById("cancelTaskModalBtn");

        todoColumn = document.getElementById("todoColumn");
        completedColumn = document.getElementById("completedColumn");

        statTotalElement = document.getElementById("statTotal");
        statCompletedElement = document.getElementById("statCompleted");
        statInProgressElement = document.getElementById("statInProgress");
        statCompletionRateElement = document.getElementById("statCompletionRate");

        todoCountElement = document.getElementById("todoCount");
        completedCountElement = document.getElementById("completedCount");

        searchInputElement = document.getElementById("taskSearchInput");

        filterButtons =
            document.querySelectorAll(".filter-btn");

        userAvatarElement = document.getElementById("userAvatar");
        userNameElement = document.getElementById("userName");
        userEmailElement = document.getElementById("userEmail");

        openModalButtons.forEach(function (button) {
            button.addEventListener("click", openCreateForm);
        });

        if (closeModalButton) {
            closeModalButton.addEventListener("click", closeModal);
        }

        if (cancelModalButton) {
            cancelModalButton.addEventListener("click", closeModal);
        }

        if (modalBackdrop) {
            modalBackdrop.addEventListener("click", closeModal);
        }

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape" &&
                    taskModal &&
                    taskModal.classList.contains("active")
                ) {
                    closeModal();
                }
            }
        );

        if (taskForm) {
            taskForm.addEventListener(
                "submit",
                handleTaskFormSubmit
            );
        }

        if (searchInputElement) {

            searchInputElement.addEventListener(
                "input",
                function (event) {
                    searchQuery =
                        event.target.value
                            .toLowerCase()
                            .trim();

                    renderBoard();
                }
            );
        }

        filterButtons.forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    filterButtons.forEach(function (otherButton) {
                        otherButton.classList.remove("active");
                    });

                    button.classList.add("active");

                    currentFilter =
                        button.getAttribute("data-filter") || "all";

                    renderBoard();
                }
            );
        });

        loadUserProfile();
        loadTasks();

        /*
         * Refresh every 10 seconds, same as the dashboard, so the
         * board stays in sync with changes made elsewhere.
         */
        setInterval(
            loadTasks,
            10000
        );
    }
);
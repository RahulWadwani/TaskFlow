/**
 * TaskFlow Task Details Page Logic
 */

const USER_API = "/user/is_auth";
let currentTaskData = null;

/* =========================================================
   CHECKLIST PARSER HELPER
   ========================================================= */

function parseChecklistData(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            return [{ id: Date.now(), text: raw, is_completed: false }];
        }
    }
    return [];
}


/* =========================================================
   AUTHENTICATION & USER PROFILE
   ========================================================= */

async function loadUserProfile() {
    try {
        const user = await apiRequest(USER_API, { method: "GET" });
        if (user) {
            updateUserSidebarUI(user);
            return user;
        }
    } catch (error) {
        console.error("Failed to fetch user profile:", error);
    }
    return null;
}

function updateUserSidebarUI(user) {
    const userNameEl = document.getElementById("sidebarUserName");
    const userEmailEl = document.getElementById("sidebarUserEmail");
    const avatarEl = document.getElementById("sidebarAvatar");

    const displayName = user.name || user.username || "User";

    if (userNameEl) userNameEl.textContent = displayName;
    if (userEmailEl) userEmailEl.textContent = user.email || "";
    if (avatarEl) avatarEl.textContent = getInitials(displayName);
}

function getInitials(name) {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
}


/* =========================================================
   FETCH & RENDER TASK DETAILS
   ========================================================= */

async function loadTaskDetails() {
    if (!TASK_ID || TASK_ID === "{{ task_id }}") {
        console.error("No valid TASK_ID provided.");
        return;
    }

    try {
        let task = null;
        try {
            const response = await apiRequest(`/tasks/one_task/${TASK_ID}`, { method: "GET" });
            task = response.task || response.data || response;
        } catch (e) {
            const response = await apiRequest(`/tasks/${TASK_ID}`, { method: "GET" });
            task = response.task || response.data || response;
        }

        task.checklist = parseChecklistData(task.checklist || task.subtasks);
        currentTaskData = task;

        renderTaskDetailsUI(task);

    } catch (error) {
        console.error("Error loading task details from DB:", error);
        document.getElementById("taskTitle").textContent = "Task not found";
        document.getElementById("taskSubtitle").textContent = "Unable to fetch information for this task.";
    }
}

function renderTaskDetailsUI(task) {
    // 1. Titles & Breadcrumb
    const title = task.title || "Untitled Task";
    document.getElementById("taskTitle").textContent = title;
    document.getElementById("breadcrumbTitle").textContent = title;
    document.getElementById("taskSubtitle").textContent = task.description || "No description provided.";

    // 2. Status Pill & Select
    const isCompleted = task.is_completed === true || task.completed === true || task.status === "completed";
    const statusKey = isCompleted ? "completed" : "todo";

    updateStatusPillUI(statusKey);
    const statusSelect = document.getElementById("statusSelect");
    if (statusSelect) statusSelect.value = statusKey;

    // 3. Description (Italics & Dark UI typography)
    const descContainer = document.getElementById("taskDescription");
    if (descContainer) {
        descContainer.innerHTML = `<p style="font-size: 12px; font-style: italic; color: #a5aab5;">${escapeHtml(task.description || "No detailed description provided.")}</p>`;
    }

    // 4. Task Details Aside Card
    const detailStatus = document.getElementById("detailStatus");
    if (detailStatus) detailStatus.textContent = isCompleted ? "Completed" : "To do";

    const detailPriority = document.getElementById("detailPriority");
    if (detailPriority) {
        const priority = (task.priority || "medium").toLowerCase();
        detailPriority.innerHTML = `<span class="priority ${priority}">${capitalize(priority)}</span>`;
    }

    const detailDueDate = document.getElementById("detailDueDate");
    if (detailDueDate) detailDueDate.textContent = formatDate(task.due_date || task.created_at);

    const detailCreatedDate = document.getElementById("detailCreatedDate");
    if (detailCreatedDate) detailCreatedDate.textContent = formatDate(task.created_at);

    const detailAssignee = document.getElementById("detailAssignee");
    if (detailAssignee) {
        const assigneeName = task.assignee || task.user_name || "User";
        detailAssignee.innerHTML = `
            <span class="assignee">
                <span class="mini-avatar">${getInitials(assigneeName)}</span>
                ${escapeHtml(assigneeName)}
            </span>
        `;
    }

    // 5. Checklist
    renderChecklist(task.checklist);

    // 6. Populate Edit Modal
    document.getElementById("editTitle").value = task.title || "";
    document.getElementById("editDescription").value = task.description || "";
    document.getElementById("editPriority").value = (task.priority || "medium").toLowerCase();
    if (task.due_date) {
        document.getElementById("editDate").value = task.due_date.split("T")[0];
    }
}


/* =========================================================
   SUB-CHECKLIST ACTIONS (ADD, TOGGLE, REMOVE, SYNC)
   ========================================================= */

async function addChecklistItem(event) {
    if (event) event.preventDefault();

    const input = document.getElementById("newCheckitemInput");
    if (!input) return;

    const itemText = input.value.trim();
    if (!itemText) return;

    if (!currentTaskData) currentTaskData = { checklist: [] };
    let list = parseChecklistData(currentTaskData.checklist);

    const newItem = {
        id: Date.now(),
        text: itemText,
        is_completed: false
    };

    list.push(newItem);
    currentTaskData.checklist = list;

    // Render UI immediately
    renderChecklist(list);
    input.value = "";

    // Sync to DB
    await syncTaskToDatabase({ checklist: list });
}

async function toggleChecklistStep(index) {
    if (!currentTaskData) return;
    let list = parseChecklistData(currentTaskData.checklist);
    if (!list[index]) return;

    if (typeof list[index] === "object" && list[index] !== null) {
        list[index].is_completed = !list[index].is_completed;
    } else {
        list[index] = { id: Date.now(), text: String(list[index]), is_completed: true };
    }

    currentTaskData.checklist = list;
    renderChecklist(list);

    await syncTaskToDatabase({ checklist: list });
}

async function removeChecklistItem(index) {
    if (!currentTaskData) return;
    let list = parseChecklistData(currentTaskData.checklist);
    if (!list[index]) return;

    list.splice(index, 1);
    currentTaskData.checklist = list;

    renderChecklist(list);
    await syncTaskToDatabase({ checklist: list });
}

function renderChecklist(items) {
    const container = document.getElementById("checklistItems");
    if (!container) return;

    const parsedList = parseChecklistData(items);

    if (parsedList.length === 0) {
        container.innerHTML = `<p style="color:#858b99; font-size: 0.85rem; margin: 8px 0; font-style: italic;">No sub-checklist items created yet.</p>`;
        updateChecklistProgress(0, 0);
        return;
    }

    let completedCount = 0;

    container.innerHTML = parsedList.map((item, index) => {
        const isObject = typeof item === "object" && item !== null;
        const text = isObject ? (item.text || item.title || "") : String(item);
        const itemCompleted = isObject ? (item.is_completed === true || item.completed === true) : false;

        if (itemCompleted) completedCount++;

        return `
            <div class="check-item ${itemCompleted ? "completed" : ""}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255, 255, 255, 0.035); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; margin-bottom: 4px;">
                <div style="display: flex; align-items: center; gap: 10px; flex: 1; cursor: pointer;" onclick="toggleChecklistStep(${index})">
                    <div class="checkbox ${itemCompleted ? "completed" : ""}" style="width: 18px; height: 18px; border-radius: 4px; border: 1px solid ${itemCompleted ? '#8b5cf6' : 'rgba(255, 255, 255, 0.2)'}; background: ${itemCompleted ? '#8b5cf6' : 'transparent'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">
                        ${itemCompleted ? "✓" : ""}
                    </div>
                    <span style="${itemCompleted ? 'text-decoration: line-through; color: #606672;' : 'color: #f5f7fa; font-weight: 600;'}; font-size: 0.9rem;">
                        ${escapeHtml(text)}
                    </span>
                </div>
                <button type="button" onclick="removeChecklistItem(${index})" title="Remove item" style="background: none; border: none; color: #858b99; font-size: 14px; cursor: pointer; padding: 2px 6px; transition: color 0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#858b99'">✕</button>
            </div>
        `;
    }).join("");

    updateChecklistProgress(completedCount, parsedList.length);
}

function updateChecklistProgress(completed, total) {
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");

    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = `${completed} of ${total} completed`;
}


/* =========================================================
   UPDATE TASK STATUS & BACKEND SYNC
   ========================================================= */

async function updateTaskStatus() {
    const statusSelect = document.getElementById("statusSelect");
    if (!statusSelect) return;

    const newStatus = statusSelect.value; // "completed" or "todo"
    const isCompleted = newStatus === "completed";

    updateStatusPillUI(newStatus);

    if (currentTaskData) {
        currentTaskData.is_completed = isCompleted;
        currentTaskData.completed = isCompleted;
        currentTaskData.status = newStatus;
    }

    const detailStatus = document.getElementById("detailStatus");
    if (detailStatus) detailStatus.textContent = isCompleted ? "Completed" : "To do";

    // Exhaustive schema payload to ensure synchronization with My Tasks backend
    const updatePayload = {
        status: newStatus,              // "completed" or "todo"
        is_completed: isCompleted,      // boolean true / false
        completed: isCompleted,         // boolean true / false
        task_status: newStatus          // fallback field name
    };

    await syncTaskToDatabase(updatePayload);
}

function updateStatusPillUI(status) {
    const statusPill = document.getElementById("taskStatusPill");
    if (!statusPill) return;

    if (status === "completed") {
        statusPill.innerHTML = `<span class="status-dot" style="background:#22c55e; box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);"></span> Completed`;
    } else {
        statusPill.innerHTML = `<span class="status-dot" style="background:#8b5cf6; box-shadow: 0 0 8px rgba(139, 92, 246, 0.5);"></span> To do`;
    }
}


/* =========================================================
   SAVE CHANGES (EDIT TASK) & DELETE TASK
   ========================================================= */

const editModal = document.getElementById("editModal");
const deleteModal = document.getElementById("deleteModal");

function openEditModal() {
    if (editModal) editModal.classList.add("active");
}

function closeEditModal() {
    if (editModal) editModal.classList.remove("active");
}

function openDeleteModal() {
    if (deleteModal) deleteModal.classList.add("active");
}

function closeDeleteModal() {
    if (deleteModal) deleteModal.classList.remove("active");
}

async function saveTask(event) {
    if (event) event.preventDefault();

    const saveBtn = document.querySelector("#editModal .save-btn");
    if (saveBtn) saveBtn.textContent = "Saving...";

    const title = document.getElementById("editTitle").value.trim();
    const description = document.getElementById("editDescription").value.trim();
    const priority = document.getElementById("editPriority").value;
    const dueDate = document.getElementById("editDate").value;

    const payload = {
        title: title,
        description: description,
        priority: priority,
        due_date: dueDate || null
    };

    try {
        await syncTaskToDatabase(payload);

        if (currentTaskData) {
            currentTaskData.title = title;
            currentTaskData.description = description;
            currentTaskData.priority = priority;
            currentTaskData.due_date = dueDate;
            renderTaskDetailsUI(currentTaskData);
        } else {
            await loadTaskDetails();
        }

        closeEditModal();

    } catch (error) {
        console.error("Save task failed:", error);
    } finally {
        if (saveBtn) saveBtn.textContent = "Save changes";
    }
}

async function deleteTask() {
    const deleteBtn = document.querySelector("#deleteModal .confirm-delete");
    if (deleteBtn) deleteBtn.textContent = "Deleting...";

    try {
        try {
            await apiRequest(`/tasks/delete_task/${TASK_ID}`, { method: "DELETE" });
        } catch (e) {
            await apiRequest(`/tasks/${TASK_ID}`, { method: "DELETE" });
        }

        closeDeleteModal();
        window.location.href = "/tasks";

    } catch (error) {
        console.error("Delete task failed:", error);
        alert("Unable to delete task. Please try again.");
    } finally {
        if (deleteBtn) deleteBtn.textContent = "Delete task";
    }
}


/* =========================================================
   DATABASE SYNC UTILITY
   ========================================================= */

async function syncTaskToDatabase(updatePayload) {
    if (!TASK_ID || TASK_ID === "{{ task_id }}") return;

    try {
        try {
            return await apiRequest(`/tasks/update_task/${TASK_ID}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatePayload)
            });
        } catch (err) {
            return await apiRequest(`/tasks/${TASK_ID}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatePayload)
            });
        }
    } catch (error) {
        console.error("Error syncing task updates with backend:", error);
        throw error;
    }
}


/* =========================================================
   UTILITIES & GLOBAL EXPORTS
   ========================================================= */

function formatDate(dateStr) {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(value) {
    if (!value) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

window.saveTask = saveTask;
window.deleteTask = deleteTask;
window.addChecklistItem = addChecklistItem;
window.toggleChecklistStep = toggleChecklistStep;
window.removeChecklistItem = removeChecklistItem;
window.updateTaskStatus = updateTaskStatus;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;

document.addEventListener("DOMContentLoaded", async function () {
    await loadUserProfile();
    await loadTaskDetails();
});

document.addEventListener("click", function (event) {
    if (event.target === editModal) closeEditModal();
    if (event.target === deleteModal) closeDeleteModal();
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeEditModal();
        closeDeleteModal();
    }
});
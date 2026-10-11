
const API_URL = "api/tasks";

const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskDescription = document.getElementById("taskDescription");
const taskDate = document.getElementById("taskDate");
const taskPriority = document.getElementById("taskPriority");
const taskList = document.getElementById("taskList");
const message = document.getElementById("message");

const totalCount = document.getElementById("totalCount");
const pendingCount = document.getElementById("pendingCount");
const completedCount = document.getElementById("completedCount");

const saveButton = document.getElementById("saveButton");
const cancelButton = document.getElementById("cancelButton");
const formTitle = document.getElementById("formTitle");

let tasks = [];
let editingId = null;
let currentFilter = "all";

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}

function showMessage(text) {
    message.textContent = text;

    setTimeout(() => {
        if (message.textContent === text) {
            message.textContent = "";
        }
    }, 3000);
}

async function loadTasks() {
    try {
        tasks = await apiRequest(API_URL);
        renderTasks();
    } catch (error) {
        showMessage("Cannot connect to server. Please restart the server.");
        console.error(error);
    }
}

function renderTasks() {
    totalCount.textContent = tasks.length;
    pendingCount.textContent =
        tasks.filter(task => !task.completed).length;
    completedCount.textContent =
        tasks.filter(task => task.completed).length;

    const filteredTasks = tasks.filter(task => {
        if (currentFilter === "pending") return !task.completed;
        if (currentFilter === "completed") return task.completed;
        return true;
    });

    taskList.replaceChildren();

    if (filteredTasks.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = tasks.length === 0
            ? "No tasks yet. Add your first task above!"
            : "No tasks found in this category.";
        taskList.appendChild(empty);
        return;
    }

    filteredTasks.forEach(task => {
        const card = document.createElement("article");
        card.className = "task-card" + (task.completed ? " done" : "");

        const details = document.createElement("div");
        details.className = "task-details";

        const title = document.createElement("div");
        title.className = "task-title";
        title.textContent = task.title;

        const description = document.createElement("p");
        description.className = "task-description";
        description.textContent = task.description || "No description";

        const meta = document.createElement("div");
        meta.className = "task-meta";

        const dueDate = task.dueDate
            ? `Due: ${task.dueDate}`
            : "No due date";

        meta.textContent =
            `${dueDate} • ${task.completed ? "Completed" : "Pending"}`;

        const priority = document.createElement("span");
        priority.className = `priority ${task.priority}`;
        priority.textContent = `${task.priority} Priority`;

        details.append(title, description, meta, priority);

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const completeButton = document.createElement("button");
        completeButton.className = "complete-btn";
        completeButton.textContent =
            task.completed ? "Undo" : "Complete";
        completeButton.addEventListener("click", () => toggleTask(task));

        const editButton = document.createElement("button");
        editButton.className = "edit-btn";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => editTask(task));

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteTask(task));

        actions.append(completeButton, editButton, deleteButton);
        card.append(details, actions);
        taskList.appendChild(card);
    });
}

taskForm.addEventListener("submit", async event => {
    event.preventDefault();

    const title = taskTitle.value.trim();

    if (!title) {
        showMessage("Please enter a task name.");
        return;
    }

    const taskData = {
        title,
        description: taskDescription.value.trim(),
        dueDate: taskDate.value,
        priority: taskPriority.value
    };

    saveButton.disabled = true;

    try {
        if (editingId !== null) {
            await apiRequest(`${API_URL}/${editingId}`, {
                method: "PUT",
                body: JSON.stringify(taskData)
            });
            showMessage("Task updated successfully!");
        } else {
            await apiRequest(API_URL, {
                method: "POST",
                body: JSON.stringify(taskData)
            });
            showMessage("Task added successfully!");
        }

        resetForm();
        await loadTasks();
    } catch (error) {
        showMessage(error.message);
    } finally {
        saveButton.disabled = false;
    }
});

function editTask(task) {
    editingId = task.id;

    taskTitle.value = task.title;
    taskDescription.value = task.description || "";
    taskDate.value = task.dueDate || "";
    taskPriority.value = task.priority || "Medium";

    formTitle.textContent = "Edit Task";
    saveButton.textContent = "Save Changes";
    cancelButton.classList.remove("hidden");

    document.querySelector(".task-panel").scrollIntoView({
        behavior: "smooth"
    });

    taskTitle.focus();
}

async function toggleTask(task) {
    try {
        await apiRequest(`${API_URL}/${task.id}`, {
            method: "PATCH",
            body: JSON.stringify({ completed: !task.completed })
        });

        showMessage(task.completed
            ? "Task marked as pending."
            : "Task completed successfully!");

        await loadTasks();
    } catch (error) {
        showMessage(error.message);
    }
}

async function deleteTask(task) {
    if (!confirm(`Delete "${task.title}"?`)) return;

    try {
        await apiRequest(`${API_URL}/${task.id}`, {
            method: "DELETE"
        });

        if (editingId === task.id) resetForm();

        showMessage("Task deleted successfully!");
        await loadTasks();
    } catch (error) {
        showMessage(error.message);
    }
}

function resetForm() {
    taskForm.reset();
    editingId = null;

    formTitle.textContent = "Add a New Task";
    saveButton.textContent = "+ Add Task";
    cancelButton.classList.add("hidden");
}

cancelButton.addEventListener("click", resetForm);

document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;

        document.querySelectorAll(".filter-btn").forEach(btn => {
            btn.classList.toggle("active", btn === button);
        });

        renderTasks();
    });
});

document.getElementById("refreshButton").addEventListener(
    "click", loadTasks
);

loadTasks();

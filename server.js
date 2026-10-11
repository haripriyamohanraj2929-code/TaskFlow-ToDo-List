
const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const { randomUUID } = require("crypto");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const FRONTEND_DIR = path.join(__dirname, "my to do list");
const DATA_FILE = path.join(__dirname, "tasks.json");

app.use(express.json({ limit: "20kb" }));
app.use(express.static(FRONTEND_DIR));

async function readTasks() {
    try {
        const content = await fs.readFile(DATA_FILE, "utf8");
        const tasks = JSON.parse(content);
        return Array.isArray(tasks) ? tasks : [];
    } catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
    }
}

async function writeTasks(tasks) {
    await fs.writeFile(
        DATA_FILE,
        JSON.stringify(tasks, null, 2),
        "utf8"
    );
}

function validateTask(title, priority) {
    if (typeof title !== "string" || !title.trim()) {
        return "Task title is required.";
    }

    if (title.trim().length > 150) {
        return "Task title must be under 150 characters.";
    }

    if (
        priority !== undefined &&
        !["Low", "Medium", "High"].includes(priority)
    ) {
        return "Priority must be Low, Medium or High.";
    }

    return null;
}

app.get("/api/tasks", async (req, res, next) => {
    try {
        const tasks = await readTasks();
        res.json(tasks);
    } catch (error) {
        next(error);
    }
});

app.post("/api/tasks", async (req, res, next) => {
    try {
        const { title, description = "", dueDate = "", priority = "Medium" } =
            req.body;

        const errorMessage = validateTask(title, priority);
        if (errorMessage) {
            return res.status(400).json({ message: errorMessage });
        }

        if (
            typeof description !== "string" ||
            description.length > 1000 ||
            typeof dueDate !== "string"
        ) {
            return res.status(400).json({
                message: "Please check the description and due date."
            });
        }

        const tasks = await readTasks();

        const newTask = {
            id: randomUUID(),
            title: title.trim(),
            description: description.trim(),
            dueDate,
            priority,
            completed: false,
            createdAt: new Date().toISOString()
        };

        tasks.unshift(newTask);
        await writeTasks(tasks);

        res.status(201).json(newTask);
    } catch (error) {
        next(error);
    }
});

app.put("/api/tasks/:id", async (req, res, next) => {
    try {
        const { title, description = "", dueDate = "", priority = "Medium" } =
            req.body;

        const errorMessage = validateTask(title, priority);
        if (errorMessage) {
            return res.status(400).json({ message: errorMessage });
        }

        if (
            typeof description !== "string" ||
            description.length > 1000 ||
            typeof dueDate !== "string"
        ) {
            return res.status(400).json({
                message: "Please check the description and due date."
            });
        }

        const tasks = await readTasks();
        const index = tasks.findIndex(task => task.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ message: "Task not found." });
        }

        tasks[index] = {
            ...tasks[index],
            title: title.trim(),
            description: description.trim(),
            dueDate,
            priority
        };

        await writeTasks(tasks);
        res.json(tasks[index]);
    } catch (error) {
        next(error);
    }
});

app.patch("/api/tasks/:id", async (req, res, next) => {
    try {
        if (typeof req.body.completed !== "boolean") {
            return res.status(400).json({
                message: "Completed must be true or false."
            });
        }

        const tasks = await readTasks();
        const task = tasks.find(item => item.id === req.params.id);

        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }

        task.completed = req.body.completed;
        await writeTasks(tasks);

        res.json(task);
    } catch (error) {
        next(error);
    }
});

app.delete("/api/tasks/:id", async (req, res, next) => {
    try {
        const tasks = await readTasks();
        const remainingTasks = tasks.filter(
            task => task.id !== req.params.id
        );

        if (remainingTasks.length === tasks.length) {
            return res.status(404).json({ message: "Task not found." });
        }

        await writeTasks(remainingTasks);
        res.json({ message: "Task deleted successfully." });
    } catch (error) {
        next(error);
    }
});

app.get("/", (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
});

app.listen(PORT, () => {
    console.log(`TaskFlow server running at http://localhost:${PORT}`);
});

const taskEvents = require("./events");

// Register task-created listener
taskEvents.on("task-created", (task) => {
  setTimeout(() => {
    console.log(`[Notification Async] Task "${task.title}" created at ${new Date().toISOString()} | Priority: ${task.priority || "medium"}`);
  }, 100);
});

// Register task-deleted listener (Post-Lab Task)
taskEvents.on("task-deleted", (taskData) => {
  setTimeout(() => {
    console.log(`[Notification Async] Task ID ${taskData.id} deleted at ${new Date().toISOString()}`);
  }, 100);
});

// Register error listener (Post-Lab Task)
taskEvents.on("error", (err) => {
  console.error(`[Event Error Listener] Handled background error: ${err.message}`);
});

console.log("✅ Event listeners registered successfully.");

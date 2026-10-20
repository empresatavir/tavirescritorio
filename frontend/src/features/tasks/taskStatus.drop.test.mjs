/**
 * Smoke test das regras de drag-and-drop (espelha resolveColumnDrop).
 * Rodar: node src/features/tasks/taskStatus.drop.test.mjs
 */
function columnForStatus(status) {
  return status === "planning" ? "to_plan" : status;
}

function resolveColumnDrop(task, targetCol) {
  const fromCol = columnForStatus(task.status);
  if (fromCol === targetCol) return { type: "noop" };
  if (task.status === "planning") {
    return { type: "blocked", reason: "planning" };
  }
  if (fromCol === "to_plan") {
    if (targetCol === "planned" || targetCol === "in_progress" || targetCol === "done") {
      return { type: "blocked" };
    }
  }
  if (fromCol === "planned") {
    if (targetCol === "to_plan") return { type: "status", status: "to_plan" };
    if (targetCol === "in_progress") return { type: "start_execution" };
    if (targetCol === "done") return { type: "blocked" };
  }
  if (fromCol === "in_progress") {
    if (targetCol === "planned") {
      return task.activeJobId ? { type: "stop_execution" } : { type: "status", status: "planned" };
    }
    if (targetCol === "done") return { type: "status", status: "done" };
    if (targetCol === "to_plan") return { type: "blocked" };
  }
  if (fromCol === "done") {
    if (targetCol === "to_plan") return { type: "status", status: "to_plan" };
    if (targetCol === "planned") return { type: "status", status: "planned" };
    if (targetCol === "in_progress") return { type: "blocked" };
  }
  return { type: "blocked" };
}

function assertEq(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

assertEq(resolveColumnDrop({ status: "planned" }, "in_progress").type, "start_execution", "planned→exec");
assertEq(resolveColumnDrop({ status: "in_progress", activeJobId: "j1" }, "planned").type, "stop_execution", "exec→planned");
assertEq(resolveColumnDrop({ status: "to_plan" }, "done").type, "blocked", "to_plan→done");
assertEq(resolveColumnDrop({ status: "planning" }, "planned").type, "blocked", "planning locked");
assertEq(resolveColumnDrop({ status: "in_progress" }, "done").type, "status", "exec→done");
assertEq(resolveColumnDrop({ status: "done" }, "planned").type, "status", "reopen");

console.log("taskStatus.drop.test.mjs OK");

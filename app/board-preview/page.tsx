"use client";
import PostItBoard, { type BoardTask } from "@/components/today/PostItBoard";
import { useState } from "react";
const now = new Date().toISOString();
export default function Preview() {
  const [tasks, setTasks] = useState<BoardTask[]>([
    { id: "1", title: "Call Northline Dental about the proposal", type: "call", notes: null, due_at: now, lead_id: null, source: "automation" },
    { id: "2", title: "Write follow-up for Cedar Grove", type: "email", notes: null, due_at: now, lead_id: null, source: "manual" },
    { id: "3", title: "Prepare pricing deck", type: "todo", notes: null, due_at: null, lead_id: null, source: "manual", board_status: "doing" },
    { id: "4", title: "Send invoice to Riverbend", type: "follow_up", notes: null, due_at: now, lead_id: null, source: "manual", completed_at: now },
  ]);
  return (
    <main className="baselead-main min-h-screen bg-[#050505] p-6 text-white">
      <PostItBoard tasks={tasks} loading={false} onAdd={() => {}} onMove={(t, c) => setTasks((all) => all.map((x) => x.id === t.id ? { ...x, board_status: c, completed_at: c === "done" ? now : null } : x))} />
    </main>
  );
}

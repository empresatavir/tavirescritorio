import type { ParentProps } from "solid-js";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function Shell(props: ParentProps) {
  return (
    <div class="flex h-screen w-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] font-[var(--font-body)]">
      <Sidebar />
      <div class="flex flex-1 flex-col min-w-0">
        <Header />
        <main class="flex-1 overflow-auto p-6">
          {props.children}
        </main>
      </div>
    </div>
  );
}
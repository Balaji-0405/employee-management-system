import { Outlet } from "react-router-dom";
import type { CSSProperties } from "react";

import { SidebarProvider, SidebarInset } from "../ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";

import { AppStoreProvider } from "../app-store";

export function AppLayout() {
  return (
    <AppStoreProvider>
      <SidebarProvider
        style=
        {{
            "--sidebar-width": "260px",
            "--sidebar-width-icon": "80px",
          } as CSSProperties
        }
        className="w-full h-screen flex overflow-x-hidden"
      >
        <AppSidebar />

        <SidebarInset className="flex flex-col h-screen overflow-hidden">
          <Topbar />

          <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AppStoreProvider>
  );
}

import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Sparkles,
  Scissors,
  FolderOpen,
  Library,
  LayoutTemplate,
  Settings,
  Clapperboard,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ai-clips", label: "AI Clip Generator", icon: Sparkles },
  { to: "/editor", label: "Manual Editor", icon: Scissors },
  { to: "/projects", label: "Projects", icon: FolderOpen },
  { to: "/media", label: "Media Library", icon: Library },
  { to: "/templates", label: "Templates", icon: LayoutTemplate },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-2 px-5 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <Clapperboard className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight">AI Stream Clipper</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-4 text-xs text-muted-foreground">
        Local processing · v0.1.0
      </div>
    </aside>
  );
}

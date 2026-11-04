import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { connectProgressSocket } from "@/lib/ws";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { Dashboard } from "@/pages/Dashboard";
import { ImportPage } from "@/pages/ImportPage";
import { AiClipsPage } from "@/pages/AiClipsPage";
import { EditorPage } from "@/pages/EditorPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { MediaLibraryPage } from "@/pages/MediaLibraryPage";
import { TemplatesPage } from "@/pages/TemplatesPage";
import { SettingsPage } from "@/pages/SettingsPage";

export default function App() {
  const setMedia = useAppStore((s) => s.setMedia);
  const setClips = useAppStore((s) => s.setClips);
  const setProjects = useAppStore((s) => s.setProjects);

  useEffect(() => {
    connectProgressSocket();
    refresh();
  }, []);

  async function refresh() {
    try {
      const [media, clips, projects] = await Promise.all([
        api.get("/api/media"),
        api.get("/api/clips"),
        api.get("/api/projects"),
      ]);
      setMedia(media as never);
      setClips(clips as never);
      setProjects(projects as never);
    } catch {
      /* backend may not be up yet */
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard onRefresh={refresh} />} />
          <Route path="/import" element={<ImportPage onRefresh={refresh} />} />
          <Route path="/ai-clips" element={<AiClipsPage onRefresh={refresh} />} />
          <Route path="/editor/:clipId?" element={<EditorPage onRefresh={refresh} />} />
          <Route path="/projects" element={<ProjectsPage onRefresh={refresh} />} />
          <Route path="/media" element={<MediaLibraryPage onRefresh={refresh} />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

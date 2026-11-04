import { useAppStore } from "@/store/useAppStore";

let socket: WebSocket | null = null;

export function connectProgressSocket() {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const url = `${proto}://${window.location.host}/ws/progress`;
  socket = new WebSocket(url);

  socket.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      const { job_id, progress, status } = data;
      if (job_id) {
        useAppStore.getState().setJobProgress(job_id, {
          progress,
          ...(status ? { status } : {}),
        });
      }
    } catch {
      /* ignore malformed messages */
    }
  };

  socket.onclose = () => {
    // auto-reconnect after a short delay
    setTimeout(() => {
      if (!socket || socket.readyState === WebSocket.CLOSED) {
        connectProgressSocket();
      }
    }, 3000);
  };
}

export function watchJob(jobId: string) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ job_id: jobId }));
    return;
  }
  const retry = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ job_id: jobId }));
      clearInterval(retry);
    }
  }, 500);
}

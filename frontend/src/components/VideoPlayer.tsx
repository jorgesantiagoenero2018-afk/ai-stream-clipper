import { useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface Props {
  src: string;
  start?: number;
  end?: number;
  playing?: boolean;
  onTimeUpdate?: (t: number) => void;
}

export function VideoPlayer({ src, start = 0, end, playing = false, onTimeUpdate }: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (playing) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [playing]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (end != null && v.currentTime > end) {
      v.pause();
    }
  }, [end]);

  return (
    <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-black">
      <video
        ref={ref}
        src={src}
        className="h-full w-full object-contain"
        controls
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          if (end != null && t >= end) {
            e.currentTarget.pause();
          }
          onTimeUpdate?.(t);
        }}
        onLoadedMetadata={(e) => {
          e.currentTarget.currentTime = start;
        }}
      />
    </div>
  );
}

export function PlayButton({ playing, onClick }: { playing: boolean; onClick: () => void }) {
  return (
    <button className="btn-secondary" onClick={onClick}>
      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      {playing ? "Pause" : "Play"}
    </button>
  );
}

import { useMemo } from "react";

export type Shape =
  | { type: "circle"; r: number; color?: string }
  | { type: "rect"; w: number; h: number; color?: string }
  | { type: "triangle"; size: number; color?: string };

export default function ShapeDisplayer({ shape }: { shape: Shape }) {
  const viewBox = useMemo(() => "0 0 100 100", []);

  return (
    <div className="p-2 bg-white rounded-lg shadow-sm inline-block">
      <svg viewBox={viewBox} width={200} height={200}>
        {shape.type === "circle" && (
          <circle cx={50} cy={50} r={shape.r} fill={shape.color || "#60a5fa"} />
        )}

        {shape.type === "rect" && (
          <rect
            x={(100 - shape.w) / 2}
            y={(100 - shape.h) / 2}
            width={shape.w}
            height={shape.h}
            fill={shape.color || "#34d399"}
            rx={6}
          />
        )}

        {shape.type === "triangle" && (
          <polygon
            points={`${50},${50 - shape.size / 2} ${50 - shape.size / 2},${50 + shape.size / 2} ${50 + shape.size / 2},${50 + shape.size / 2}`}
            fill={shape.color || "#f59e0b"}
          />
        )}
      </svg>
    </div>
  );
}

import { motion } from "framer-motion";

interface ProgressBarProps {
  progress: number; // Progress percentage (0-100)
  timeRemaining: string; // Time remaining text
}

export default function ProgressBar({ progress, timeRemaining }: ProgressBarProps) {
  return (
    <div style={{ 
      width: "100%", 
      height: "40px", 
      backgroundColor: "rgba(0, 0, 0, 0.3)", 
      borderRadius: "8px", 
      overflow: "hidden",
      position: "relative"
    }}>
      <motion.div
        style={{ 
          height: "100%", 
          backgroundColor: "#ef4444",
          position: "absolute",
          top: 0,
          left: 0
        }}
        animate={{ width: `${progress}%` }}
        transition={{ ease: "linear", duration: 0.1 }}
      />
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        color: "white",
        fontWeight: "600",
        fontSize: "16px",
        zIndex: 10
      }}>
        {timeRemaining}
      </div>
    </div>
  );
}

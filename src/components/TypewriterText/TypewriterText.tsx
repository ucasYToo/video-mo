import React from "react";
import { useCurrentFrame } from "remotion";

interface TypewriterTextProps {
  text: string;
  startFrame: number;
  speed?: number;
  blinkCursor?: boolean;
  cursorChar?: string;
  className?: string;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  startFrame,
  speed = 2,
  blinkCursor = true,
  cursorChar = "|",
  className = "",
}) => {
  const frame = useCurrentFrame();
  const progress = Math.max(0, frame - startFrame);
  const charCount = Math.floor(progress / speed);
  const visibleText = text.slice(0, Math.min(charCount, text.length));
  const isFinished = charCount >= text.length;

  const showCursor =
    blinkCursor &&
    visibleText.length > 0 &&
    (!isFinished || frame % 60 < 30);

  return (
    <span className={`inline whitespace-pre-wrap break-words ${className}`}>
      {visibleText}
      {showCursor && <span className="inline-block ml-0.5">{cursorChar}</span>}
    </span>
  );
};

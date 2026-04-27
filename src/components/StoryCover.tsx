import React from "react";
import { AbsoluteFill } from "remotion";
import { TitleCard } from "./TitleCard";
import type { StoryTitle } from "../types/story";

export const StoryCover: React.FC<{ title: StoryTitle; bgColor: string }> = ({ title, bgColor }) => {
  return (
    <AbsoluteFill
      className="flex items-center justify-center"
      style={{ backgroundColor: bgColor }}
    >
      <TitleCard title={title} />
    </AbsoluteFill>
  );
};
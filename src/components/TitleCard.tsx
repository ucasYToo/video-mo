import React from "react";
import { Img, staticFile } from "remotion";
import type { StoryTitle } from "../types/story";

export const TitleCard: React.FC<{ title: StoryTitle }> = ({ title }) => {
  return (
    <div className="flex flex-col items-center justify-center">
      {title.lines.map((line, i) =>
        i === 0 ? (
          <div key={i} className="text-[32px] text-gray-500 tracking-[0.5em] font-serif mb-8">
            {line}
          </div>
        ) : (
          <div key={i} className="text-[80px] font-bold text-white tracking-wider font-serif">
            {line}
          </div>
        ),
      )}
      {title.image && (
        <Img
          src={staticFile(title.image)}
          className="mt-10"
          style={{ maxWidth: 360, maxHeight: 200, objectFit: "contain" }}
        />
      )}
      <div className="w-20 h-px bg-white/20 mt-10" />
    </div>
  );
};
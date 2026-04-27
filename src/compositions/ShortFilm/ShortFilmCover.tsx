import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";

export const ShortFilmCover: React.FC = () => {
  return (
    <AbsoluteFill
      className="flex flex-col items-center justify-center"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="text-[32px] text-gray-500 tracking-[0.5em] font-serif mb-8">
        猎妖人
      </div>
      <div className="text-[80px] font-bold text-white tracking-wider font-serif">
        职业道德问题
      </div>
      <Img
        src={staticFile("calligraphy.png")}
        className="mt-10"
        style={{ maxWidth: 360, maxHeight: 200, objectFit: "contain" }}
      />
      <div className="w-20 h-px bg-white/20 mt-10" />
    </AbsoluteFill>
  );
};
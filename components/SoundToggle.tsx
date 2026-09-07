"use client";

import React, { useState, useEffect } from "react";
import { soundEngine } from "@/lib/sound-effects";
import { Volume2, VolumeX } from "lucide-react";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(soundEngine.isEnabled());
  }, []);

  const handleToggle = () => {
    const newState = soundEngine.toggle();
    setEnabled(newState);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={enabled ? "Mute auction sound effects" : "Unmute auction sound effects"}
      title={enabled ? "Sound effects enabled (click to mute)" : "Sound effects muted (click to unmute)"}
      className={`px-2 py-1 rounded-[2px] border text-[12px] font-medium transition-all flex items-center gap-1.5 ${
        enabled
          ? "bg-[#10151A] border-[#2B343C] text-[#C7A046] hover:border-[#C7A046]"
          : "bg-[#10151A] border-[#2B343C] text-[#8B939A] hover:text-[#EDEAE1]"
      }`}
    >
      {enabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
      <span className="hidden sm:inline">{enabled ? "Audio On" : "Muted"}</span>
    </button>
  );
}

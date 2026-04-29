"use client";

import React from "react";
import AI_Prompt from "@/components/kokonutui/ai-prompt";
import DraftAdhAILogo from "@/components/ui/draft-adhai-logo";

const AI = () => {
  return (
    <div className="h-screen flex flex-col items-center justify-center w-full">
      <DraftAdhAILogo size="lg" />
      <AI_Prompt />
    </div>
  );
};

export default AI;
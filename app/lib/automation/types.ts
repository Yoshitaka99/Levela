export type AutomationSource = {
  url: string;
  title: string;
  text: string;
};

export type AutomationRequest = {
  urls: string[];
  discordText?: string;
  instruction?: string;
  trigger?: "manual" | "discord" | "schedule" | "cli";
};

export type AutomationResult = {
  id: string;
  title: string;
  summary: string;
  imageUrl: string;
  imagePath: string;
  usedAiImage: boolean;
  sources: AutomationSource[];
};

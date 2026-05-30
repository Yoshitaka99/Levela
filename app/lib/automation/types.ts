export type AutomationSource = {
  url: string;
  title: string;
  text: string;
};

export type AutomationRequest = {
  urls: string[];
  discordText?: string;
  discordWebhookUrl?: string;
  discordThreadId?: string;
  instruction?: string;
  trigger?: "manual" | "discord" | "schedule" | "cli";
};

export type AutomationResult = {
  id: string;
  title: string;
  summary: string;
  imageUrl: string;
  imagePath: string;
  imageDataUrl?: string;
  usedAiImage: boolean;
  sources: AutomationSource[];
};

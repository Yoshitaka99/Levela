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
  skipDiscordPost?: boolean;
  trigger?: "manual" | "discord" | "schedule" | "cli";
};

export type AutomationResult = {
  id: string;
  title: string;
  summary: string;
  imageUrl: string;
  imagePath: string;
  imageDataUrl?: string;
  extraImages?: AutomationImage[];
  usedAiImage: boolean;
  sources: AutomationSource[];
};

export type AutomationImage = {
  label: string;
  fileName: string;
  imagePath: string;
  imageUrl: string;
  imageDataUrl?: string;
  usedAiImage: boolean;
};

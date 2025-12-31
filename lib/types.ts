export type TriggerId =
  | "slime"
  | "kinetic-sand"
  | "cutting"
  | "crushing"
  | "tapping"
  | "brushing"
  | "liquid"
  | "texture";

export interface TriggerDefinition {
  id: TriggerId;
  label: string;
  keywords: string[];
  visualHooks: string[];
  defaultPalette: string[];
  description: string;
}

export interface VariantBlueprint {
  id: string;
  title: string;
  trigger: TriggerDefinition;
  duration: number;
  palette: {
    background: string;
    primary: string;
    secondary: string;
    highlight: string;
  };
  motion: {
    oscillators: number;
    loopHarmony: number;
    turbulence: number;
    depthShift: number;
    shimmer: number;
  };
  audio: {
    noiseColor: "white" | "pink" | "brown";
    filterHz: number;
    gain: number;
    textureAmount: number;
    pulseRate: number;
  };
  texture: {
    grain: number;
    bubble: number;
    ripple: number;
  };
  notes: string;
}

export interface CaptionPayload {
  caption: string;
  hashtags: string[];
  keywords: string[];
}


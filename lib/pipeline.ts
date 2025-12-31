import { CaptionPayload, TriggerDefinition, TriggerId, VariantBlueprint } from "./types";

const triggerLibrary: TriggerDefinition[] = [
  {
    id: "slime",
    label: "Glossy Slime Folds",
    description: "Close-up kneading of glossy slime with delicate stretches and folds.",
    keywords: ["slime", "goo", "stretch", "glossy", "satisfying"],
    visualHooks: ["viscous", "gloss sheen", "slow stretch"],
    defaultPalette: ["#4ab3b7", "#8de5dc", "#e8fff9"],
  },
  {
    id: "kinetic-sand",
    label: "Kinetic Sand Slicing",
    description: "Crisp slices through kinetic sand revealing layered textures.",
    keywords: ["kinetic sand", "sand", "slicing", "crunch", "layered"],
    visualHooks: ["layered blocks", "clean cuts", "sandy grains"],
    defaultPalette: ["#d0986a", "#f4cfaa", "#fef3dd"],
  },
  {
    id: "cutting",
    label: "Precision Cutting",
    description: "Slicing through soft objects with razor precision.",
    keywords: ["cut", "slice", "soap", "foam", "shaving"],
    visualHooks: ["satisfying cuts", "perfect cubes", "smooth glide"],
    defaultPalette: ["#f2d0e5", "#fef5ff", "#ffe3f1"],
  },
  {
    id: "crushing",
    label: "Soft Crushing",
    description: "Gentle crushing of textured materials creating soft bursts.",
    keywords: ["crush", "crunch", "press", "squish", "powder"],
    visualHooks: ["slow press", "particle bursts", "macro pressure"],
    defaultPalette: ["#ffa47a", "#ffd8c2", "#fff1e8"],
  },
  {
    id: "tapping",
    label: "Tapping & Resonance",
    description: "Rapid tapping on glossy surfaces with rhythmic resonance.",
    keywords: ["tap", "click", "typing", "nails", "tock"],
    visualHooks: ["glossy surface", "micro vibrations", "sparkle trails"],
    defaultPalette: ["#7f8cff", "#d5d9ff", "#f1f2ff"],
  },
  {
    id: "brushing",
    label: "Brush Glides",
    description: "Soft brush strokes over textured material creating ripples.",
    keywords: ["brush", "stroke", "paint", "makeup", "glide"],
    visualHooks: ["soft bristles", "flowing strokes", "powder swirls"],
    defaultPalette: ["#b4dfff", "#fcfeff", "#e0f3ff"],
  },
  {
    id: "liquid",
    label: "Liquid Ripples",
    description: "Viscous liquid pours and loops with macro ripples.",
    keywords: ["liquid", "water", "pour", "drip", "ripple"],
    visualHooks: ["surface tension", "pours", "droplets"],
    defaultPalette: ["#4b9fea", "#84d0ff", "#ebfbff"],
  },
  {
    id: "texture",
    label: "Texture Patterns",
    description: "Macro shots of evolving textures and repeating patterns.",
    keywords: ["texture", "pattern", "loop", "macro", "fabric"],
    visualHooks: ["morphing textures", "repeating loops", "micro detail"],
    defaultPalette: ["#8885f8", "#cdbdff", "#f3f0ff"],
  },
];

export interface Interpretation {
  cleanedPrompt: string;
  trigger: TriggerDefinition;
  focusWords: string[];
  vibe: string;
  seed: number;
}

const allKeywords = triggerLibrary.flatMap((trigger) => trigger.keywords);

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 0x100000000;
    return value / 0x100000000;
  };
}

export function interpretPrompt(rawPrompt: string): Interpretation {
  const cleaned = rawPrompt.trim().toLowerCase();

  let matchedTrigger: TriggerDefinition | undefined;
  for (const trigger of triggerLibrary) {
    if (trigger.keywords.some((keyword) => cleaned.includes(keyword))) {
      matchedTrigger = trigger;
      break;
    }
  }

  if (!matchedTrigger) {
    const fallbackMap: Record<string, TriggerId> = {
      crunch: "kinetic-sand",
      crunchy: "kinetic-sand",
      glow: "slime",
      shimmer: "liquid",
      foam: "cutting",
      brush: "brushing",
      sand: "kinetic-sand",
      sprinkle: "texture",
      bubble: "liquid",
    };
    for (const [keyword, id] of Object.entries(fallbackMap)) {
      if (cleaned.includes(keyword)) {
        matchedTrigger = triggerLibrary.find((trigger) => trigger.id === id);
        break;
      }
    }
  }

  const trigger = matchedTrigger ?? triggerLibrary.find((t) => t.id === "slime")!;

  const focusWords = cleaned
    .split(/\s+/)
    .filter((word) => allKeywords.includes(word) || word.length > 4)
    .slice(0, 5);

  const vibe = focusWords.length ? focusWords.join(" • ") : trigger.visualHooks[0];

  const seed = hashString(`${cleaned}|${trigger.id}`);

  return {
    cleanedPrompt: cleaned,
    trigger,
    focusWords,
    vibe,
    seed,
  };
}

function buildPalette(basePalette: string[], rand: () => number) {
  const [primary, secondary, backup] = basePalette;
  const highlight = mixColor(primary, "#ffffff", 0.65);
  const backgroundShift = mixColor(backup ?? "#f8f8f8", "#ffffff", 0.75 + rand() * 0.1);
  return {
    background: backgroundShift,
    primary,
    secondary,
    highlight,
  };
}

function mixColor(hex1: string, hex2: string, ratio: number) {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  const r = Math.round(c1.r * (1 - ratio) + c2.r * ratio);
  const g = Math.round(c1.g * (1 - ratio) + c2.g * ratio);
  const b = Math.round(c1.b * (1 - ratio) + c2.b * ratio);
  return rgbToHex(r, g, b);
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function buildVariantBlueprints(input: Interpretation): VariantBlueprint[] {
  const rand = seededRandom(input.seed);
  const variants: VariantBlueprint[] = [];

  for (let index = 0; index < 3; index += 1) {
    const duration = 5.2 + rand() * 3.2;
    const harmonyBase = 0.7 + rand() * 0.25 - index * 0.05;
    const turbulence = 0.08 + rand() * 0.28 + index * 0.03;
    const shimmer = input.trigger.id === "liquid" ? 0.35 + rand() * 0.25 : 0.18 + rand() * 0.22;
    const oscillators = Math.round(2 + rand() * 3 + (input.trigger.id === "tapping" ? 2 : 0));

    variants.push({
      id: `${input.trigger.id}-${index + 1}`,
      title: buildVariantTitle(input.trigger.label, index),
      trigger: input.trigger,
      duration,
      palette: buildPalette(input.trigger.defaultPalette, rand),
      motion: {
        oscillators,
        loopHarmony: Math.min(0.98, harmonyBase),
        turbulence: Math.min(0.5, turbulence),
        depthShift: 0.15 + rand() * 0.45,
        shimmer,
      },
      audio: {
        noiseColor: index === 0 ? "pink" : index === 1 ? "white" : "brown",
        filterHz: 400 + rand() * 900 + (input.trigger.id === "tapping" ? 600 : 0),
        gain: 0.22 + rand() * 0.1,
        textureAmount: 0.3 + rand() * 0.35,
        pulseRate: 0.8 + rand() * 1.2 + (input.trigger.id === "tapping" ? 0.6 : 0),
      },
      texture: {
        grain: 0.25 + rand() * 0.4,
        bubble: input.trigger.id === "slime" ? 0.5 + rand() * 0.3 : 0.18 + rand() * 0.45,
        ripple: input.trigger.id === "liquid" ? 0.6 + rand() * 0.25 : 0.3 + rand() * 0.35,
      },
      notes: [
        input.trigger.description,
        `Focus: ${input.vibe}`,
        `Loop complexity ${oscillators} oscillators`,
      ].join(" • "),
    });
  }

  return variants;
}

function buildVariantTitle(triggerLabel: string, index: number) {
  const suffix = ["Flow Loop", "Micro Loop", "Pulse Loop"][index] ?? `Loop ${index + 1}`;
  return `${triggerLabel} – ${suffix}`;
}

export function estimateLoopSmoothness(variant: VariantBlueprint) {
  const harmonyScore = variant.motion.loopHarmony;
  const turbulencePenalty = variant.motion.turbulence * 0.75;
  const shimmerPenalty = Math.max(0, variant.motion.shimmer - 0.4) * 0.2;
  const depthBonus = variant.motion.depthShift * 0.05;

  const score = Math.max(
    0.15,
    Math.min(0.99, harmonyScore - turbulencePenalty - shimmerPenalty + depthBonus),
  );
  return score;
}

export function generateCaptionPayload(
  prompt: string,
  interpretation: Interpretation,
  selectedVariant: VariantBlueprint,
): CaptionPayload {
  const coreTrigger = interpretation.trigger.label.replace(/\s+/g, " ");
  const baseKeywords = new Set<string>([
    "asmr",
    "satisfying",
    "shorts",
    interpretation.trigger.id.replace("-", " "),
  ]);

  interpretation.focusWords.forEach((word) => baseKeywords.add(word));

  const keywords = Array.from(baseKeywords).slice(0, 6);

  const accentWord =
    interpretation.focusWords[0]?.replace(/[^a-z0-9]/gi, "") ??
    interpretation.trigger.visualHooks[0];

  const caption = `Oddly satisfying ${accentWord} loop – watch twice 👀`;

  const hashtags = [`#${interpretation.trigger.id.replace("-", "")}`, "#asmrshorts", "#satisfying"];

  return {
    caption,
    hashtags,
    keywords,
  };
}

export function describeLoop(variant: VariantBlueprint) {
  const smoothness = estimateLoopSmoothness(variant);
  const turbulence = variant.motion.turbulence;
  if (smoothness > 0.9) {
    return "Seamless loop detected – motion returns to start frame without drift.";
  }
  if (turbulence < 0.18) {
    return "Micro fluctuations kept minimal – near-perfect loop.";
  }
  return "Loop contains slight organic variation for realism.";
}


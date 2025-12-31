'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VariantCard from "@/components/VariantCard";
import {
  buildVariantBlueprints,
  describeLoop,
  estimateLoopSmoothness,
  generateCaptionPayload,
  interpretPrompt,
  type Interpretation,
} from "@/lib/pipeline";
import type { CaptionPayload, VariantBlueprint } from "@/lib/types";

interface GeneratedVariant {
  blueprint: VariantBlueprint;
  loopScore: number;
  analysis: string;
  status: "pending" | "rendering" | "ready" | "failed";
  mediaUrl?: string;
  error?: string;
}

interface UploadSummary {
  completedAt: string;
  message: string;
}

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;
const TARGET_FPS = 60;

export default function Home() {
  const [prompt, setPrompt] = useState("Crunchy kinetic sand ASMR");
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);
  const [variants, setVariants] = useState<GeneratedVariant[]>([]);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [captionPayload, setCaptionPayload] = useState<CaptionPayload | null>(null);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urlRegistry = useRef<string[]>([]);

  useEffect(
    () => () => {
      urlRegistry.current.forEach((url) => URL.revokeObjectURL(url));
      urlRegistry.current = [];
    },
    [],
  );

  const supportsMediaRecorder = useMemo(() => {
    return typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined";
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!supportsMediaRecorder) {
      setError("MediaRecorder not supported in this environment.");
      return;
    }

    if (!prompt.trim()) {
      setError("Enter a descriptive ASMR prompt to generate variants.");
      return;
    }

    setError(null);
    setUploadSummary(null);
    setCaptionPayload(null);
    setWinnerId(null);
    setIsGenerating(true);

    urlRegistry.current.forEach((url) => URL.revokeObjectURL(url));
    urlRegistry.current = [];

    try {
      const interpretationResult = interpretPrompt(prompt);
      const blueprints = buildVariantBlueprints(interpretationResult);
      setInterpretation(interpretationResult);

      setVariants(
        blueprints.map((blueprint) => ({
          blueprint,
          loopScore: estimateLoopSmoothness(blueprint),
          analysis: describeLoop(blueprint),
          status: "pending",
        })),
      );

      const generatedResults: GeneratedVariant[] = [];

      for (const blueprint of blueprints) {
        setVariants((current) =>
          current.map((variant) =>
            variant.blueprint.id === blueprint.id
              ? { ...variant, status: "rendering" }
              : variant,
          ),
        );

        try {
          const media = await generateVariantMedia(blueprint);
          urlRegistry.current.push(media.url);

          const variantRecord: GeneratedVariant = {
            blueprint,
            loopScore: media.loopScore,
            analysis: media.analysis,
            status: "ready",
            mediaUrl: media.url,
          };
          generatedResults.push(variantRecord);

          setVariants((current) =>
            current.map((variant) =>
              variant.blueprint.id === blueprint.id
                ? { ...variant, status: "ready", mediaUrl: media.url, loopScore: media.loopScore }
                : variant,
            ),
          );
        } catch (variantError) {
          const message =
            variantError instanceof Error ? variantError.message : "Unknown generation error.";
          setVariants((current) =>
            current.map((variant) =>
              variant.blueprint.id === blueprint.id
                ? { ...variant, status: "failed", error: message }
                : variant,
            ),
          );
        }
      }

      if (generatedResults.length === 0) {
        throw new Error("All variant generations failed.");
      }

      const winningVariant = generatedResults.reduce((best, current) =>
        current.loopScore > best.loopScore ? current : best,
      );

      setWinnerId(winningVariant.blueprint.id);

      const captionData = generateCaptionPayload(
        prompt,
        interpretationResult,
        winningVariant.blueprint,
      );
      setCaptionPayload(captionData);

      const summary = await simulateUpload(winningVariant, captionData);
      setUploadSummary(summary);
    } catch (generationError) {
      const message =
        generationError instanceof Error ? generationError.message : "Unexpected failure.";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, supportsMediaRecorder]);

  return (
    <main className="page">
      <div className="page__hero">
        <h1>Agentic ASMR Shorts Studio</h1>
        <p>
          Generate three macro ASMR loop variants, score their loop smoothness, automatically pick
          the best, craft SEO-friendly captions, and simulate instant YouTube Shorts publishing.
        </p>
        <form
          className="prompt-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleGenerate();
          }}
        >
          <label className="prompt-form__label" htmlFor="prompt">
            ASMR request
          </label>
          <div className="prompt-form__controls">
            <input
              id="prompt"
              name="prompt"
              type="text"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="e.g. Crunchy kinetic sand ASMR"
              required
            />
            <button type="submit" disabled={isGenerating}>
              {isGenerating ? "Generating…" : "Generate trio"}
            </button>
          </div>
        </form>
        {interpretation ? (
          <section className="context">
            <div>
              <h2>Prompt interpretation</h2>
              <ul>
                <li>
                  <strong>Trigger:</strong> {interpretation.trigger.label}
                </li>
                <li>
                  <strong>Focus:</strong> {interpretation.vibe}
                </li>
                <li>
                  <strong>Seed:</strong> {interpretation.seed}
                </li>
              </ul>
            </div>
          </section>
        ) : null}
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      <section className="variants">
        <header className="variants__header">
          <h2>Variant generation</h2>
          <span>{isGenerating ? "Rendering variants…" : "Awaiting prompt"}</span>
        </header>
        <div className="variants__grid">
          {variants.map((variant) => (
            <VariantCard
              key={variant.blueprint.id}
              variant={variant.blueprint}
              mediaUrl={variant.mediaUrl}
              loopScore={variant.loopScore}
              status={variant.status}
              isWinner={variant.blueprint.id === winnerId}
            />
          ))}
        </div>
      </section>

      {winnerId && captionPayload ? (
        <section className="delivery">
          <header>
            <h2>Publishing payload</h2>
            <p>Best loop selected and delivered to Shorts.</p>
          </header>
          <div className="delivery__content">
            <div>
              <h3>Caption</h3>
              <p className="delivery__caption">{captionPayload.caption}</p>
            </div>
            <div>
              <h3>Hashtags</h3>
              <p>{captionPayload.hashtags.join(" ")}</p>
            </div>
            <div>
              <h3>Search keywords</h3>
              <p>{captionPayload.keywords.join(", ")}</p>
            </div>
          </div>
          {uploadSummary ? (
            <div className="upload-summary">
              <strong>{uploadSummary.message}</strong>
              <span>{uploadSummary.completedAt}</span>
            </div>
          ) : (
            <div className="upload-summary">
              <span>Uploading to Shorts…</span>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}

async function generateVariantMedia(blueprint: VariantBlueprint) {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create 2D rendering context.");
  }

  const stream = canvas.captureStream(TARGET_FPS);
  const audioContext = new AudioContext();
  await audioContext.resume();
  const audioDestination = audioContext.createMediaStreamDestination();

  const noiseBuffer = createNoiseBuffer(audioContext, blueprint.duration + 0.5, blueprint.audio);
  const noiseSource = audioContext.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const textureGain = audioContext.createGain();
  textureGain.gain.value = blueprint.audio.gain;

  const filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = blueprint.audio.filterHz;
  filter.Q.value = 0.8 + blueprint.audio.textureAmount;

  noiseSource.connect(filter).connect(textureGain).connect(audioDestination);
  noiseSource.start();

  const combinedStream = new MediaStream([
    ...stream.getVideoTracks(),
    ...audioDestination.stream.getAudioTracks(),
  ]);

  const mimeType = pickMimeType();
  if (!mimeType) {
    throw new Error("No compatible MediaRecorder codec found.");
  }

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 4_500_000,
    audioBitsPerSecond: 192_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const animation = animateVariant(context, blueprint);

  const stopPromise = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = (event) => reject(event.error);
  });

  recorder.start(250);
  animation.start();

  await wait(blueprint.duration * 1000);
  recorder.stop();
  animation.stop();

  await stopPromise;

  stream.getTracks().forEach((track) => track.stop());
  audioDestination.stream.getTracks().forEach((track) => track.stop());
  noiseSource.stop();
  await audioContext.close();

  const blob = new Blob(chunks, { type: mimeType });
  const url = URL.createObjectURL(blob);

  return {
    url,
    loopScore: estimateLoopSmoothness(blueprint),
    analysis: describeLoop(blueprint),
  };
}

function animateVariant(context: CanvasRenderingContext2D, blueprint: VariantBlueprint) {
  let frameRequest = 0;
  const startTime = performance.now();

  const render = (timestamp: number) => {
    const elapsed = (timestamp - startTime) / 1000;
    const progress = (elapsed % blueprint.duration) / blueprint.duration;
    drawFrame(context, blueprint, progress);
    frameRequest = requestAnimationFrame(render);
  };

  return {
    start() {
      drawFrame(context, blueprint, 0);
      frameRequest = requestAnimationFrame(render);
    },
    stop() {
      cancelAnimationFrame(frameRequest);
    },
  };
}

function drawFrame(
  context: CanvasRenderingContext2D,
  blueprint: VariantBlueprint,
  progress: number,
) {
  const { palette, motion, texture } = blueprint;
  const width = context.canvas.width;
  const height = context.canvas.height;

  context.clearRect(0, 0, width, height);

  const backgroundGradient = context.createLinearGradient(0, 0, 0, height);
  const topShift = clamp(progress * 0.35, 0, 0.35);
  backgroundGradient.addColorStop(0, adjustLuminance(palette.background, 0.12 * Math.sin(progress * 6.28)));
  backgroundGradient.addColorStop(0.5, palette.background);
  backgroundGradient.addColorStop(1, adjustLuminance(palette.background, -0.08 + topShift * 0.2));
  context.fillStyle = backgroundGradient;
  context.fillRect(0, 0, width, height);

  const centerX = width / 2;
  const baseRadius = Math.min(width, height) * (0.32 + motion.depthShift * 0.22);
  const loops = Math.max(3, motion.oscillators);

  for (let layer = 0; layer < loops; layer += 1) {
    const layerRatio = layer / (loops - 1 || 1);
    const layerPhase = progress * Math.PI * 2 * (1 + layer * 0.15);
    const wobble = 1 + 0.05 * Math.sin(layerPhase * motion.loopHarmony + layer);
    const radiusX = baseRadius * (1.1 - layerRatio * 0.35) * wobble;
    const radiusY = radiusX * (0.55 + 0.2 * Math.sin(layerPhase * 0.7));

    const offsetX =
      Math.sin(layerPhase) * width * 0.05 * (1 + layerRatio * 0.6) * motion.depthShift;
    const offsetY = Math.cos(layerPhase * 0.9) * height * 0.04 * (1 + layerRatio * 0.6);

    const gradient = context.createRadialGradient(
      centerX + offsetX,
      height * 0.55 + offsetY,
      radiusX * 0.1,
      centerX + offsetX,
      height * 0.55 + offsetY,
      radiusX * 1.4,
    );
    gradient.addColorStop(0, palette.highlight);
    gradient.addColorStop(0.5, palette.primary);
    gradient.addColorStop(1, palette.secondary);

    context.save();
    context.globalAlpha = 0.82 - layerRatio * 0.35 + 0.05 * Math.sin(layerPhase);
    context.translate(centerX + offsetX, height * 0.55 + offsetY);
    context.rotate(Math.sin(layerPhase * 0.5) * 0.3);
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  context.save();
  context.globalAlpha = 0.35 + motion.shimmer * 0.35;
  context.lineWidth = 4;
  for (let i = 0; i < 7; i += 1) {
    const offset = ((progress + i * 0.1) % 1) * height * 0.6;
    context.strokeStyle = adjustLuminance(
      palette.secondary,
      0.2 * Math.sin(progress * 12.56 + i * 1.3),
    );
    context.beginPath();
    context.moveTo(width * 0.18, height * 0.25 + offset);
    context.bezierCurveTo(
      width * 0.38,
      height * 0.23 + offset + Math.sin(progress * 18 + i) * 60,
      width * 0.62,
      height * 0.29 + offset - Math.sin(progress * 18 + i) * 60,
      width * 0.82,
      height * 0.25 + offset,
    );
    context.stroke();
  }
  context.restore();

  const speckles = Math.round(300 * texture.grain);
  context.save();
  context.globalAlpha = 0.04 + texture.grain * 0.08;
  for (let index = 0; index < speckles; index += 1) {
    const noise = fract(
      Math.sin(index * 91.23 + progress * texture.bubble * 120.712) * 43758.5453,
    );
    const x = noise * width;
    const y = fract(Math.cos(index * 41.9 + progress * texture.ripple * 220.19)) * height;
    const size = 1 + noise * 3;
    context.fillStyle = noise > 0.5 ? palette.highlight : palette.secondary;
    context.fillRect(x, y, size, size);
  }
  context.restore();

  context.save();
  context.globalAlpha = 0.25 + texture.bubble * 0.35;
  for (let bubble = 0; bubble < 20; bubble += 1) {
    const offsetPhase = bubble / 20;
    const bubbleAngle = (progress + offsetPhase) * Math.PI * 2;
    const x =
      centerX +
      Math.sin(bubbleAngle * (1.2 + texture.ripple)) * width * 0.08 * (1 + texture.ripple * 0.5);
    const y = height * (0.6 + Math.cos(bubbleAngle) * 0.18);
    const radius = baseRadius * 0.08 * (1 + Math.sin(bubbleAngle * 1.5 + bubble));
    const gradient = context.createRadialGradient(x, y, radius * 0.2, x, y, radius);
    gradient.addColorStop(0, adjustLuminance(palette.highlight, 0.15));
    gradient.addColorStop(1, adjustLuminance(palette.primary, -0.25));
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(x, y, radius * 2, radius, bubbleAngle, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function pickMimeType() {
  if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") {
    return null;
  }
  const preferences = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const mime of preferences) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return null;
}

function createNoiseBuffer(
  audioContext: AudioContext,
  duration: number,
  profile: VariantBlueprint["audio"],
) {
  const sampleRate = audioContext.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = audioContext.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  let pinkState = [0, 0, 0, 0, 0, 0, 0];
  let brown = 0;

  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    let sample = white;

    if (profile.noiseColor === "pink") {
      pinkState[0] = 0.99886 * pinkState[0] + white * 0.0555179;
      pinkState[1] = 0.99332 * pinkState[1] + white * 0.0750759;
      pinkState[2] = 0.96900 * pinkState[2] + white * 0.1538520;
      pinkState[3] = 0.86650 * pinkState[3] + white * 0.3104856;
      pinkState[4] = 0.55000 * pinkState[4] + white * 0.5329522;
      pinkState[5] = -0.7616 * pinkState[5] - white * 0.0168980;
      sample =
        pinkState[0] +
        pinkState[1] +
        pinkState[2] +
        pinkState[3] +
        pinkState[4] +
        pinkState[5] +
        pinkState[6] +
        white * 0.5362;
      pinkState[6] = white * 0.115926;
    } else if (profile.noiseColor === "brown") {
      brown = (brown + white * 0.02) / 1.02;
      sample = brown * 3.5;
    }

    const pulse =
      0.7 +
      profile.textureAmount *
        Math.sin((i / sampleRate) * Math.PI * 2 * (profile.pulseRate + 0.2));
    data[i] = clamp(sample * pulse, -1, 1);
  }

  return buffer;
}

async function simulateUpload(
  variant: GeneratedVariant,
  caption: CaptionPayload,
): Promise<UploadSummary> {
  await wait(1600);
  return {
    message: `Best loop “${variant.blueprint.title}” posted to YouTube Shorts.`,
    completedAt: new Date().toLocaleTimeString(),
  };
}

function wait(duration: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, duration));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function adjustLuminance(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 + amount;
  return rgbToHex(
    clamp(Math.round(r * factor), 0, 255),
    clamp(Math.round(g * factor), 0, 255),
    clamp(Math.round(b * factor), 0, 255),
  );
}

function hexToRgb(hex: string) {
  const stripped = hex.replace("#", "");
  const bigint = parseInt(stripped, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function fract(value: number) {
  return value - Math.floor(value);
}

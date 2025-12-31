'use client';

import { useEffect, useRef } from "react";
import type { VariantBlueprint } from "@/lib/types";

export interface VariantCardProps {
  variant: VariantBlueprint;
  mediaUrl?: string;
  loopScore: number;
  status: "pending" | "rendering" | "ready" | "failed";
  isWinner: boolean;
  onDownload?: () => void;
}

export function VariantCard({
  variant,
  mediaUrl,
  loopScore,
  status,
  isWinner,
}: VariantCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoRef.current || !mediaUrl) return;
    const video = videoRef.current;
    const handleLoaded = () => {
      void video.play().catch(() => {
        /* autoplay might be blocked; rely on user interaction */
      });
    };
    video.addEventListener("loadeddata", handleLoaded);
    return () => {
      video.removeEventListener("loadeddata", handleLoaded);
    };
  }, [mediaUrl]);

  return (
    <article className={`variant-card ${isWinner ? "variant-card--winner" : ""}`}>
      <header className="variant-card__header">
        <div>
          <h3>{variant.title}</h3>
          <p>{variant.notes}</p>
        </div>
        <span className="variant-card__score" aria-label="Loop score">
          {(loopScore * 100).toFixed(0)}%
        </span>
      </header>

      <div className="variant-card__media">
        {mediaUrl ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            width={270}
            height={480}
            loop
            muted
            playsInline
            preload="auto"
            poster="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="
          />
        ) : (
          <div className="variant-card__placeholder">
            <span>{status === "rendering" ? "Rendering…" : "Waiting…"}</span>
          </div>
        )}
      </div>

      <dl className="variant-card__meta">
        <div>
          <dt>Duration</dt>
          <dd>{variant.duration.toFixed(1)} s</dd>
        </div>
        <div>
          <dt>Colorway</dt>
          <dd>
            <span
              className="variant-card__swatch"
              style={{ backgroundColor: variant.palette.primary }}
            />
            <span
              className="variant-card__swatch"
              style={{ backgroundColor: variant.palette.secondary }}
            />
            <span
              className="variant-card__swatch"
              style={{ backgroundColor: variant.palette.highlight }}
            />
          </dd>
        </div>
        <div>
          <dt>Loop harmony</dt>
          <dd>{variant.motion.loopHarmony.toFixed(2)}</dd>
        </div>
      </dl>

      <footer className="variant-card__footer">
        <span>{status === "ready" ? (isWinner ? "Selected for upload" : "Generated") : status}</span>
        {isWinner ? <span className="variant-card__badge">Best loop</span> : null}
      </footer>
    </article>
  );
}

export default VariantCard;


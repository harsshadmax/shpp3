"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QrCode({ value, size = 220 }: { value: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, value, {
      width: size,
      margin: 1,
      color: { dark: "#0E1B2A", light: "#FFFFFF" },
    }).catch(() => {});
  }, [value, size]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      className="border border-[var(--border)] rounded-[6px] bg-white"
    />
  );
}

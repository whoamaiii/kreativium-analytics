import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface WebcamPreviewProps {
  active: boolean;
  mirrored?: boolean;
  className?: string;
  onError?: (error: Error) => void;
}

export const WebcamPreview = ({
  active,
  mirrored = true,
  className,
  onError,
}: WebcamPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        if (!active || !videoRef.current) return;
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera is not supported in this browser.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      } catch (e) {
        if (onError) onError(e as Error);
      }
    }
    if (active) start();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch {
          // no-op
        }
        videoRef.current.srcObject = null;
      }
    };
  }, [active, onError]);

  return (
    <div
      className={cn('relative overflow-hidden rounded-xl border border-border bg-muted', className)}
      data-state={active ? 'active' : 'inactive'}
    >
      <video
        ref={videoRef}
        className={cn('w-full h-64 object-cover', mirrored && 'scale-x-[-1]')}
        autoPlay
        playsInline
        muted
        aria-label="Webcam preview"
      />
    </div>
  );
};

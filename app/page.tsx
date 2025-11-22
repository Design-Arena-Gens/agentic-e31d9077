'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { EarthCanvas, EarthCanvasHandle } from '@/components/EarthCanvas';

const DEFAULT_RECORDING_DURATION = 12000;

export default function HomePage() {
  const earthRef = useRef<EarthCanvasHandle>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Idle');
  const [error, setError] = useState<string | null>(null);

  const durationSeconds = useMemo(() => DEFAULT_RECORDING_DURATION / 1000, []);

  const cleanupPreviousVideo = useCallback(() => {
    setError(null);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(null);
  }, [videoUrl]);

  const handleRecord = useCallback(async () => {
    cleanupPreviousVideo();
    if (!earthRef.current) {
      setError('Orbital renderer not ready yet. Please try again.');
      return;
    }
    try {
      setIsRecording(true);
      setStatus('Capturing orbital sequence…');
      const blob = await earthRef.current.startRecording(DEFAULT_RECORDING_DURATION);
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setStatus('Capture complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture video.');
      setStatus('Capture failed');
    } finally {
      setIsRecording(false);
    }
  }, [cleanupPreviousVideo]);

  const handleStop = useCallback(() => {
    setStatus('Stopping capture…');
    earthRef.current?.stopRecording();
    setTimeout(() => {
      setIsRecording(false);
      setStatus('Capture interrupted');
    }, 350);
  }, []);

  const handleDownload = useCallback(() => {
    if (!videoUrl) return;
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `india-from-space-${Date.now()}.webm`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [videoUrl]);

  return (
    <main className="page">
      <div className="stars" />
      <section className="panel">
        <header className="panel-header">
          <span className={`status-pill ${error ? 'error' : ''}`}>
            {error ? 'Error' : isRecording ? 'Recording' : status}
          </span>
          <h1>India From Space — Orbital Video Generator</h1>
          <p>
            Render a cinematic orbital view of India directly in your browser. Initiate a{' '}
            {durationSeconds}-second capture of the live animation, then preview or download the
            resulting video instantly.
          </p>
        </header>

        <div className="canvas-wrapper">
          <EarthCanvas ref={earthRef} />
        </div>

        <div className="controls">
          <button
            type="button"
            className="primary-button"
            disabled={isRecording}
            onClick={handleRecord}
          >
            🚀 Generate {durationSeconds}s Orbit Video
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={!isRecording}
            onClick={handleStop}
          >
            ✋ Stop Early
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={!videoUrl}
            onClick={handleDownload}
          >
            ⬇️ Download Video
          </button>
        </div>

        {error && <div className="status-pill error">{error}</div>}

        {videoUrl && (
          <video className="video-preview" controls src={videoUrl} playsInline loop />
        )}

        <footer className="footer">
          <div>
            Crafted with a procedural renderer, orbital lighting, and real-time recording via the
            Canvas MediaStream API.
          </div>
          <div>
            <strong>Tip:</strong> Try multiple captures — each includes unique starfield motion.
          </div>
        </footer>
      </section>
    </main>
  );
}

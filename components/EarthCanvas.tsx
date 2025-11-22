'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export interface EarthCanvasHandle {
  startRecording: (durationMs?: number) => Promise<Blob>;
  stopRecording: () => void;
}

interface RecordingState {
  recorder: MediaRecorder | null;
  chunks: Blob[];
  timeoutId?: ReturnType<typeof setTimeout>;
}

const INDIA_BOUNDARY: Array<[number, number]> = [
  [68.176645, 37.020841],
  [70.470458, 37.521124],
  [72.630533, 36.720007],
  [74.575892, 37.065645],
  [75.158028, 36.667701],
  [74.451559, 35.940679],
  [74.104294, 34.748886],
  [75.027263, 34.419988],
  [77.837451, 35.49401],
  [79.721367, 34.169305],
  [82.191242, 34.542283],
  [83.935126, 34.124744],
  [84.675018, 32.7649],
  [85.72819, 31.675308],
  [87.000054, 30.5335],
  [88.060238, 30.107965],
  [88.174804, 28.839891],
  [88.043133, 27.445819],
  [88.814248, 27.299316],
  [88.730326, 26.719403],
  [88.120441, 26.446526],
  [87.227472, 26.397898],
  [85.251779, 26.350462],
  [83.898993, 26.229957],
  [81.999987, 25.935415],
  [80.476721, 25.197201],
  [80.568447, 24.776862],
  [81.787959, 24.719971],
  [83.335308, 24.267994],
  [85.060266, 23.979958],
  [86.499351, 24.269604],
  [87.403682, 24.43802],
  [88.374714, 24.864334],
  [88.595703, 24.335083],
  [88.084422, 23.710399],
  [88.69994, 22.988188],
  [89.031961, 22.055708],
  [88.888766, 21.690588],
  [87.632484, 21.598778],
  [87.500001, 21.142395],
  [86.499351, 20.742784],
  [85.060266, 19.478579],
  [83.941006, 18.302009],
  [83.189218, 17.671221],
  [82.192792, 17.016636],
  [82.190689, 16.556664],
  [81.692719, 16.310217],
  [80.791999, 15.951972],
  [80.324896, 15.899185],
  [80.025069, 15.136415],
  [80.233274, 13.835771],
  [80.286294, 13.006261],
  [79.862547, 12.056215],
  [79.857999, 10.357275],
  [79.340512, 10.308854],
  [78.885345, 9.546136],
  [79.18972, 9.216544],
  [78.277941, 8.933047],
  [77.941165, 8.252959],
  [77.539898, 7.965535],
  [76.592979, 8.899276],
  [76.130061, 10.29963],
  [75.746467, 11.308251],
  [75.396101, 11.781245],
  [74.864816, 12.741936],
  [74.616717, 13.992583],
  [74.443859, 14.617222],
  [73.534199, 15.990652],
  [73.119909, 17.090849],
  [72.820909, 18.197701],
  [72.530117, 19.159559],
  [72.824475, 20.419503],
  [72.630533, 21.356009],
  [71.175273, 20.757441],
  [70.470459, 20.877331],
  [69.16413, 22.089298],
  [69.644928, 22.450775],
  [69.349596, 23.122055],
  [70.096054, 23.886979],
  [70.793294, 24.356524],
  [71.121878, 25.030594],
  [70.794768, 25.215102],
  [70.158203, 26.94124],
  [69.514393, 26.940966],
  [70.616496, 27.989196],
  [71.777666, 27.91318],
  [72.823752, 28.961592],
  [74.42138, 29.977426],
  [74.451559, 30.979815],
  [75.75706, 31.785998],
  [76.871722, 32.856015],
  [77.837451, 33.441473],
  [78.912269, 34.321937],
  [78.811086, 34.559989],
  [78.337071, 34.685651]
];

const STARFIELD_COUNT = 120;

interface Star {
  x: number;
  y: number;
  brightness: number;
  radius: number;
}

const generateStarfield = (width: number, height: number): Star[] => {
  const stars: Star[] = [];
  for (let i = 0; i < STARFIELD_COUNT; i += 1) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      brightness: 0.55 + Math.random() * 0.45,
      radius: 0.4 + Math.random() * 1.4
    });
  }
  return stars;
};

const degToRad = (deg: number) => (deg * Math.PI) / 180;

const projectPoint = (lon: number, lat: number, rotation: number, radius: number) => {
  const lonRad = degToRad(lon);
  const latRad = degToRad(lat);

  const cosLat = Math.cos(latRad);
  const sinLat = Math.sin(latRad);
  const cosLon = Math.cos(lonRad + rotation);
  const sinLon = Math.sin(lonRad + rotation);

  const x = cosLat * sinLon;
  const y = sinLat;
  const z = cosLat * cosLon;

  const cameraDistance = 2.8;
  const scale = radius * 1.1;
  const perspective = scale / (cameraDistance - z);

  const screenX = x * perspective;
  const screenY = -y * perspective;

  return { x: screenX, y: screenY, visible: z > 0 };
};

const drawIndiaHighlight = (
  ctx: CanvasRenderingContext2D,
  rotation: number,
  radius: number,
  centerX: number,
  centerY: number
) => {
  const projected = INDIA_BOUNDARY.map(([lon, lat]) => projectPoint(lon, lat, rotation, radius));
  const visiblePoints = projected.filter((point) => point.visible);
  if (visiblePoints.length < projected.length * 0.35) {
    return;
  }

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.beginPath();
  visiblePoints.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(30, 220, 255, 0.16)';
  ctx.fill();
  ctx.lineWidth = radius * 0.01;
  const gradient = ctx.createLinearGradient(-radius, -radius, radius, radius);
  gradient.addColorStop(0, 'rgba(131, 255, 240, 0.8)');
  gradient.addColorStop(1, 'rgba(0, 116, 255, 0.6)');
  ctx.strokeStyle = gradient;
  ctx.stroke();
  ctx.restore();
};

const drawAtmosphere = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number
) => {
  const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.9, centerX, centerY, radius * 1.3);
  gradient.addColorStop(0, 'rgba(0, 180, 255, 0.0)');
  gradient.addColorStop(0.8, 'rgba(0, 200, 255, 0.08)');
  gradient.addColorStop(1, 'rgba(89, 214, 255, 0.22)');
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 1.25, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
};

const drawEarth = (
  ctx: CanvasRenderingContext2D,
  rotation: number,
  elapsed: number,
  width: number,
  height: number,
  starfield: Star[]
) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.42;

  ctx.clearRect(0, 0, width, height);

  const backgroundGradient = ctx.createLinearGradient(0, 0, width, height);
  backgroundGradient.addColorStop(0, '#020611');
  backgroundGradient.addColorStop(1, '#031523');
  ctx.fillStyle = backgroundGradient;
  ctx.fillRect(0, 0, width, height);

  const starSeed = ((elapsed / 1000) % 40) / 40;
  ctx.save();
  ctx.translate(width * -starSeed * 0.2, height * starSeed * 0.3);
  starfield.forEach((star) => {
    ctx.beginPath();
    ctx.globalAlpha = star.brightness;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  ctx.globalAlpha = 1;

  drawAtmosphere(ctx, centerX, centerY, radius);

  const earthGradient = ctx.createRadialGradient(
    centerX - radius * 0.2,
    centerY - radius * 0.2,
    radius * 0.2,
    centerX,
    centerY,
    radius * 1.1
  );
  earthGradient.addColorStop(0, '#3bc4ff');
  earthGradient.addColorStop(0.4, '#0b6894');
  earthGradient.addColorStop(0.75, '#052742');
  earthGradient.addColorStop(1, '#020f1d');

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = earthGradient;
  ctx.fill();

  const latGridCount = 6;
  const lonGridCount = 12;
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.strokeStyle = 'rgba(89, 214, 255, 0.12)';
  ctx.lineWidth = radius * 0.004;

  for (let i = 1; i < latGridCount; i += 1) {
    const lat = ((i / latGridCount) * Math.PI) / 2;
    const sinLat = Math.sin(lat);
    const r = Math.sqrt(1 - sinLat * sinLat) * radius;
    const offsetY = sinLat * radius;
    ctx.beginPath();
    ctx.ellipse(0, offsetY, r, radius * 0.03, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -offsetY, r, radius * 0.03, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let j = 0; j < lonGridCount; j += 1) {
    const lon = (j / lonGridCount) * Math.PI * 2;
    const cosLon = Math.cos(lon + rotation);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(lon + rotation) * radius, 0);
    ctx.strokeStyle = `rgba(89, 214, 255, ${0.08 + Math.max(0, cosLon) * 0.18})`;
    ctx.stroke();
  }

  ctx.restore();

  drawIndiaHighlight(ctx, rotation, radius, centerX, centerY);

  const terminatorAngle = rotation + elapsed * 0.00015;
  const terminatorGradient = ctx.createLinearGradient(
    centerX + Math.cos(terminatorAngle) * radius,
    centerY + Math.sin(terminatorAngle) * radius,
    centerX - Math.cos(terminatorAngle) * radius,
    centerY - Math.sin(terminatorAngle) * radius
  );
  terminatorGradient.addColorStop(0, 'rgba(0, 0, 0, 0.05)');
  terminatorGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.15)');
  terminatorGradient.addColorStop(1, 'rgba(0, 0, 0, 0.75)');

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = terminatorGradient;
  ctx.fill();

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation * 1.15);
  ctx.globalAlpha = 0.09;
  for (let i = 0; i < 6; i += 1) {
    const orbitRadius = radius * (1.1 + i * 0.12);
    ctx.beginPath();
    ctx.arc(0, 0, orbitRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(89, 214, 255, ${0.3 - i * 0.04})`;
    ctx.lineWidth = radius * 0.0025;
    ctx.stroke();
  }
  ctx.restore();
};

export const EarthCanvas = forwardRef<EarthCanvasHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>();
  const resizeObserverRef = useRef<ResizeObserver>();
  const recordingRef = useRef<RecordingState>({ recorder: null, chunks: [] });
  const starfieldRef = useRef<Star[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return undefined;
    }

    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    starfieldRef.current = generateStarfield(width * 1.5, height * 1.5);

    const handleResize = (entries: ResizeObserverEntry[]) => {
      const entry = entries[0];
      const cr = entry.contentRect;
      width = cr.width;
      height = cr.height;
      const devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(devicePixelRatio, devicePixelRatio);
      starfieldRef.current = generateStarfield(width * 1.5, height * 1.5);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);
    resizeObserverRef.current = resizeObserver;

    let startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const rotation = (elapsed / 18000) * Math.PI * 2 * 0.6;
      drawEarth(ctx, rotation, elapsed, width, height, starfieldRef.current);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      resizeObserver.disconnect();
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      startRecording(durationMs = 12000) {
        const canvas = canvasRef.current;
        if (!canvas) {
          return Promise.reject(new Error('Canvas unavailable for recording.'));
        }
        if (!canvas.captureStream) {
          return Promise.reject(new Error('Canvas captureStream API is not supported in this browser.'));
        }
        const currentState = recordingRef.current;
        if (currentState.recorder) {
          return Promise.reject(new Error('Recording already in progress.'));
        }

        const stream = canvas.captureStream(60);
        const mimeType =
          MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
            ? 'video/webm; codecs=vp9'
            : MediaRecorder.isTypeSupported('video/webm; codecs=vp8')
              ? 'video/webm; codecs=vp8'
              : 'video/webm';

        try {
          const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
          const chunks: Blob[] = [];

          return new Promise<Blob>((resolve, reject) => {
            recorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                chunks.push(event.data);
              }
            };
            recorder.onerror = (event) => {
              const errorMessage =
                (event as Event & { error?: DOMException }).error?.message ?? 'Unknown error.';
              reject(new Error(`Recording error: ${errorMessage}`));
            };
            recorder.onstop = () => {
              const blob = new Blob(chunks, { type: mimeType });
              resolve(blob);
              recordingRef.current = { recorder: null, chunks: [] };
            };

            recorder.start();

            const timeoutId = setTimeout(() => {
              recorder.stop();
            }, durationMs);

            recordingRef.current = { recorder, chunks, timeoutId };
          });
        } catch (error) {
          return Promise.reject(
            error instanceof Error ? error : new Error('Failed to initialize MediaRecorder.')
          );
        }
      },
      stopRecording() {
        const state = recordingRef.current;
        if (!state.recorder) {
          return;
        }
        if (state.timeoutId) {
          clearTimeout(state.timeoutId);
        }
        if (state.recorder.state === 'recording') {
          state.recorder.stop();
        }
        recordingRef.current = { recorder: null, chunks: [] };
      }
    }),
    []
  );

  return <canvas ref={canvasRef} className="canvas" />;
});

EarthCanvas.displayName = 'EarthCanvas';

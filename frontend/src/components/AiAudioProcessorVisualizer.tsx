import React, { useEffect, useRef, useState } from 'react';
import {
  Volume2,
  Users,
  Keyboard,
  Radio,
  Wind,
  Sparkles,
  Shield,
  Cpu,
  Mic,
  Activity,
} from 'lucide-react';

interface NoiseSource {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  activeColor: string;
  dotColor: string;
  rgb: string;
  freq: number;
  amp: number;
  noiseLevel: number;
  active: boolean;
}

export default function AiAudioProcessorVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Noise sources configuration matching Image 1
  const [sources, setSources] = useState<NoiseSource[]>([
    {
      id: 'bg-noise',
      name: 'Background Noise',
      icon: Activity,
      color: 'text-red-500 bg-red-50 border-red-200/80',
      activeColor: 'bg-red-500',
      dotColor: 'bg-red-500',
      rgb: '239, 68, 68',
      freq: 0.045,
      amp: 24,
      noiseLevel: 1.2,
      active: true,
    },
    {
      id: 'other-voices',
      name: 'Other Voices',
      icon: Users,
      color: 'text-amber-500 bg-amber-50 border-amber-200/80',
      activeColor: 'bg-amber-500',
      dotColor: 'bg-amber-500',
      rgb: '245, 158, 11',
      freq: 0.038,
      amp: 20,
      noiseLevel: 1.0,
      active: true,
    },
    {
      id: 'typing',
      name: 'Typing Sounds',
      icon: Keyboard,
      color: 'text-blue-500 bg-blue-50 border-blue-200/80',
      activeColor: 'bg-blue-500',
      dotColor: 'bg-blue-500',
      rgb: '59, 130, 246',
      freq: 0.065,
      amp: 22,
      noiseLevel: 1.5,
      active: true,
    },
    {
      id: 'echo',
      name: 'Room Echo',
      icon: Radio,
      color: 'text-purple-500 bg-purple-50 border-purple-200/80',
      activeColor: 'bg-purple-500',
      dotColor: 'bg-purple-500',
      rgb: '147, 51, 234',
      freq: 0.032,
      amp: 18,
      noiseLevel: 0.8,
      active: true,
    },
    {
      id: 'env',
      name: 'Environment',
      icon: Wind,
      color: 'text-emerald-500 bg-emerald-50 border-emerald-200/80',
      activeColor: 'bg-emerald-500',
      dotColor: 'bg-emerald-500',
      rgb: '16, 185, 129',
      freq: 0.05,
      amp: 16,
      noiseLevel: 0.9,
      active: true,
    },
  ]);

  const toggleSource = (id: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  };

  // Canvas animation logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0;

    // Particles system for floating absorption noise
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      radius: number;
      alpha: number;
      sourceIdx: number;
    }

    const particles: Particle[] = [];
    const maxParticles = 45;

    // Handle high DPI display
    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Main render loop
    const render = () => {
      t += 0.025;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      // Central Mic Intake point coordinates
      const micX = width * 0.5;
      const micY = height * 0.5;

      // =========================================================================
      // 1. LEFT NOISY WAVEFORMS FLOWING TOWARDS CENTRAL MIC
      // =========================================================================
      const leftStartX = 175; // past the left badges on desktop, or scaled
      const leftMargin = Math.min(leftStartX, width * 0.22);
      const intakeX = micX - 42; // entrance into mic capsule

      sources.forEach((src, idx) => {
        if (!src.active) return;

        // Spread start Y positions evenly across vertical space
        const totalSources = sources.length;
        const spacing = (height * 0.72) / (totalSources - 1);
        const startY = height * 0.14 + idx * spacing;

        ctx.save();
        ctx.beginPath();

        const steps = 70;
        const dx = (intakeX - leftMargin) / steps;

        for (let i = 0; i <= steps; i++) {
          const currentX = leftMargin + i * dx;
          const progress = i / steps; // 0 at badge, 1 at mic

          // Baseline interpolation curve towards mic center
          // Uses cubic easing for natural converge
          const easeProgress = progress * progress * (3 - 2 * progress);
          const baseY = startY + (micY - startY) * easeProgress;

          // As progress -> 1, amplitude dampens to 0
          const dampen = Math.pow(1 - progress, 1.4);

          // Complex noisy jitter: multi-sine + pseudo-random jitter
          const harmonic1 = Math.sin(currentX * src.freq + t * 4 + idx) * src.amp;
          const harmonic2 = Math.cos(currentX * (src.freq * 2.3) - t * 2.5) * (src.amp * 0.45);
          const jitter = (Math.sin(currentX * 0.25 + t * 9) * 4.5 + Math.cos(currentX * 0.5 - t * 12) * 3) * src.noiseLevel;

          const totalOffset = (harmonic1 + harmonic2 + jitter) * dampen;
          const currentY = baseY + totalOffset;

          if (i === 0) {
            ctx.moveTo(currentX, currentY);
          } else {
            ctx.lineTo(currentX, currentY);
          }
        }

        // Glowing stroke for each waveform
        ctx.strokeStyle = `rgba(${src.rgb}, 0.85)`;
        ctx.lineWidth = 2.2;
        ctx.shadowColor = `rgba(${src.rgb}, 0.6)`;
        ctx.shadowBlur = 8;
        ctx.stroke();

        // Secondary subtle glow halo line
        ctx.strokeStyle = `rgba(${src.rgb}, 0.25)`;
        ctx.lineWidth = 4.5;
        ctx.shadowBlur = 0;
        ctx.stroke();

        ctx.restore();

        // Spawn noise particles along this line that flow towards mic
        if (Math.random() < 0.28 && particles.length < maxParticles) {
          const spawnProgress = Math.random() * 0.75;
          const px = leftMargin + spawnProgress * (intakeX - leftMargin);
          const py = startY + (micY - startY) * spawnProgress + (Math.random() - 0.5) * 16;
          particles.push({
            x: px,
            y: py,
            vx: 1.2 + Math.random() * 1.5,
            vy: (micY - py) * 0.015 + (Math.random() - 0.5) * 0.5,
            color: `rgba(${src.rgb},`,
            radius: 1.5 + Math.random() * 1.8,
            alpha: 0.8,
            sourceIdx: idx,
          });
        }
      });

      // =========================================================================
      // 2. PARTICLES ABSORPTION ANIMATION
      // =========================================================================
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Gravitational acceleration towards mic
        const toMicX = intakeX - p.x;
        const toMicY = micY - p.y;
        const dist = Math.sqrt(toMicX * toMicX + toMicY * toMicY);

        if (dist < 40 || p.x >= intakeX) {
          // Absorbed by mic
          particles.splice(i, 1);
          continue;
        }

        p.alpha -= 0.005;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color} ${p.alpha})`;
        ctx.shadowColor = `${p.color} 0.8)`;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();
      }

      // =========================================================================
      // 3. RIGHT OUTPUT: ONE PRISTINE, HARMONIC CLEAN SINE WAVEFORM
      // =========================================================================
      const outputStartX = micX + 44;
      const rightMargin = width - 150; // before the 'Your Clean Voice' badge

      if (outputStartX < rightMargin) {
        ctx.save();

        // 3a. Flowing Translucent Gradient Ribbon/Fill
        const ribbonSteps = 80;
        const rdx = (rightMargin - outputStartX) / ribbonSteps;

        // Create elegant gradient across right wave
        const waveGradient = ctx.createLinearGradient(outputStartX, 0, rightMargin, 0);
        waveGradient.addColorStop(0, '#8c52ff');
        waveGradient.addColorStop(0.5, '#6347e3');
        waveGradient.addColorStop(1, '#4f46e5');

        // Draw multiple harmonic wave ribbons for rich modern SaaS look
        const layers = [
          { speed: 3.2, freq: 0.022, amp: 26, phase: 0, opacity: 0.95, width: 3.5, glow: 14 },
          { speed: 2.8, freq: 0.020, amp: 20, phase: 0.5, opacity: 0.45, width: 2.0, glow: 6 },
          { speed: 3.5, freq: 0.024, amp: 14, phase: 1.2, opacity: 0.3, width: 1.5, glow: 4 },
        ];

        layers.forEach((layer) => {
          ctx.beginPath();
          for (let i = 0; i <= ribbonSteps; i++) {
            const cx = outputStartX + i * rdx;
            const progress = i / ribbonSteps;

            // Smooth entrance envelope from mic exit
            const envelope = Math.min(1, progress * 4) * Math.min(1, (1 - progress) * 4);

            // Pure harmonic sine motion
            const sine1 = Math.sin(cx * layer.freq - t * layer.speed + layer.phase) * layer.amp;
            const sine2 = Math.cos(cx * (layer.freq * 0.5) - t * 1.5) * (layer.amp * 0.25);
            const cy = micY + (sine1 + sine2) * envelope;

            if (i === 0) {
              ctx.moveTo(cx, cy);
            } else {
              ctx.lineTo(cx, cy);
            }
          }

          ctx.strokeStyle = waveGradient;
          ctx.lineWidth = layer.width;
          ctx.shadowColor = 'rgba(140, 82, 255, 0.7)';
          ctx.shadowBlur = layer.glow;
          ctx.stroke();
        });

        // Translucent glow under-fill
        ctx.beginPath();
        for (let i = 0; i <= ribbonSteps; i++) {
          const cx = outputStartX + i * rdx;
          const progress = i / ribbonSteps;
          const envelope = Math.min(1, progress * 4) * Math.min(1, (1 - progress) * 4);
          const sine = Math.sin(cx * 0.022 - t * 3.2) * 26 * envelope;
          const cy = micY + sine;
          if (i === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        }
        for (let i = ribbonSteps; i >= 0; i--) {
          const cx = outputStartX + i * rdx;
          const cy = micY;
          ctx.lineTo(cx, cy);
        }
        ctx.closePath();
        const fillGrad = ctx.createLinearGradient(0, micY - 30, 0, micY + 30);
        fillGrad.addColorStop(0, 'rgba(140, 82, 255, 0.12)');
        fillGrad.addColorStop(1, 'rgba(99, 71, 227, 0.01)');
        ctx.fillStyle = fillGrad;
        ctx.shadowBlur = 0;
        ctx.fill();

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [sources]);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-3xl bg-gradient-to-b from-[#fbfaff] via-[#f7f5fd] to-[#f4f1fa] border border-white/90 shadow-[0_20px_50px_rgba(99,71,227,0.08)] p-4 sm:p-6 md:p-8 overflow-hidden backdrop-blur-xl"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[340px] bg-gradient-to-tr from-[#6347e3]/12 via-[#8c52ff]/10 to-[#3b82f6]/8 rounded-full blur-3xl pointer-events-none" />

      {/* Main Interactive Stage */}
      <div className="relative min-h-[380px] sm:min-h-[420px] flex items-center justify-between">
        {/* =========================================================================
            LEFT COLUMN: INTERACTIVE NOISE BADGES
           ========================================================================= */}
        <div className="relative z-20 flex flex-col justify-between h-[340px] sm:h-[360px] py-2 w-44 sm:w-48 pointer-events-auto">
          {sources.map((src) => {
            const Icon = src.icon;
            return (
              <button
                key={src.id}
                onClick={() => toggleSource(src.id)}
                className={`group flex items-center justify-between px-3 py-1.5 sm:py-2 rounded-full border text-xs font-semibold shadow-xs transition-all duration-200 backdrop-blur-md ${
                  src.active
                    ? `${src.color} shadow-sm translate-x-1`
                    : 'bg-gray-100/80 text-gray-400 border-gray-200 line-through opacity-60 hover:opacity-90'
                }`}
                title={`Click to ${src.active ? 'Mute' : 'Enable'} ${src.name}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="truncate">{src.name}</span>
                </div>
                <span
                  className={`w-2 h-2 rounded-full ${
                    src.active ? `${src.dotColor} animate-pulse` : 'bg-gray-300'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* =========================================================================
            FULL CANVAS FOR WAVEFORMS & ABSORPTION PARTICLES
           ========================================================================= */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* =========================================================================
            CENTERPIECE: FUTURISTIC FLOATING AI MICROPHONE CAPSULE
           ========================================================================= */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center pointer-events-auto select-none">
          {/* Subtle levitation wrapper */}
          <div className="relative group cursor-pointer animate-[bounce_4s_ease-in-out_infinite]">
            {/* Concentric ambient ripple rings */}
            <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-[#6347e3]/20 to-[#8c52ff]/20 blur-xl animate-pulse pointer-events-none" />
            <div className="absolute -inset-10 rounded-full border border-[#8c52ff]/25 animate-[ping_3.5s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" />
            <div className="absolute -inset-14 rounded-full border border-[#6347e3]/15 animate-[ping_4.5s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" />

            {/* Microphone Capsule Body */}
            <div className="relative w-16 h-24 sm:w-20 sm:h-28 rounded-full bg-gradient-to-b from-[#1E2337] via-[#161928] to-[#0D101D] border-2 border-[#8c52ff]/60 shadow-[0_12px_32px_rgba(99,71,227,0.45)] flex flex-col items-center justify-between p-3.5 overflow-hidden transition-transform group-hover:scale-105 duration-300">
              {/* Glass specular glossy highlight reflection */}
              <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-white/35 to-transparent rounded-t-full pointer-events-none" />

              {/* Top Mic Grill Head */}
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-gray-800 to-gray-900 border border-purple-400/30 flex items-center justify-center relative shadow-inner">
                {/* Pulsing Core LED */}
                <div className="w-3.5 h-3.5 rounded-full bg-[#8c52ff] shadow-[0_0_12px_#8c52ff] animate-ping" />
                <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-white absolute z-10" />
              </div>

              {/* Glowing Energy Aperture / Rotating Ring */}
              <div className="w-full my-auto flex items-center justify-center">
                <div className="w-full h-1.5 rounded-full bg-gradient-to-r from-transparent via-[#8c52ff] to-transparent shadow-[0_0_10px_#8c52ff] animate-pulse" />
              </div>

              {/* Bottom Acoustic Base */}
              <div className="w-7 h-2 rounded-full bg-white/10" />
            </div>
          </div>

          {/* AI Noise Filtering Label & Sequential LED Array */}
          <div className="mt-4 flex flex-col items-center gap-1.5">
            <span className="text-[11px] sm:text-xs font-bold text-gray-700 tracking-wide uppercase">
              AI Noise Filtering
            </span>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((dot) => (
                <span
                  key={dot}
                  className="w-1.5 h-3 rounded-full bg-[#8c52ff] transition-all"
                  style={{
                    animation: `pulse 1.2s ease-in-out infinite ${dot * 0.14}s`,
                    opacity: 0.35 + (dot % 3) * 0.3,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: "YOUR CLEAN VOICE" BADGE
           ========================================================================= */}
        <div className="relative z-20 flex flex-col justify-center items-end w-44 sm:w-52 pointer-events-auto">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white/95 border border-[#8c52ff]/40 shadow-lg shadow-[#6347e3]/10 backdrop-blur-md">
            <div className="flex items-center gap-1 text-[#6347e3]">
              <span className="w-1 h-3 rounded-full bg-[#6347e3] animate-pulse" />
              <span className="w-1 h-4 rounded-full bg-[#8c52ff] animate-pulse" style={{ animationDelay: '0.15s' }} />
              <span className="w-1 h-5 rounded-full bg-[#6347e3] animate-pulse" style={{ animationDelay: '0.3s' }} />
              <span className="w-1 h-3 rounded-full bg-[#8c52ff] animate-pulse" style={{ animationDelay: '0.45s' }} />
            </div>
            <span className="text-xs sm:text-sm font-bold text-gray-900 whitespace-nowrap">
              Your Clean Voice
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#6347e3] animate-ping" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM FEATURE HIGHLIGHT CARDS (Matching Image 1)
         ========================================================================= */}
      <div className="mt-6 pt-6 border-t border-gray-200/70 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Highlight 1: Real-time AI Filtering */}
        <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/70 border border-gray-200/80 shadow-xs">
          <div className="w-11 h-11 rounded-2xl bg-[#f2eefd] text-[#6347e3] flex items-center justify-center shrink-0 shadow-xs">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
              Real-time AI Filtering
            </h4>
            <p className="text-[11px] sm:text-xs text-gray-500">
              Removes background noise
            </p>
          </div>
        </div>

        {/* Highlight 2: Crystal Clear Voice */}
        <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/70 border border-gray-200/80 shadow-xs">
          <div className="w-11 h-11 rounded-2xl bg-[#eef4fd] text-[#3b82f6] flex items-center justify-center shrink-0 shadow-xs">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
              Crystal Clear Voice
            </h4>
            <p className="text-[11px] sm:text-xs text-gray-500">
              Interview ready audio
            </p>
          </div>
        </div>

        {/* Highlight 3: Works in Any Environment */}
        <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/70 border border-gray-200/80 shadow-xs">
          <div className="w-11 h-11 rounded-2xl bg-[#f0fbf5] text-[#10b981] flex items-center justify-center shrink-0 shadow-xs">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
              Works in Any Environment
            </h4>
            <p className="text-[11px] sm:text-xs text-gray-500">
              Home, office, or anywhere
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Next, React
import { FC, useState } from "react";
import pkg from "../../../package.json";

import { useRef, useEffect } from "react";

export const HomeView: FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white items-center w-full">
      <main className="flex flex-1 items-stretch px-0 w-full max-w-[550px] mx-auto min-h-full">
        <div className="relative flex w-full flex-col overflow-hidden min-h-full">
          <div className="flex-1 w-full min-h-[95vh]">
            <GameSandbox />
          </div>
        </div>
      </main>
    </div>
  );
};

const GameSandbox: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<"START" | "PLAYING" | "GAMEOVER">("START");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<number[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [ballSkin, setBallSkin] = useState<"classic" | "gold" | "neon" | "fire">("classic");

  // Mutable Game State (Refs for loop)
  const stateRef = useRef({
    score: 0,
    highScore: 0,
    scale: 1,
    gameState: "START" as "START" | "PLAYING" | "GAMEOVER",
    audioCtx: null as AudioContext | null,

    player: {
      x: 0,
      y: 0,
      legLength: 200,
      footRadius: 16,
      left: { x: 0, y: 0, vx: 0, vy: 0, lastX: 0, lastY: 0 },
      right: { x: 0, y: 0, vx: 0, vy: 0, lastX: 0, lastY: 0 },
    },

    input: { x: 0, y: 0, active: false, isTouch: false },

    ball: {
      x: 0,
      y: 0,
      radius: 32,
      vx: 0,
      vy: 0,
      rotation: 0,
      angularVelocity: 0,
    },

    particles: [] as any[],
    shockwaves: [] as any[],
    soundEnabled: true,
    ballSkin: "classic" as "classic" | "gold" | "neon" | "fire",
  });

  useEffect(() => {
    const saved = localStorage.getItem("pro_juggler_highscore");
    if (saved) {
      setHighScore(parseInt(saved, 10));
      stateRef.current.highScore = parseInt(saved, 10);
    }
    const savedLeaderboard = localStorage.getItem("pro_juggler_leaderboard");
    if (savedLeaderboard) {
      setLeaderboard(JSON.parse(savedLeaderboard));
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = stateRef.current;
    let animationFrameId: number;

    const GRAVITY = 0.18;
    const AIR_RESISTANCE = 0.992;
    const BOUNCE_DAMPING = 0.5;

    const initAudio = () => {
      if (!state.audioCtx) {
        state.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (state.audioCtx && state.audioCtx.state === "suspended") {
        state.audioCtx.resume();
      }
    };

    const playSound = (type: "kick" | "wall" | "lose") => {
      if (!state.soundEnabled) return;
      const audioCtx = state.audioCtx;
      if (!audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const t = audioCtx.currentTime;

      if (type === "kick") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(80, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.1);
        gain.gain.setValueAtTime(0.8, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.start();
        osc.stop(t + 0.15);
      } else if (type === "wall") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(60, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.05);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        osc.start();
        osc.stop(t + 0.05);
      } else if (type === "lose") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(80, t);
        osc.frequency.linearRampToValueAtTime(40, t + 0.6);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.linearRampToValueAtTime(0.01, t + 0.6);
        osc.start();
        osc.stop(t + 0.6);
      }
    };

    const createBlast = (x: number, y: number) => {
      state.shockwaves.push({
        x,
        y,
        radius: 10 * state.scale,
        speed: 8 * state.scale,
        alpha: 1.0,
        width: 5 * state.scale,
      });

      for (let i = 0; i < 15; i++) {
        state.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          life: 1.0,
          size: Math.random() * 6 + 2,
          color: Math.random() > 0.5 ? "#fff" : "#FFD700",
        });
      }
    };

    const drawGradientRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      c1: string,
      c2: string,
    ) => {
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, c1);
      g.addColorStop(1, c2);
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    };

    const drawPoly = (x: number, y: number, r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const ang = ((Math.PI * 2) / 5) * i - Math.PI / 2;
        ctx.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
      }
      ctx.closePath();
      ctx.fill();
    };

    const drawShoe = (x: number, y: number, r: number, angle: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle * 0.3);

      const grad = ctx.createLinearGradient(-r, -r, r, r);
      grad.addColorStop(0, "#FF5252");
      grad.addColorStop(1, "#D32F2F");
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.3, r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(0, r * 0.2, r * 1.2, r * 0.4, 0, 0, Math.PI);
      ctx.fill();

      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, -r * 0.2);
      ctx.lineTo(r * 0.2, 0);
      ctx.stroke();

      ctx.restore();
    };

    const drawLeg = (hipX: number, hipY: number, foot: any, color: string) => {
      ctx.strokeStyle = color || "#e0ac69";
      ctx.lineWidth = 6 * state.scale;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(hipX + (foot === state.player.left ? -10 : 10) * state.scale, hipY);
      ctx.lineTo(foot.x, foot.y);
      ctx.stroke();

      drawShoe(foot.x, foot.y, state.player.footRadius, Math.atan2(foot.vy, foot.vx));

      if (state.gameState === "PLAYING" && foot === state.player.right) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.beginPath();
        ctx.arc(foot.x, foot.y, state.player.footRadius * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;

      let newScale = Math.min(canvas.width / 400, canvas.height / 750);
      newScale = Math.max(0.6, Math.min(newScale, 1.4));
      state.scale = newScale;

      state.ball.radius = 32 * newScale;
      state.player.footRadius = 16 * newScale;
      state.player.legLength = canvas.height * 0.15;

      state.player.x = canvas.width / 2;
      state.player.y = canvas.height * 0.68;

      const footRestY = state.player.y + state.player.legLength;

      state.player.left.x = state.player.x - 35 * newScale;
      state.player.left.y = footRestY;
      state.player.right.x = state.player.x + 35 * newScale;
      state.player.right.y = footRestY;
    };

    resize();

    const updatePlayer = () => {
      const { player, input, scale } = state;

      let targetBodyX = canvas.width / 2;
      if (input.active) {
        targetBodyX = (canvas.width / 2) * 0.4 + input.x * 0.6;
      }

      player.x += (targetBodyX - player.x) * 0.3;

      const hipX = player.x;
      const hipY = player.y;

      const restingY = hipY + player.legLength;

      const restingLeftX = hipX - 35 * scale;
      let targetLX = restingLeftX;
      let targetLY = restingY;

      let dxL = targetLX - hipX;
      let dyL = targetLY - hipY;
      let distL = Math.sqrt(dxL * dxL + dyL * dyL);
      if (distL > player.legLength) {
        const ratio = player.legLength / distL;
        dxL *= ratio;
        dyL *= ratio;
        targetLX = hipX + dxL;
        targetLY = hipY + dyL;
      }

      player.left.x = targetLX;
      player.left.y = targetLY;

      const restingRightX = hipX + 35 * scale;
      const maxRightLegLength = player.legLength * 3;

      let targetRX = input.active ? input.x : restingRightX;
      let targetRY = input.active ? input.y : restingY;

      let dxR = targetRX - hipX;
      let dyR = targetRY - hipY;
      let distR = Math.sqrt(dxR * dxR + dyR * dyR);

      if (distR > maxRightLegLength) {
        let constrainedDx = dxR;
        if (Math.abs(constrainedDx) > maxRightLegLength) {
          constrainedDx = Math.sign(constrainedDx) * maxRightLegLength;
        }

        let constrainedDy = Math.sqrt(
          Math.max(0, Math.pow(maxRightLegLength, 2) - Math.pow(constrainedDx, 2)),
        );

        if (dyR < 0) constrainedDy = -constrainedDy;

        targetRX = hipX + constrainedDx;
        targetRY = hipY + constrainedDy;
      }

      player.right.lastX = player.right.x;
      player.right.lastY = player.right.y;

      player.right.x = targetRX;
      player.right.y = targetRY;

      player.right.vx = player.right.x - player.right.lastX;
      player.right.vy = player.right.y - player.right.lastY;
    };

    const resolveFootCollision = (foot: any) => {
      const { ball, player } = state;
      const dx = ball.x - foot.x;
      const dy = ball.y - foot.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const minDist = (ball.radius + player.footRadius) * 1.35;

      if (dist < minDist) {
        const nx = dx / dist;
        const ny = dy / dist;

        const dvx = ball.vx - foot.vx;
        const dvy = ball.vy - foot.vy;

        const velAlongNormal = dvx * nx + dvy * ny;

        if (velAlongNormal < 0) {
          const restitution = 0.5;
          let j = -(1 + restitution) * velAlongNormal;

          ball.vx += j * nx;
          ball.vy += j * ny;

          if (Math.abs(nx) < 0.5) ball.vx *= 0.5;

          const kickPower = 0.45;
          ball.vx += foot.vx * kickPower;
          ball.vy += foot.vy * kickPower;

          if (ball.vx > 10) ball.vx = 10;
          if (ball.vx < -10) ball.vx = -10;

          const overlap = minDist - dist;
          ball.x += nx * overlap;
          ball.y += ny * overlap;

          ball.angularVelocity += (foot.vx - nx * velAlongNormal) * 0.03;

          playSound("kick");
          createBlast(ball.x, ball.y + ball.radius);

          if (ball.vy < -2) {
            state.score++;
            setScore(state.score);
          }
        }
      }
    };

    const checkCollision = () => {
      const { ball } = state;

      ball.vy += GRAVITY;
      ball.vx *= AIR_RESISTANCE;
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.rotation += ball.angularVelocity;
      ball.angularVelocity *= 0.98;

      if (ball.y + ball.radius > canvas.height) {
        if (ball.vy > 0) {
          state.gameState = "GAMEOVER";
          setGameState("GAMEOVER");
          playSound("lose");
          if (state.score > state.highScore) {
            state.highScore = state.score;
            setHighScore(state.score);
            localStorage.setItem("pro_juggler_highscore", state.score.toString());
          }
          if (state.score > 0) {
            const savedLb = localStorage.getItem("pro_juggler_leaderboard");
            const lb: number[] = savedLb ? JSON.parse(savedLb) : [];
            lb.push(state.score);
            lb.sort((a, b) => b - a);
            const top10 = lb.slice(0, 10);
            localStorage.setItem("pro_juggler_leaderboard", JSON.stringify(top10));
            setLeaderboard(top10);
          }
        }
      }

      if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx *= -BOUNCE_DAMPING;
        playSound("wall");
      }
      if (ball.x + ball.radius > canvas.width) {
        ball.x = canvas.width - ball.radius;
        ball.vx *= -BOUNCE_DAMPING;
        playSound("wall");
      }

      resolveFootCollision(state.player.right);
    };

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawGradientRect(0, 0, canvas.width, canvas.height, "#1e3c72", "#2a5298");

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.beginPath();
      ctx.arc(100, 100, 150, 0, Math.PI * 2);
      ctx.arc(canvas.width - 100, 100, 150, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const standTop = canvas.height * 0.4;
      const standHeight = canvas.height * 0.4;
      ctx.fillStyle = "#111";
      ctx.fillRect(0, standTop, canvas.width, standHeight);

      ctx.fillStyle = "rgba(255,255,255,0.1)";
      for (let i = 0; i < 300; i++) {
        const cx = Math.random() * canvas.width;
        const cy = standTop + Math.random() * standHeight;
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      const pitchY = canvas.height * 0.8;
      drawGradientRect(0, pitchY, canvas.width, canvas.height - pitchY, "#2E7D32", "#1B5E20");

      ctx.fillStyle = "rgba(0,0,0,0.05)";
      const stripeWidth = 50 * state.scale;
      for (let i = 0; i < canvas.width; i += stripeWidth * 2) {
        ctx.beginPath();
        ctx.moveTo(i + stripeWidth * 0.5, pitchY);
        ctx.lineTo(i + stripeWidth * 1.5, pitchY);
        ctx.lineTo(i + stripeWidth + (canvas.width / 2 - (i + stripeWidth)) * 0.4, canvas.height);
        ctx.lineTo(i + (canvas.width / 2 - i) * 0.4, canvas.height);
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, pitchY + 10);
      ctx.lineTo(canvas.width, pitchY + 10);
      ctx.stroke();

      if (state.gameState === "PLAYING" || state.gameState === "GAMEOVER") {
        updatePlayer();
        if (state.gameState === "PLAYING") checkCollision();

        const hipX = state.player.x;
        const hipY = state.player.y;
        drawLeg(hipX, hipY, state.player.left, "#cba376");
        drawLeg(hipX, hipY, state.player.right, "#e0ac69");

        ctx.fillStyle = "#0D47A1";
        ctx.fillRect(
          hipX - 35 * state.scale,
          hipY - 20 * state.scale,
          70 * state.scale,
          45 * state.scale,
        );

        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(hipX - 1 * state.scale, hipY, 2 * state.scale, 25 * state.scale);

        ctx.fillStyle = "#fff";
        ctx.fillRect(
          hipX - 32 * state.scale,
          hipY - 20 * state.scale,
          5 * state.scale,
          45 * state.scale,
        );
        ctx.fillRect(
          hipX + 27 * state.scale,
          hipY - 20 * state.scale,
          5 * state.scale,
          45 * state.scale,
        );

        ctx.fillStyle = "#D32F2F";
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(
            hipX - 32 * state.scale,
            hipY - 85 * state.scale,
            64 * state.scale,
            75 * state.scale,
            8,
          );
        } else {
          ctx.rect(
            hipX - 32 * state.scale,
            hipY - 85 * state.scale,
            64 * state.scale,
            75 * state.scale,
          );
        }
        ctx.fill();

        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.beginPath();
        ctx.moveTo(hipX, hipY - 85 * state.scale);
        ctx.lineTo(hipX - 10 * state.scale, hipY - 65 * state.scale);
        ctx.lineTo(hipX + 10 * state.scale, hipY - 65 * state.scale);
        ctx.fill();

        ctx.fillStyle = "#e0ac69";
        ctx.beginPath();
        ctx.arc(hipX, hipY - 95 * state.scale, 20 * state.scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#212121";
        ctx.beginPath();
        ctx.arc(hipX, hipY - 98 * state.scale, 22 * state.scale, Math.PI, Math.PI * 2.2);
        ctx.fill();

        ctx.save();
        ctx.translate(state.ball.x, state.ball.y);
        ctx.rotate(state.ball.rotation);

        const r = state.ball.radius;
        const skin = state.ballSkin;

        if (skin === "classic") {
          const grad = ctx.createRadialGradient(-10, -10, 5, 0, 0, r);
          grad.addColorStop(0, "#fff");
          grad.addColorStop(1, "#ddd");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#212121";
          const size = r * 0.55;
          drawPoly(0, 0, size * 0.6);
          for (let i = 0; i < 5; i++) {
            ctx.save();
            ctx.rotate(i * ((Math.PI * 2) / 5));
            ctx.translate(0, -r * 0.88);
            drawPoly(0, 0, size * 0.5);
            ctx.restore();
          }
        } else if (skin === "gold") {
          const grad = ctx.createRadialGradient(-10, -10, 5, 0, 0, r);
          grad.addColorStop(0, "#FFD700");
          grad.addColorStop(0.5, "#FFA500");
          grad.addColorStop(1, "#B8860B");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fff";
          for (let i = 0; i < 8; i++) {
            ctx.save();
            ctx.rotate(i * (Math.PI / 4));
            ctx.beginPath();
            ctx.moveTo(0, -r * 0.3);
            ctx.lineTo(r * 0.1, -r * 0.1);
            ctx.lineTo(0, r * 0.3);
            ctx.lineTo(-r * 0.1, -r * 0.1);
            ctx.fill();
            ctx.restore();
          }
        } else if (skin === "neon") {
          ctx.shadowBlur = 20;
          ctx.shadowColor = "#0ff";
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
          grad.addColorStop(0, "#0ff");
          grad.addColorStop(0.7, "#00f");
          grad.addColorStop(1, "#808");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "rgba(255,255,255,0.5)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
          ctx.stroke();
        } else if (skin === "fire") {
          const grad = ctx.createRadialGradient(0, -r * 0.3, 0, 0, 0, r);
          grad.addColorStop(0, "#FFFF00");
          grad.addColorStop(0.3, "#FF6600");
          grad.addColorStop(0.7, "#FF0000");
          grad.addColorStop(1, "#990000");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,0,0.6)";
          for (let i = 0; i < 6; i++) {
            ctx.save();
            ctx.rotate(i * (Math.PI / 3) + state.ball.rotation * 2);
            ctx.beginPath();
            ctx.ellipse(0, -r * 0.5, r * 0.15, r * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath();
        ctx.arc(-r * 0.3, -r * 0.3, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (state.ball.y < -state.ball.radius) {
          ctx.save();
          ctx.translate(Math.min(Math.max(state.ball.x, 30), canvas.width - 30), 50);
          const pulse = 1 + Math.sin(Date.now() / 150) * 0.2;
          ctx.scale(pulse, pulse);
          ctx.fillStyle = "#fff";
          ctx.shadowBlur = 10;
          ctx.shadowColor = "white";
          ctx.beginPath();
          ctx.moveTo(0, -15);
          ctx.lineTo(-20, 15);
          ctx.lineTo(0, 5);
          ctx.lineTo(20, 15);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        for (let i = state.shockwaves.length - 1; i >= 0; i--) {
          const s = state.shockwaves[i];
          s.radius += s.speed;
          s.alpha -= 0.08;
          s.width *= 0.9;

          if (s.alpha <= 0) {
            state.shockwaves.splice(i, 1);
          } else {
            ctx.save();
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${s.alpha})`;
            ctx.lineWidth = s.width;
            ctx.stroke();
            ctx.restore();
          }
        }

        for (let i = state.particles.length - 1; i >= 0; i--) {
          const p = state.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.04;
          if (p.life <= 0) state.particles.splice(i, 1);
          else {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      } else if (state.gameState === "START") {
        state.player.x = canvas.width / 2;
        updatePlayer();

        const hipX = state.player.x;
        const hipY = state.player.y;
        drawLeg(hipX, hipY, state.player.left, "#cba376");
        drawLeg(hipX, hipY, state.player.right, "#e0ac69");

        ctx.fillStyle = "#0D47A1";
        ctx.fillRect(
          hipX - 35 * state.scale,
          hipY - 20 * state.scale,
          70 * state.scale,
          45 * state.scale,
        );
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(hipX - 1 * state.scale, hipY, 2 * state.scale, 25 * state.scale);
        ctx.fillStyle = "#fff";
        ctx.fillRect(
          hipX - 32 * state.scale,
          hipY - 20 * state.scale,
          5 * state.scale,
          45 * state.scale,
        );
        ctx.fillRect(
          hipX + 27 * state.scale,
          hipY - 20 * state.scale,
          5 * state.scale,
          45 * state.scale,
        );
        ctx.fillStyle = "#D32F2F";
        if (ctx.roundRect)
          ctx.roundRect(
            hipX - 32 * state.scale,
            hipY - 85 * state.scale,
            64 * state.scale,
            75 * state.scale,
            8,
          );
        else
          ctx.rect(
            hipX - 32 * state.scale,
            hipY - 85 * state.scale,
            64 * state.scale,
            75 * state.scale,
          );
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.beginPath();
        ctx.moveTo(hipX, hipY - 85 * state.scale);
        ctx.lineTo(hipX - 10 * state.scale, hipY - 65 * state.scale);
        ctx.lineTo(hipX + 10 * state.scale, hipY - 65 * state.scale);
        ctx.fill();
        ctx.fillStyle = "#e0ac69";
        ctx.beginPath();
        ctx.arc(hipX, hipY - 95 * state.scale, 20 * state.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#212121";
        ctx.beginPath();
        ctx.arc(hipX, hipY - 98 * state.scale, 22 * state.scale, Math.PI, Math.PI * 2.2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    // Event Listeners
    const handleInput = (type: "mouse" | "touch", e: any) => {
      initAudio();
      if (state.gameState !== "PLAYING") return;

      const rect = canvas.getBoundingClientRect();

      if (type === "touch") {
        state.input.isTouch = true;
        if (e.length > 0) {
          const t = e[0];
          state.input.x = t.clientX - rect.left;
          state.input.y = t.clientY - rect.top;
          state.input.active = true;
        } else {
          state.input.active = false;
        }
      } else if (type === "mouse") {
        if (state.input.isTouch) return;
        state.input.x = e.clientX - rect.left;
        state.input.y = e.clientY - rect.top;
        state.input.active = true;
      }
    };

    const onMouseMove = (e: MouseEvent) => handleInput("mouse", e);
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      handleInput("touch", e.touches);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleInput("touch", e.touches);
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleInput("touch", e.touches);
    };
    const onTouchCancel = (e: TouchEvent) => {
      e.preventDefault();
      handleInput("touch", e.touches);
    };
    const onResizeWindow = () => resize();

    window.addEventListener("resize", onResizeWindow);
    window.addEventListener("mousemove", onMouseMove);

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    canvas.addEventListener("touchcancel", onTouchCancel, { passive: false });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResizeWindow);
      window.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchCancel);
    };
  }, []);

  const resetGame = () => {
    const state = stateRef.current;

    if (!state.audioCtx) {
      state.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (state.audioCtx.state === "suspended") state.audioCtx.resume();

    const canvas = canvasRef.current;
    const width = canvas ? canvas.width : 400;
    const height = canvas ? canvas.height : 750;

    state.ball.x = width / 2;
    state.ball.y = height * 0.2;
    state.ball.vx = 0;
    state.ball.vy = 0;
    state.ball.rotation = 0;
    state.ball.angularVelocity = 0;

    state.player.x = width / 2;
    state.player.y = height * 0.68;

    state.input.active = false;
    state.input.x = state.player.x + 40 * state.scale;
    state.input.y = state.player.y + state.player.legLength;

    state.score = 0;
    setScore(0);

    state.gameState = "PLAYING";
    setGameState("PLAYING");

    state.particles = [];
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full font-['Teko',_sans-serif] bg-[#1a1a1a] overflow-hidden"
      style={{
        width: "100%",
        minWidth: "100%",
        height: "100%",
        minHeight: "95vh",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Teko:wght@600&display=swap');
      `}</style>

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between pt-4 pb-4 z-10">
        <div className="text-center pt-2 text-white drop-shadow-md">
          <h2 className="text-6xl m-0 leading-[0.9] bg-gradient-to-b from-white to-[#ddd] bg-clip-text text-transparent drop-shadow-sm font-bold">
            {score}
          </h2>
          <div className="text-xl text-[#FFD700] mt-1 tracking-widest uppercase font-semibold">
            Best: {highScore}
          </div>
        </div>
        <div className="w-full text-center opacity-60 text-lg text-white uppercase tracking-widest pb-4 font-semibold">
          Hold & Drag to Kick
        </div>
      </div>

      <div className="absolute top-4 right-4 z-30 flex gap-3">
        <button
          onClick={() => setLeaderboardOpen(true)}
          className="w-12 h-12 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer pointer-events-auto border border-white/10 active:scale-95 transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6 text-white/80"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
            />
          </svg>
        </button>

        <button
          onClick={() => setSettingsOpen(true)}
          className="w-12 h-12 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer pointer-events-auto border border-white/10 active:scale-95 transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6 text-white/80"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>

      {settingsOpen && (
        <div className="absolute top-0 left-0 w-full h-full bg-black/85 flex flex-col items-center justify-center z-40 backdrop-blur-md px-6 animate-in fade-in duration-200">
          <h1 className="text-white text-5xl mb-8 uppercase tracking-widest text-center font-bold drop-shadow-xl font-['Teko']">
            Settings
          </h1>

          <div className="w-full max-w-[300px] mb-8">
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                stateRef.current.soundEnabled = !soundEnabled;
              }}
              className={`w-full py-4 px-6 rounded text-2xl uppercase tracking-widest font-bold transition-all cursor-pointer border ${
                soundEnabled
                  ? "bg-white/10 text-white border-white/30 hover:bg-white/20"
                  : "bg-transparent text-white/40 border-white/10 hover:bg-white/5"
              } active:scale-95 backdrop-blur-sm`}
            >
              Sound {soundEnabled ? "ON" : "OFF"}
            </button>
          </div>

          <div className="w-full max-w-[340px] mb-10">
            <p className="text-white/60 text-xl mb-4 uppercase tracking-widest text-center font-bold">
              Ball Skin
            </p>
            <div className="grid grid-cols-2 gap-4">
              {(["classic", "gold", "neon", "fire"] as const).map((skin) => (
                <button
                  key={skin}
                  onClick={() => {
                    setBallSkin(skin);
                    stateRef.current.ballSkin = skin;
                  }}
                  className={`py-6 px-4 rounded-xl flex flex-col items-center justify-center gap-3 transition-all cursor-pointer active:scale-95 border ${
                    ballSkin === skin
                      ? "bg-white/10 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                      : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div
                    className="w-16 h-16 rounded-full shadow-lg relative overflow-hidden"
                    style={{
                      background:
                        skin === "classic"
                          ? "radial-gradient(circle at 30% 30%, #fff 0%, #ddd 100%)"
                          : skin === "gold"
                            ? "radial-gradient(circle at 30% 30%, #FFD700 0%, #FFA500 50%, #B8860B 100%)"
                            : skin === "neon"
                              ? "radial-gradient(circle at 50% 50%, #0ff 0%, #00f 70%, #808 100%)"
                              : "radial-gradient(circle at 50% 30%, #FFFF00 0%, #FF6600 30%, #FF0000 70%, #990000 100%)",
                      boxShadow:
                        skin === "neon"
                          ? "0 0 25px #0ff, 0 0 50px rgba(0,255,255,0.4)"
                          : skin === "fire"
                            ? "0 0 25px #FF6600, 0 0 50px rgba(255,102,0,0.4)"
                            : skin === "gold"
                              ? "0 0 25px #FFD700, 0 0 50px rgba(255,215,0,0.4)"
                              : "0 4px 15px rgba(0,0,0,0.4)",
                    }}
                  >
                    {skin === "classic" && (
                      <>
                        <div
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-[#212121] rotate-0"
                          style={{
                            clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
                          }}
                        ></div>
                        <div
                          className="absolute top-[10%] left-1/2 -translate-x-1/2 w-3 h-3 bg-[#212121]"
                          style={{
                            clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
                          }}
                        ></div>
                        <div
                          className="absolute bottom-[15%] left-[20%] w-3 h-3 bg-[#212121]"
                          style={{
                            clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
                          }}
                        ></div>
                        <div
                          className="absolute bottom-[15%] right-[20%] w-3 h-3 bg-[#212121]"
                          style={{
                            clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
                          }}
                        ></div>
                        <div
                          className="absolute top-[25%] left-[8%] w-2.5 h-2.5 bg-[#212121]"
                          style={{
                            clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
                          }}
                        ></div>
                        <div
                          className="absolute top-[25%] right-[8%] w-2.5 h-2.5 bg-[#212121]"
                          style={{
                            clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
                          }}
                        >
                          {" "}
                        </div>
                      </>
                    )}
                    {skin === "gold" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="w-6 h-6 bg-white/60"
                          style={{
                            clipPath:
                              "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
                          }}
                        ></div>
                      </div>
                    )}
                    {skin === "neon" && (
                      <>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-white/50"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-white/50"></div>
                      </>
                    )}
                    {skin === "fire" && (
                      <>
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-4 bg-yellow-300/60 rounded-full"></div>
                        <div className="absolute top-3 left-2 w-1.5 h-3 bg-yellow-300/50 rounded-full rotate-[-30deg]"></div>
                        <div className="absolute top-3 right-2 w-1.5 h-3 bg-yellow-300/50 rounded-full rotate-[30deg]"></div>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-3 bg-yellow-300/40 rounded-full"></div>
                      </>
                    )}
                    <div className="absolute top-2 left-2 w-4 h-4 bg-white/30 rounded-full blur-[2px]"></div>
                  </div>
                  <span
                    className={`uppercase tracking-wider text-sm font-bold ${
                      ballSkin === skin ? "text-white" : "text-white/40"
                    }`}
                  >
                    {skin}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setSettingsOpen(false)}
            className="bg-white text-black px-12 py-3 text-2xl rounded shadow-lg uppercase tracking-widest font-bold active:scale-95 transition-transform cursor-pointer hover:bg-gray-200"
          >
            Done
          </button>
        </div>
      )}

      {leaderboardOpen && (
        <div className="absolute top-0 left-0 w-full h-full bg-black/85 flex flex-col items-center justify-center z-40 backdrop-blur-md px-6 animate-in fade-in duration-200">
          <h1 className="text-white text-5xl mb-6 uppercase tracking-widest text-center font-bold drop-shadow-xl font-['Teko']">
            Leaderboard
          </h1>

          <div className="w-full max-w-[300px] mb-8">
            {leaderboard.length === 0 ? (
              <p className="text-white/40 text-center text-lg">
                No scores yet. Play to set records!
              </p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((lbScore, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between py-3 px-4 rounded-lg border ${
                      index === 0
                        ? "bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/40"
                        : index === 1
                          ? "bg-gradient-to-r from-gray-300/20 to-gray-400/10 border-gray-300/40"
                          : index === 2
                            ? "bg-gradient-to-r from-amber-700/20 to-amber-800/10 border-amber-700/40"
                            : "bg-white/5 border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold ${
                          index === 0
                            ? "bg-yellow-500 text-black"
                            : index === 1
                              ? "bg-gray-300 text-black"
                              : index === 2
                                ? "bg-amber-700 text-white"
                                : "bg-white/10 text-white/60"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="text-white/80 text-lg font-medium">
                        {index === 0 ? "Best" : `#${index + 1}`}
                      </span>
                    </div>
                    <span
                      className={`text-2xl font-bold ${
                        index === 0 ? "text-yellow-400" : "text-white"
                      }`}
                    >
                      {lbScore}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setLeaderboardOpen(false)}
            className="bg-white text-black px-12 py-3 text-2xl rounded shadow-lg uppercase tracking-widest font-bold active:scale-95 transition-transform cursor-pointer hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      )}

      {gameState === "START" && (
        <div className="absolute top-0 left-0 w-full h-full bg-black/85 flex flex-col items-center justify-center z-20 backdrop-blur-sm animate-in fade-in px-6">
          <h1 className="text-white text-5xl mb-2 uppercase tracking-widest text-center font-bold drop-shadow-xl leading-tight">
            Pro Juggler
          </h1>
          <p className="text-gray-300 text-lg mb-6 text-center max-w-[90%] leading-relaxed font-medium">
            Master the Right Foot
            <br />
            Touch anywhere to control.
          </p>
          <button
            onClick={resetGame}
            onTouchStart={(e) => {
              e.preventDefault();
              resetGame();
            }}
            className="bg-gradient-to-br from-[#FF416C] to-[#FF4B2B] text-white px-8 py-3 text-2xl rounded shadow-[0_10px_20px_rgba(255,75,43,0.3)] uppercase tracking-wide font-bold active:scale-95 transition-transform cursor-pointer pointer-events-auto"
          >
            KICK OFF
          </button>
        </div>
      )}

      {gameState === "GAMEOVER" && (
        <div className="absolute top-0 left-0 w-full h-full bg-black/85 flex flex-col items-center justify-center z-20 backdrop-blur-sm animate-in fade-in px-6">
          <h1 className="text-white text-5xl mb-2 uppercase tracking-widest text-center font-bold drop-shadow-xl">
            Game Over
          </h1>
          <p className="text-gray-300 text-2xl mb-6 text-center max-w-[90%] leading-relaxed font-medium">
            Score: {score}
          </p>
          <button
            onClick={resetGame}
            onTouchStart={(e) => {
              e.preventDefault();
              resetGame();
            }}
            className="bg-gradient-to-br from-[#FF416C] to-[#FF4B2B] text-white px-8 py-3 text-2xl rounded shadow-[0_10px_20px_rgba(255,75,43,0.3)] uppercase tracking-wide font-bold active:scale-95 transition-transform cursor-pointer pointer-events-auto"
          >
            RETRY
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

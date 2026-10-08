// Falling coins that players collect by touching them with a hand. Positions
// are normalized (0–1) to the canvas; the radius is in canvas pixels.
import type { Hitbox, PlayerId } from "./hands";

const COIN_MIN_INTERVAL_MS = 1400;
const COIN_MAX_INTERVAL_MS = 2400;
const COIN_LIFETIME_MS = 3000;
// Coins start blinking after this age to show they are about to disappear
const COIN_BLINK_MS = 1500;

interface Coin {
  spawnTime: number;
  baseX: number;
  x: number;
  y: number;
  amplitude: number;
  frequency: number;
  speed: number;
  radius: number;
  special: boolean;
  value: number;
}

interface CoinEffect {
  spawnTime: number;
  x: number;
  y: number;
  radius: number;
  lifetime: number;
  special: boolean;
}

export interface CoinCollection {
  playerId: PlayerId;
  value: number;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export class CoinField {
  private coins: Coin[] = [];
  private effects: CoinEffect[] = [];
  private nextSpawnTime = 0;
  private coinsSinceSpecial = 0;
  private nextFavor: PlayerId = 1;
  // Coins spawned on each player's side, to keep both sides balanced
  private spawnedFor: Record<PlayerId, number> = { 1: 0, 2: 0 };

  reset(now: number) {
    this.clear();
    this.nextFavor = Math.random() < 0.5 ? 1 : 2;
    this.spawnedFor = { 1: 0, 2: 0 };
    this.scheduleNext(now);
  }

  clear() {
    this.coins.length = 0;
    this.effects.length = 0;
    this.coinsSinceSpecial = 0;
  }

  // Moves the coins and returns the ones collected by a player this frame.
  // collectedCounts is the number of coins each player has, so that a player
  // who is behind gets the next coin.
  update(
    now: number,
    deltaSeconds: number,
    hitboxes: Hitbox[],
    width: number,
    height: number,
    collectedCounts: Record<PlayerId, number>
  ): CoinCollection[] {
    const collections: CoinCollection[] = [];

    if (now >= this.nextSpawnTime) {
      this.spawn(now, collectedCounts);
      this.scheduleNext(now);
    }

    for (let i = this.coins.length - 1; i >= 0; i -= 1) {
      const coin = this.coins[i];
      const age = now - coin.spawnTime;
      coin.y += coin.speed * deltaSeconds;
      const wiggle = Math.sin((age / 1000) * coin.frequency) * coin.amplitude;
      coin.x = Math.max(0.06, Math.min(0.94, coin.baseX + wiggle));

      if (age > COIN_LIFETIME_MS || coin.y > 1.15) {
        this.coins.splice(i, 1);
        continue;
      }

      const coinPx = coin.x * width;
      const coinPy = coin.y * height;
      const box = hitboxes.find(
        b => coinPx >= b.x && coinPx <= b.x + b.width && coinPy >= b.y && coinPy <= b.y + b.height
      );

      if (box) {
        if (box.playerId) {
          collections.push({ playerId: box.playerId, value: coin.value });
        }
        this.effects.push({
          spawnTime: now,
          x: coin.x,
          y: coin.y,
          radius: coin.radius,
          lifetime: coin.special ? 550 : 400,
          special: coin.special
        });
        this.coins.splice(i, 1);
      }
    }

    return collections;
  }

  draw(ctx: CanvasRenderingContext2D, now: number) {
    const { width, height } = ctx.canvas;
    this.effects = this.effects.filter(effect => now - effect.spawnTime <= effect.lifetime);

    for (const coin of this.coins) {
      const age = now - coin.spawnTime;
      const alpha = age > COIN_BLINK_MS && Math.floor((age - COIN_BLINK_MS) / 120) % 2 ? 0.35 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(coin.x * width, coin.y * height);
      drawCoin(ctx, coin);
      ctx.restore();
    }

    for (const effect of this.effects) {
      ctx.save();
      ctx.translate(effect.x * width, effect.y * height);
      drawCoinSplash(ctx, effect, now - effect.spawnTime);
      ctx.restore();
    }
  }

  private scheduleNext(now: number) {
    this.nextSpawnTime = now + randomBetween(COIN_MIN_INTERVAL_MS, COIN_MAX_INTERVAL_MS);
  }

  private spawn(now: number, collectedCounts: Record<PlayerId, number>) {
    const spawnBalance = this.spawnedFor[1] - this.spawnedFor[2];
    let targetPlayer: PlayerId;
    if (spawnBalance > 0) {
      targetPlayer = 2;
    } else if (spawnBalance < 0) {
      targetPlayer = 1;
    } else if (collectedCounts[1] < collectedCounts[2]) {
      targetPlayer = 1;
    } else if (collectedCounts[2] < collectedCounts[1]) {
      targetPlayer = 2;
    } else {
      targetPlayer = this.nextFavor;
      this.nextFavor = targetPlayer === 1 ? 2 : 1;
    }
    this.spawnedFor[targetPlayer] += 1;

    const baseX = targetPlayer === 1 ? randomBetween(0.18, 0.44) : randomBetween(0.56, 0.82);
    // A special coin (worth 3) comes at most every third coin
    const isSpecial = this.coinsSinceSpecial >= 2 && Math.random() < 1 / 3;
    this.coinsSinceSpecial = isSpecial ? 0 : Math.min(this.coinsSinceSpecial + 1, 3);

    const baseSpeed = randomBetween(0.28, 0.4);
    this.coins.push({
      spawnTime: now,
      baseX,
      x: baseX,
      y: -0.08,
      amplitude: randomBetween(0.02, 0.06),
      frequency: randomBetween(2.0, 3.5),
      speed: isSpecial ? baseSpeed * 1.9 : baseSpeed,
      radius: isSpecial ? 16 : 22,
      special: isSpecial,
      value: isSpecial ? 3 : 1
    });
  }
}

function drawCoin(ctx: CanvasRenderingContext2D, coin: Coin) {
  const radius = coin.radius;
  const gradient = ctx.createRadialGradient(0, 0, radius * 0.25, 0, 0, radius);
  if (coin.special) {
    gradient.addColorStop(0, "rgba(140, 235, 255, 1)");
    gradient.addColorStop(1, "rgba(70, 170, 255, 0.9)");
  } else {
    gradient.addColorStop(0, "rgba(255, 240, 180, 1)");
    gradient.addColorStop(1, "rgba(255, 205, 70, 0.92)");
  }
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = coin.special ? "rgba(90, 200, 255, 0.95)" : "rgba(250, 220, 120, 0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 1, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = coin.special ? "rgba(230, 255, 255, 0.75)" : "rgba(255, 255, 255, 0.7)";
  ctx.beginPath();
  ctx.arc(-radius * 0.25, -radius * 0.25, radius * 0.18, 0, Math.PI * 2);
  ctx.fill();
}

function drawCoinSplash(ctx: CanvasRenderingContext2D, effect: CoinEffect, age: number) {
  const progress = Math.min(1, age / effect.lifetime);
  const outerRadius = effect.radius * (1 + progress * 1.8);
  const innerRadius = effect.radius * (0.6 + progress * 0.7);

  const gradient = ctx.createRadialGradient(0, 0, innerRadius * 0.4, 0, 0, outerRadius);
  if (effect.special) {
    gradient.addColorStop(0, "rgba(160, 245, 255, 0.9)");
    gradient.addColorStop(1, "rgba(80, 190, 255, 0)");
  } else {
    gradient.addColorStop(0, "rgba(255, 233, 120, 0.9)");
    gradient.addColorStop(1, "rgba(255, 190, 40, 0)");
  }
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = effect.special
    ? `rgba(120, 220, 255, ${1 - progress})`
    : `rgba(255, 220, 80, ${1 - progress})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
  ctx.stroke();
}

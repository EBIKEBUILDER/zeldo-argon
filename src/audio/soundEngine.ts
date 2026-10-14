// Pure Web Audio API procedural sound synthesis engine for Zeldo
// Zero external audio assets — all SFX synthesized in real time.

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public unlock(): void {
    this.getContext();
  }

  public playSwordSwing(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.16);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.4);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.setValueAtTime(2.6, now);
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(340, now + 0.15);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.24, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.13);

    oscGain.gain.setValueAtTime(0.14, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playShieldBlock(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Solid metallic guard clank + low thud
    [620, 940].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const t = now + idx * 0.018;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.55, t + 0.12);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    });
  }

  public playBoomerangThrow(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.065;
      osc.type = "sine";
      osc.frequency.setValueAtTime(360 + i * 40, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.06);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.062);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.065);
    }
  }

  public playBowShoot(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Bowstring twang + high arrow zip
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.09);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playArrowStick(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Solid woody/stone thud + vibrating arrow shaft twang
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = "triangle";
    thud.frequency.setValueAtTime(195, now);
    thud.frequency.exponentialRampToValueAtTime(62, now + 0.085);
    thudGain.gain.setValueAtTime(0.18, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    thud.connect(thudGain);
    thudGain.connect(ctx.destination);
    thud.start(now);
    thud.stop(now + 0.095);

    const twang = ctx.createOscillator();
    const twangGain = ctx.createGain();
    twang.type = "sine";
    twang.frequency.setValueAtTime(510, now + 0.01);
    twang.frequency.exponentialRampToValueAtTime(340, now + 0.13);
    twangGain.gain.setValueAtTime(0.09, now + 0.01);
    twangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    twang.connect(twangGain);
    twangGain.connect(ctx.destination);
    twang.start(now + 0.01);
    twang.stop(now + 0.145);
  }

  public playShopPurchase(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [783.99, 987.77, 1318.51, 1567.98].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.055;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.19);
    });
  }

  public playArmorDeflect(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [1180, 1760].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      const t = now + i * 0.025;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.72, t + 0.11);

      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    });
  }

  public playEnemyHit(isBoss = false): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isBoss ? "sawtooth" : "square";
    osc.frequency.setValueAtTime(isBoss ? 220 : 280, now);
    osc.frequency.exponentialRampToValueAtTime(isBoss ? 65 : 75, now + 0.14);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);

    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = "triangle";
    ping.frequency.setValueAtTime(isBoss ? 780 : 920, now);
    ping.frequency.exponentialRampToValueAtTime(220, now + 0.06);
    pingGain.gain.setValueAtTime(0.18, now);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    ping.connect(pingGain);
    pingGain.connect(ctx.destination);
    ping.start(now);
    ping.stop(now + 0.07);
  }

  public playEnemyDefeat(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const t = now + idx * 0.045;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.15, t + 0.09);

      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  }

  public playHeroHurt(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.09);
    osc.frequency.linearRampToValueAtTime(95, now + 0.22);

    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playHeartPickup(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Warm 3-note rising healing chime (F5 -> A5 -> C6)
    [698.46, 880.0, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const t = now + idx * 0.05;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  public playRupeePickup(tier: "green" | "blue" | "red" | "heart" = "green"): void {
    if (tier === "heart") {
      this.playHeartPickup();
      return;
    }
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const mul = tier === "red" ? 1.25 : tier === "blue" ? 1.12 : 1.0;
    const f1 = 1318.5 * mul; // E6
    const f2 = 1975.5 * mul; // B6

    [f1, f2].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const t = now + idx * 0.055;
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.19);
    });
  }

  public playKeyPickup(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 987.77, 1318.51];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const t = now + i * 0.085;
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (i === notes.length - 1 ? 0.55 : 0.18));

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + (i === notes.length - 1 ? 0.56 : 0.19));
    });
  }

  public playGateLocked(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [160, 135].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      const t = now + i * 0.09;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    });
  }

  public playGateUnlock(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const rumble = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    rumble.type = "sawtooth";
    rumble.frequency.setValueAtTime(92, now);
    rumble.frequency.linearRampToValueAtTime(58, now + 0.45);
    rumbleGain.gain.setValueAtTime(0.22, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    rumble.connect(rumbleGain);
    rumbleGain.connect(ctx.destination);
    rumble.start(now);
    rumble.stop(now + 0.5);

    const notes = [392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const t = now + 0.18 + i * 0.07;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playPortalTransition(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.35);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playBossRoar(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [75, 112.5, 148].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq * 1.25, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.72, now + 0.65);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    });
  }

  public playBossChargeAim(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.45);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playBossAttack(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.35);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playBossWallCrash(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.32);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.8);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.3);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.34, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.31);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);

    [587.33, 783.99, 659.25, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + 0.08 + idx * 0.06;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }

  public playBossLob(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.24);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playBombExplode(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.28);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.exponentialRampToValueAtTime(95, now + 0.26);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.28, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);

    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = "triangle";
    boom.frequency.setValueAtTime(135, now);
    boom.frequency.exponentialRampToValueAtTime(38, now + 0.25);
    boomGain.gain.setValueAtTime(0.26, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    boom.connect(boomGain);
    boomGain.connect(ctx.destination);
    boom.start(now);
    boom.stop(now + 0.27);
  }

  public playBossDefeat(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.11;
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220 - i * 25, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.14);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    }

    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + 0.58 + idx * 0.06;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.68);
    });
  }

  public playVictoryFanfare(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const melody: Array<{ f: number; t: number; d: number }> = [
      { f: 523.25, t: 0.0, d: 0.14 },
      { f: 523.25, t: 0.15, d: 0.14 },
      { f: 523.25, t: 0.3, d: 0.14 },
      { f: 523.25, t: 0.45, d: 0.36 },
      { f: 415.3, t: 0.84, d: 0.34 },
      { f: 466.16, t: 1.2, d: 0.34 },
      { f: 523.25, t: 1.56, d: 0.22 },
      { f: 466.16, t: 1.82, d: 0.14 },
      { f: 523.25, t: 1.98, d: 0.85 },
    ];

    melody.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(note.f, now + note.t);

      gain.gain.setValueAtTime(0.24, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.t);
      osc.stop(now + note.t + note.d + 0.02);
    });
  }

  public playBushCut(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Crisp leafy foliage rustle (bandpass-filtered noise bursts)
    const bufferSize = Math.floor(ctx.sampleRate * 0.14);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin((i / bufferSize) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    [1650, 2450].forEach((freq, idx) => {
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.setValueAtTime(2.2, now + idx * 0.025);
      filter.frequency.setValueAtTime(freq, now + idx * 0.025);
      filter.frequency.exponentialRampToValueAtTime(freq * 0.45, now + idx * 0.025 + 0.12);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.22, now + idx * 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.025 + 0.13);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now + idx * 0.025);
    });

    // 2. Quick woody stem snip
    const snip = ctx.createOscillator();
    const snipGain = ctx.createGain();
    snip.type = "triangle";
    snip.frequency.setValueAtTime(420, now);
    snip.frequency.exponentialRampToValueAtTime(145, now + 0.065);
    snipGain.gain.setValueAtTime(0.14, now);
    snipGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    snip.connect(snipGain);
    snipGain.connect(ctx.destination);
    snip.start(now);
    snip.stop(now + 0.075);
  }

  public playSpinChargeReady(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [880, 1174.66, 1760].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const t = now + idx * 0.035;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }

  public playSpinAttack(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.34);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin((i / bufferSize) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.setValueAtTime(2.0, now);
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(1950, now + 0.17);
    filter.frequency.exponentialRampToValueAtTime(480, now + 0.33);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.3, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);

    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.055;
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.72, t + 0.12);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    });
  }

  public playFireballShoot(isCharged = false): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const dur = isCharged ? 0.32 : 0.2;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.15);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.setValueAtTime(1.8, now);
    filter.frequency.setValueAtTime(isCharged ? 760 : 1080, now);
    filter.frequency.exponentialRampToValueAtTime(isCharged ? 180 : 280, now + dur);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(isCharged ? 0.32 : 0.22, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(isCharged ? 240 : 360, now);
    osc.frequency.exponentialRampToValueAtTime(isCharged ? 75 : 130, now + dur);
    oscGain.gain.setValueAtTime(isCharged ? 0.22 : 0.14, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  public playFireExplosion(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.42);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.3);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(920, now);
    filter.frequency.exponentialRampToValueAtTime(110, now + 0.4);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.36, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.41);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);

    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = "triangle";
    boom.frequency.setValueAtTime(160, now);
    boom.frequency.exponentialRampToValueAtTime(42, now + 0.36);
    boomGain.gain.setValueAtTime(0.28, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    boom.connect(boomGain);
    boomGain.connect(ctx.destination);
    boom.start(now);
    boom.stop(now + 0.39);
  }

  public playTorchLight(lit = true): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const freqs = lit ? [523.25, 659.25, 783.99] : [440, 329.63];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const t = now + i * 0.05;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }

  public playSecretSolve(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Classic 8-note secret discovery chime
    const notes = [783.99, 739.99, 622.25, 440.0, 415.3, 659.25, 830.61, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const t = now + i * 0.085;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (i === 7 ? 0.38 : 0.14));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + (i === 7 ? 0.4 : 0.15));
    });
  }

  public playShovelDig(foundTreasure = false): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.16);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.3);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(640, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + 0.15);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.26, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);

    if (foundTreasure) {
      [587.33, 880, 1174.66].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + 0.12 + idx * 0.055;
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.19);
      });
    }
  }

  public playPotionDrink(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [440, 554.37, 659.25, 880, 1108.73].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.06;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.19);
    });
  }

  public playFairyRevive(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const harp = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0];
    harp.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.05;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.29);
    });
  }

  public playBeeBuzz(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(195, now);
    osc.frequency.linearRampToValueAtTime(245, now + 0.08);
    osc.frequency.linearRampToValueAtTime(185, now + 0.16);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playLift(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.16);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playThrow(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(460, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.18);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playPotSmash(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Ceramic clatter + high-frequency shard noise
    const bufferSize = Math.floor(ctx.sampleRate * 0.22);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1450, now);
    filter.frequency.exponentialRampToValueAtTime(520, now + 0.2);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.32, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);

    [880, 620, 440].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.032;
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.55, t + 0.07);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    });
  }

  public playBlockSlide(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Heavy stone scraping rumble
    const bufferSize = Math.floor(ctx.sampleRate * 0.42);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.85;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(220, now);
    filter.frequency.linearRampToValueAtTime(140, now + 0.4);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.28, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);

    const sub = ctx.createOscillator();
    const sGain = ctx.createGain();
    sub.type = "sawtooth";
    sub.frequency.setValueAtTime(78, now);
    sub.frequency.linearRampToValueAtTime(62, now + 0.38);
    sGain.gain.setValueAtTime(0.18, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    sub.connect(sGain);
    sGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.42);
  }

  public playCrystalSwitch(isOrange: boolean): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const freqs = isOrange ? [659.25, 987.77, 1318.51] : [587.33, 880.0, 1174.66];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.04;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playBombPlace(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playBombExplosion(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Deep concussive boom + debris crackle
    const bufferSize = Math.floor(ctx.sampleRate * 0.48);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.35);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(620, now);
    filter.frequency.exponentialRampToValueAtTime(95, now + 0.46);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.42, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);

    const sub = ctx.createOscillator();
    const sGain = ctx.createGain();
    sub.type = "sawtooth";
    sub.frequency.setValueAtTime(125, now);
    sub.frequency.exponentialRampToValueAtTime(34, now + 0.44);
    sGain.gain.setValueAtTime(0.36, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
    sub.connect(sGain);
    sGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.48);
  }

  public playGameOver(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [392.0, 369.99, 349.23, 311.13];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const t = now + i * 0.22;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (i === 3 ? 0.65 : 0.24));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + (i === 3 ? 0.68 : 0.25));
    });
  }

  public playTorchExtinguish(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.16);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  public playBurnBarrier(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Crackling blaze + rising ember sizzle
    const bufferSize = Math.floor(ctx.sampleRate * 0.34);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin((i / bufferSize) * Math.PI);
      const crackle = Math.random() > 0.72 ? 1.45 : 0.65;
      data[i] = (Math.random() * 2 - 1) * env * crackle;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(520, now);
    filter.frequency.exponentialRampToValueAtTime(1450, now + 0.32);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.28, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);

    const osc = ctx.createOscillator();
    const oGain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.26);
    oGain.gain.setValueAtTime(0.14, now);
    oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(oGain);
    oGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.29);
  }

  public playRockSpit(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Hollow stone pop + high-velocity rock launch thump
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(175, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.055);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playElectricShock(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Crackling electric buzz when touching or slashing an active electrified enemy
    [190, 480, 920].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      const t = now + idx * 0.032;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq * 1.35, t + 0.045);
      osc.frequency.linearRampToValueAtTime(freq * 0.75, t + 0.09);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.11);
    });
  }

  public playEyeStatueHit(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Piercing crystalline chime + heavy stone lock release
    [587.33, 880.0, 1174.66].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const t = now + i * 0.05;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }
}

export const soundEngine = new SoundEngine();


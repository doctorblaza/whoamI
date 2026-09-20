/* whoamI — BGM manager. 4 tracks matching story moods.
   Files live in assets/music/. title reuses track1 (uneasy, fits title screen). */
const Music = {
  tracks: {
    title:   'assets/music/track1-train.mp3',
    train:   'assets/music/track1-train.mp3',
    home:    'assets/music/track2-home.mp3',
    reveal:  'assets/music/track3-reveal.mp3',
    finale:  'assets/music/track4-finale.mp3',
  },
  audio: null,
  current: null,
  enabled: true,
  fading: null,
  volume: 0.6,

  _ensure() {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.loop = true;
      this.audio.preload = 'auto';
    }
  },

  play(key) {
    this._ensure();
    if (!this.enabled) { this.current = key; return; }
    const src = this.tracks[key];
    if (!src) return;
    if (this.current === key && !this.audio.paused) return;
    this.current = key;
    this._crossfade(src);
  },

  _crossfade(src) {
    const a = this.audio;
    clearInterval(this.fading);
    this.fading = setInterval(() => {
      if (a.volume > 0.06) {
        a.volume = Math.max(0, a.volume - 0.06);
      } else {
        clearInterval(this.fading);
        a.src = src;
        a.volume = 0;
        a.play().catch(() => {});
        this.fading = setInterval(() => {
          if (a.volume < this.volume) a.volume = Math.min(this.volume, a.volume + 0.05);
          else clearInterval(this.fading);
        }, 120);
      }
    }, 110);
  },

  toggle() {
    this.enabled = !this.enabled;
    this._ensure();
    if (!this.enabled) {
      clearInterval(this.fading);
      this.audio.pause();
    } else if (this.current) {
      const k = this.current;
      this.current = null;
      this.play(k);
    }
    return this.enabled;
  },
};

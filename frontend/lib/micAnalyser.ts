export class MicAnalyser {
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  public attachStream(stream: MediaStream, ctx: AudioContext): void {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    this.source = ctx.createMediaStreamSource(stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.source.connect(this.analyser);
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public detach(): void {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
  }
}

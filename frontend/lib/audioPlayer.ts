export class AudioPlayer {
  private ctx: AudioContext;
  private sourceNode: AudioBufferSourceNode | null = null;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.outputAnalyser = this.ctx.createAnalyser();
    this.outputAnalyser.fftSize = 256;
    this.outputAnalyser.connect(this.ctx.destination);
  }

  public async play(base64wav: string): Promise<void> {
    this.stop(); // Stop any currently playing audio before starting new one

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    const binaryString = window.atob(base64wav);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const arrayBuffer = bytes.buffer;

    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = audioBuffer;
    
    this.sourceNode.connect(this.outputAnalyser);
    this.sourceNode.start(0);
  }

  public stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (e) {
        // Ignore if already stopped
      }
      this.sourceNode = null;
    }
  }

  public getOutputAnalyser(): AnalyserNode {
    return this.outputAnalyser;
  }
}

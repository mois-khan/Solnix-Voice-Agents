export class AudioPlayer {
  private ctx: AudioContext;
  private outputAnalyser: AnalyserNode;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.outputAnalyser = this.ctx.createAnalyser();
    this.outputAnalyser.fftSize = 256;
    this.outputAnalyser.connect(this.ctx.destination);
  }

  public async play(base64wav: string): Promise<void> {
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
    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;
    
    source.connect(this.outputAnalyser);
    source.start(0);
  }

  public getOutputAnalyser(): AnalyserNode {
    return this.outputAnalyser;
  }
}

export class VoiceWSClient {
  private ws: WebSocket | null = null;
  private baseUrl: string;

  public onSessionReady?: (data: any) => void;
  public onTranscript?: (speaker: string, text: string) => void;
  public onAgentState?: (state: string) => void;
  public onAudioChunk?: (base64: string, seq: number) => void;
  public onLanguageSwitched?: (language: string) => void;
  public onError?: (code: string, message: string) => void;
  public onDisconnect?: () => void;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public connect(sessionId: string): void {
    const wsUrl = `${this.baseUrl}/ws/${sessionId}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
        return; // Our protocol uses JSON for incoming messages
      }

      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'session_ready':
            if (this.onSessionReady) this.onSessionReady(data);
            break;
          case 'transcript':
            if (this.onTranscript) this.onTranscript(data.speaker, data.text);
            break;
          case 'agent_state':
            if (this.onAgentState) this.onAgentState(data.state);
            break;
          case 'audio_chunk':
            if (this.onAudioChunk) this.onAudioChunk(data.data, data.seq);
            break;
          case 'language_switched':
            if (this.onLanguageSwitched) this.onLanguageSwitched(data.language);
            break;
          case 'error':
            if (this.onError) this.onError(data.code, data.message);
            break;
        }
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };

    this.ws.onclose = () => {
      if (this.onDisconnect) this.onDisconnect();
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket Error', err);
    };
  }

  public sendJSON(msg: object): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public sendAudio(blob: Blob): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(blob);
    }
  }

  public disconnect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendJSON({ type: 'session_end' });
      this.ws.close();
    }
    this.ws = null;
  }
}

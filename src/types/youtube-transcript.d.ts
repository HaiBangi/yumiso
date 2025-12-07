declare module "youtube-transcript" {
  export interface TranscriptSegment {
    text: string;
    duration: number;
    offset: number;
    lang?: string;
  }

  export interface TranscriptConfig {
    lang?: string;
    country?: string;
  }

  export class YoutubeTranscript {
    static fetchTranscript(
      videoId: string,
      config?: TranscriptConfig
    ): Promise<TranscriptSegment[]>;
  }
}

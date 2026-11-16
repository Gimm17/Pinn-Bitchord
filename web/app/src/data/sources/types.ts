export interface AddonSettingOption {
  value?: string;
  label?: string;
}

export interface AddonSetting {
  key: string;
  title?: string;
  type?: string;
  default?: string;
  options?: AddonSettingOption[];
}

export interface AddonManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  icon?: string;
  resources?: string[];
  settings?: AddonSetting[];
  allowDownloads?: number | boolean;
  checkValidLossless?: number | boolean;
}

export interface AddonTrack {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
  durationSec?: number;
  artworkURL?: string;
  format?: string;
  audioQuality?: string;
  streamURL?: string;
}

export interface AddonStream {
  url?: string;
  streamURL?: string;
  manifest?: string;
  format?: string;
  codec?: string;
  container?: string;
  quality?: string;
  mimeType?: string;
  sampleRate?: number;
  bitDepth?: number;
  encrypted?: boolean;
}

export interface SourceConfig {
  id: string;
  kind: 'addon' | 'jiosaavn' | 'youtube';
  name: string;
  baseUrl: string;
  version?: string;
  enabled: boolean;
  tags?: string[];
  allowDownloads?: boolean;
  checkValidLossless?: boolean;
}

export interface ResolvedSourceStream {
  sourceId: string;
  sourceName: string;
  streamUrl: string;
  isLossless: boolean;
  qualityText: string;
  format: string;
  codec: string;
  sampleRateHz?: number;
  bitDepth?: number;
  bitrateKbps?: number;
  durationSec?: number;
}

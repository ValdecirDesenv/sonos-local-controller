export type ConnectionStatus = 'connecting' | 'open' | 'closed';

export interface MemberState {
  playbackState: string;
  volume: number;
  mute: boolean;
}

export interface GroupMember {
  roomName: string;
  state: MemberState;
}

export interface GroupCoordinator {
  roomName: string;
  uuid: string;
  // Known backend bug: these three are always undefined in practice.
  // Typed as such so nothing ever reads live state from here by accident —
  // use getPrimaryMemberState(group) instead.
  state: { playbackState: undefined; volume: undefined; mute: undefined };
}

export interface GroupItem {
  uuid: string;
  coordinator: GroupCoordinator;
  members: GroupMember[];
  connectionStatus: 'online' | 'offline';
  hasTimePlay: boolean;
  timeStart: string; // 'HH:MM'
  timeStop: string; // 'HH:MM'
  isKeepPlaying: boolean;
  isInTimeFrameToPlay: boolean;
  autoRestoreGroupEnabled: boolean;
  hasDesiredGroupConfigured: boolean;
  desiredGroupSavedAt: string | null;
}

export interface DeviceRef {
  uuid: string;
  roomName: string;
}

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export interface SpotifyPlaylistEntry {
  id: string;
  name: string;
  image: string;
  url: string;
}

export type SpotifyPlaylistMap = Partial<Record<Weekday, SpotifyPlaylistEntry>>;

// ---- client -> server ----
export type ClientMessage =
  | { type: 'spotifyPlaylist' }
  | { type: 'saveSpotifyPlaylist'; data: { day: Weekday; url: string } }
  | { type: 'spotifyStartPlaylist'; data: { day: Weekday; url: string } }
  | { type: 'spotifyLogin' }
  | { type: 'removeGroup'; uuid: string }
  | { type: 'timeFrameUpdate'; uuid: string; hasTimePlay: boolean; timeStart: string; timeStop: string }
  | { type: 'keepPlayerUpdate'; uuid: string; isKeepPlaying: boolean }
  | { type: 'saveDesiredGroup'; uuid: string }
  | { type: 'setAutoRestoreGroup'; uuid: string; autoRestoreGroupEnabled: boolean };

// ---- server -> client ----
export type ServerMessage =
  | { type: 'update'; offLineData: boolean; data: GroupItem[]; devices: DeviceRef[] }
  | { type: 'spotifyPlaylists'; data: SpotifyPlaylistMap }
  | { type: 'spotifyAuthUrl'; url: string; openInNewTab: boolean }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

export function parseServerMessage(raw: string): ServerMessage | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof json !== 'object' || json === null || !('type' in json)) return null;
  return json as ServerMessage;
}

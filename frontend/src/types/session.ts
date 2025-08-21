// Session-related type definitions
export interface DeviceInfo {
  browser: string;
  os: string;
  device: string;
}

export interface LocationInfo {
  country: string;
  city: string;
  region: string;
}

export interface Session {
  id: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  location: LocationInfo;
  lastActivity: string;
  createdAt: string;
  isCurrent: boolean;
  description: string;
}

export interface SessionsResponse {
  message: string;
  sessions: Session[];
}

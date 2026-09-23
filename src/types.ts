export type ScanContentType = 'url' | 'wifi' | 'email' | 'phone' | 'text';

export interface ScannedResult {
  id: string;
  rawText: string;
  type: ScanContentType;
  timestamp: number;
  metadata?: {
    title?: string;
    ssid?: string;
    authType?: string;
    password?: string;
    phoneNumber?: string;
    emailAddress?: string;
  };
}

export interface CameraDevice {
  deviceId: string;
  label: string;
}

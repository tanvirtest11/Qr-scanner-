export type ScanContentType =
  | 'url'
  | 'wifi'
  | 'email'
  | 'phone'
  | 'vcard'
  | 'upi'
  | 'geo'
  | 'crypto'
  | 'text';

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
    contactName?: string;
    contactOrg?: string;
    contactTitle?: string;
    contactPhone?: string;
    contactEmail?: string;
    contactUrl?: string;
    upiPayee?: string;
    upiId?: string;
    upiAmount?: string;
    latitude?: string;
    longitude?: string;
    cryptoCurrency?: string;
    cryptoAddress?: string;
  };
}

export interface CameraDevice {
  deviceId: string;
  label: string;
}

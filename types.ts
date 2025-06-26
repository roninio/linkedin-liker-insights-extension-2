export interface LinkedInProfile {
  id: string;
  name: string;
  title: string;
  profileUrl?: string;
  detailedInfo?: {
    location?: string;
    about?: string;
    experience?: any[];
    extractedAt?: string;
    error?: boolean;
    message?: string;
  } | null;
}

// Message types for extension communication
export enum MessageType {
  FETCH_LIKERS_REQUEST = 'FETCH_LIKERS_REQUEST',
  FETCH_LIKERS_SUCCESS = 'FETCH_LIKERS_SUCCESS',
  FETCH_LIKERS_ERROR = 'FETCH_LIKERS_ERROR',
  LOG_MESSAGE = 'LOG_MESSAGE' // For debugging from content/background to popup
}

export interface FetchLikersRequestMessage {
  type: MessageType.FETCH_LIKERS_REQUEST;
  tabId: number;
}

export interface PartialProfile {
  name: string;
  profileUrl: string;
  title?: string; // Title might not always be available from likers list
}

export interface FetchLikersSuccessMessage {
  type: MessageType.FETCH_LIKERS_SUCCESS;
  payload: PartialProfile[];
}

export interface FetchLikersErrorMessage {
  type: MessageType.FETCH_LIKERS_ERROR;
  error: string;
}

export interface LogMessage {
  type: MessageType.LOG_MESSAGE;
  message: string;
  data?: any;
}

export type ExtensionMessage = 
  | FetchLikersRequestMessage 
  | FetchLikersSuccessMessage 
  | FetchLikersErrorMessage
  | LogMessage;

import { ClientListeners } from ".";

export interface SharedIORequest {
    action: keyof ClientListeners;
}

export interface AuthRequest extends SharedIORequest {
    token: string | null;
}

export interface PongRequest extends SharedIORequest {
    packetId: string;
}

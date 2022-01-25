import { ClientEvents } from "../types";

export interface SharedIORequest {
    action: keyof ClientEvents;
}

export interface AuthRequest extends SharedIORequest {
    token: string | null;
}

export interface PongRequest extends SharedIORequest {
    packetId: string;
}

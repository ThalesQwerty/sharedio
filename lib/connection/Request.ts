import { ClientListeners } from ".";

export interface Request {
    action: keyof ClientListeners;
}

export interface AuthRequest extends Request {
    token: string | null;
}

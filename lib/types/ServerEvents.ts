import { User } from "../schema";
import { EventOverloads } from "../utils";
import { SharedIORequest } from '../connection';

type ConnectionHandler = (user: User) => void;
type DisconnectionHandler = (user: User) => void;
type MessageHandler = (user: User, message: SharedIORequest) => void;
type TickHandler = () => void;

export interface ServerListeners {
    connection?: ConnectionHandler[];
    disconnection?: DisconnectionHandler[];
    message?: MessageHandler[];
    tick?: TickHandler[];
    nextTick?: TickHandler[];
}

export interface ServerEventOverloads
    extends EventOverloads<ServerListeners> {
    /**
     * This function will be called whenever an user connects
     */
    (event: "connection", callback: ConnectionHandler): void;

    /**
     * This function will be called whenever an user disconnects
     */
    (event: "disconnection", callback: DisconnectionHandler): void;

    /**
     * This function will be called whenever a message is recieved from an user's websocket client
     */
    (event: "message", callback: MessageHandler): void;

    /**
     * This function will be called every server tick
     */
    (event: "tick", callback: TickHandler): void;

    /**
     * This function will be called in the next server tick
     */
    (event: "nextTick", callback: TickHandler): void;

    /**
     * Adds an event listener
     */
    (event: keyof ServerListeners, callback: Function): void;
}

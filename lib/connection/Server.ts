import { KeyValue, RandomHex } from "../utils";
import { User } from "../schema";
import { Client } from ".";
import WS from "ws";

interface ServerConfig {
  debug?: boolean;
  port?: number;
  //   mainRoom?: typeof Room;
  //   entities: { [k: string]: typeof Entity };
  wsOptions?: KeyValue;

  /**
   * How many ticks will happen per second (default is 64)
   */
  tickRate?: number;

  // on?: {
  //   connection?: (user: User) => void,
  //   disconnection?: (user: User) => void,
  //   message?: (user: User, message: KeyValue) => void,

  //   /**
  //    * This function will be called every server tick
  //    */
  //   tick?: (server: Server) => void|(() => void),
  // },
}

const DEFAULT_PORT = 3000;
const DEFAULT_TICK_RATE = 64;

export class Server {
  static current: Server;

  private ws?: WS.Server;
  private tickIntervalRef: any = undefined;

  public get config() {
    return this._config;
  }
  private _config: ServerConfig;

  private _users: User[] = [];
  public get users() { return this._users };

  /**
   * Server's default room.
   *
   * All users automatically join this room when they connect to the server.
   */
  // public mainRoom: Room;

  /**
   * How many tick events will happen per second
   */
  public get tickRate() {
    return this.config.tickRate ?? DEFAULT_TICK_RATE;
  }

  /**
   * Counts how many ticks have happened since the server started
   */
  public get ticks() {
    return this._ticks;
  }
  private _ticks: number = 0;

  /**
   * Measures the time (in seconds) elapsed since the last server tick
   */
  public get deltaTime() {
    return (new Date().getTime() - this._lastTickTimestamp) / 1000;
  }
  private _lastTickTimestamp: number = 0;

  /**
   * Measures the time (in seconds) elapsed since the initialization of the server
   */
  public get time() {
    return (new Date().getTime() - this._serverStartTimestamp) / 1000;
  }
  private _serverStartTimestamp: number = 0;

  constructor(config: ServerConfig) {
    Server.current = this;

    config.port ??= DEFAULT_PORT;
    config.tickRate ??= DEFAULT_TICK_RATE;

    this._config = config;
  }

  /**
   * Closes the server and disconnects all users
   */
  stop(): Server {
    this.ws?.close();
    clearInterval(this.tickIntervalRef);
    return this;
  }

  /**
   * Initializes the server
   */
  start(): Server {
    const wss = new WS.Server({
      port: this.config.port,
      ...this.config.wsOptions,
    });
    this.ws = wss;

    console.log(`SharedIO server running on port ${this.config.port}`);

    this._serverStartTimestamp = this._lastTickTimestamp = new Date().getTime();

    this.tickIntervalRef = setInterval(() => {
      this._ticks ++;

      this._lastTickTimestamp = new Date().getTime();
    }, 1000 / this.tickRate);

    wss.on("connection", (ws: WS.WebSocket) => {
      const newUser = new User(
        new Client(ws, this),
        this
      );

      this._users.push(newUser);

      newUser.client.send({
        userId: newUser.id,
        token: newUser.token
      });

      ws.on("close", () => {
        this._users = this._users.filter(user => user.id !== newUser.id);
      })
    });

    return this;
  }
}

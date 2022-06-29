import { Channel } from "./Channel";
import { Input } from "../types/Input";
import { Client } from "./Client";
import { Server } from "./Server";

export class Router {
    public get server() {
        return this._server;
    }

    constructor (private _server: Server) {

    }

    public handle(input: Input, client: Client) {
        const { user } = client;

        switch (input.type) {
            // case "auth": {
            //     client.emit("auth", {
            //         request: input,
            //     });
            //     // client.sendPing();
            //     break;
            // }
            // case "pong": {
            //     // this.sendPing(input);
            //     break;
            // }
            case "write": {
                if (user) {
                    const entity = this.server.findEntity(input.data.entityId);

                    if (entity && user.in(entity.channel)) {
                        Channel.getIOQueue(entity.channel).addInput({
                            ...input,
                            client,
                            data: {
                                entity,
                                properties: input.data.properties
                            }
                        });
                        // user.action.write(entity, input.data.properties);
                    }
                }
                break;
            }
            case "call": {
                if (user) {
                    const entity = this.server.findEntity(input.data.entityId);

                    if (entity && user.in(entity.channel)) {
                        Channel.getIOQueue(entity.channel).addInput({
                            ...input,
                            client,
                            data: {
                                entity,
                                methodName: input.data.methodName,
                                parameters: input.data.parameters
                            }
                        });
                        // user.action.call(
                        //     entity as any,
                        //     input.data.methodName,
                        //     input.data.parameters,
                        // );
                    }
                }
                break;
            }
            // default: {
            //     this.emit("message", { input });
            //     break;
            // }
        }
    }
}
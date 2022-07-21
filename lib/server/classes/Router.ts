import { Channel } from "./Channel";
import { ChannelInput, Input } from "../types/Input";
import { Client } from "./Client";
import { Server } from "./Server";
import { ChannelOutput } from "../types/Output";
import { Entity } from "../../entity";
import { User } from "../../user";

export class Router {
    public get server() {
        return this._server;
    }

    constructor (private _server: Server) {

    }

    public handle(input: Input, client: Client) {
        const { user } = client;
        if (!user) return;

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
            case "write":
            case "call": {
                if (user) {
                    const channel = this.server.findChannel(input.channel);

                    if (channel && user.in(channel)) {
                        const entity = channel.findEntity(input.data.entity);

                        if (entity) {
                            Channel.getIOQueue(entity.channel).addInput({
                                ...input,
                                routed: {
                                    client,
                                    entity,
                                    channel,
                                    user: client.user as User,
                                }
                            });
                        }
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
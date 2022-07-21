import { Entity } from "../../sharedio";
import { RandomHex } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { ChannelOutput, ChannelInput, Routed } from "../../sharedio";
import { Channel } from "../../sharedio";
import { WriteOutput } from "../types/Output";

/**
 * This class is specialized in storing I/Os in a queue and executing them every server sync
 */
export class Queue {
    public get channel() {
        return this._channel;
    }

    public get output() {
        return this._output;
    }
    private _output: ChannelOutput[] = [];

    public get input() {
        return this._input;
    }
    private _input: Routed<ChannelInput>[] = [];

    /**
     * Lists which entities have changes that haven't been sent to the users yet
     */
    public get entities() {
        return this._entities;
    }
    private _entities:KeyValue<Entity> = {};

    /**
     * Sends the current changes to the users and clears the update queue
     */
    public broadcast() {
        return this.runOutput();
    }

    public sync() {
        this.runInput();
        this.runOutput();
    }

    /**
     * Adds a new entry for output queue
     * @param output
     */
    public addOutput(output: Omit<ChannelOutput, "id">) {
        this._output.push({
            ...output,
            id: RandomHex(16)
        } as ChannelOutput);
    }

    /**
     * Adds a new entry for input queue
     * @param input
     */
     public addInput(input: Routed<ChannelInput>) {
        this._input.push({
            ...input,
            id: input.id || RandomHex(16)
        } as Routed<ChannelInput>);
    }

    /**
     * Broadcasts the creation of a new entity to users
     * @param entity
     */
    public addEntity(entity: Entity) {
        if (entity.in(this.channel)) {
            for (const user of this._channel.users) {
                user.getChannelView(this.channel)?.render(entity);
            }
        }
    }

    /**
     * Broadcasts the deletion of an entity to users
     * @param entity
     */
     public removeEntity(entity: Entity) {
        if (entity.in(this.channel)) {
            for (const user of this._channel.users) {
                user.getChannelView(this.channel)?.hide(entity);
            }
        }
    }

    /**
     * Sends the current changes to the users and clears the update queue
     */
    public runOutput() {
        // Simplifies output list in order to prevent multiple "write" events for the same entity
        const reducedOutput = this._output.reduce((queue, output) => {
            const sameEntity = queue.find(possibleOutput => {
                const { data, type } = possibleOutput as WriteOutput;
                return type === "write" && type === output.type && data.entity === output.data.entity;
            }) as WriteOutput|undefined;

            if (sameEntity) {
                sameEntity.data.properties = {
                    ...sameEntity.data.properties,
                    ...(output as WriteOutput).data.properties
                }
                return queue;
            }

            queue.push(output);
            return queue;
        }, [] as ChannelOutput[]);


        for (const output of reducedOutput) {
            if (output.hidden?.private) {
                const user = output.hidden?.client?.user;

                if (user?.in(this.channel)) {
                    if (output.type === "write") user.getChannelView(this.channel)?.handleOutput(output);
                    else user.send(output);
                }
            } else {
                for (const user of this.channel.users) {
                    // It's not necessary to broadcast an output to the user who caused it
                    if (!output.hidden?.client?.user?.is(user)) {

                        if (output.type === "write") user.getChannelView(this.channel)?.handleOutput(output);
                        else user.send(output);
                    }
                }
            }
        }

        this._output = [];
    }

    public runInput() {
        for (const input of this._input) {
            const user = input.routed.user;
            const entity = input.routed.entity;

            if (entity) {
                switch (input.type) {
                    case "write": {
                        Entity.lastClient = input.routed.client || null;
                        user?.action.write(entity, input.data.properties);
                        break;
                    }
                    case "call": {
                        Entity.lastClient = input.routed.client || null;
                        const returnedValue = user?.action.call<any>(entity, input.data.methodName, input.data.parameters);

                        if (returnedValue !== undefined) {

                            this.addOutput({
                                type: "return",
                                data: {
                                    inputId: input.id,
                                    returnedValue
                                },
                                channel: entity.channel,
                                hidden: {
                                    client: input.routed.client,
                                    private: true
                                }
                            });
                        }
                        break;
                    }
                }
            }
        }

        this._input = [];
    }

    public constructor(private _channel: Channel) {
        // setInterval(() => this.runOutput(), 1000);
    }
}
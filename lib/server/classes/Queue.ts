import { Entity, RawEntity } from "../../sharedio";
import { RandomHex } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { ChannelOutput, AssignedChannelOutput, RoutedChannelInput, WriteInput } from "../../sharedio";
import { RawChannel } from "../../sharedio";
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
    private _output: (ChannelOutput|AssignedChannelOutput)[] = [];

    public get input() {
        return this._input;
    }
    private _input: RoutedChannelInput[] = [];

    /**
     * Lists which entities have changes that haven't been sent to the users yet
     */
    public get entities() {
        return this._entities;
    }
    private _entities:KeyValue<RawEntity> = {};

    /**
     * Sends the current changes to the users and clears the update queue
     */
    public broadcast() {
        return this.runOutput();

        for (const user of this.channel.users) {
            for (const entityId in this._entities) {
                const entity = this._entities[entityId];

                user.view.render(entity);
            }
            user.view.update();
        }

        this._entities = {};
    }

    public sync() {
        this.runInput();
        this.runOutput();
    }

    /**
     * Adds a new entry for output queue
     */
    public addOutput(output: Omit<ChannelOutput, "id">) {
        this._output.push({
            ...output,
            id: RandomHex(16)
        } as ChannelOutput);
    }

    /**
     * Adds a new entry for input queue
     */
     public addInput(input: Omit<RoutedChannelInput, "id">) {
        this._input.push({
            ...input,
            id: RandomHex(16)
        } as RoutedChannelInput);
    }

    /**
     * Sends the current changes to the users and clears the update queue
     */
    public runOutput() {
        // Simplifies output list in order to prevent multiple "write" events for the same entity
        const reducedOutput = this._output.reduce((queue, output) => {
            const sameEntity = queue.find(possibleOutput => {
                const { data, type } = possibleOutput as WriteOutput;
                return type === "write" && type === output.type && data.entityId === output.data.entityId;
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
        }, [] as (ChannelOutput|AssignedChannelOutput)[]);


        for (const output of reducedOutput) {
            console.log("output client", output.client, output.data);
            if (output.private) {
                const user = output.client?.user;

                if (user?.in(this.channel)) {
                    if (output.type === "write") user.view.handleOutput(output);
                    else user.send(output);
                }
            } else {
                for (const user of this.channel.users) {
                    // It's not necessary to broadcast an output to the user who caused it
                    if (!output.client?.user?.is(user)) {

                        if (output.type === "write") user.view.handleOutput(output);
                        else user.send(output);
                    }
                }
            }
        }

        this._output = [];
    }

    public runInput() {
        for (const input of this._input) {
            const user = input.client.user;
            const entity = input.data.entity;

            if (entity) {
                switch (input.type) {
                    case "write": {
                        Entity.lastClient = input.client || null;
                        user?.action.write(entity, input.data.properties);
                        break;
                    }
                    case "call": {
                        const returnedValue = user?.action.call<any>(entity, input.data.methodName, input.data.parameters);

                        if (returnedValue !== undefined) {
                            this.addOutput({
                                type: "return",
                                data: {
                                    inputId: input.id,
                                    returnedValue
                                },
                                client: input.client,
                                private: true
                            });
                        }
                        break;
                    }
                }
            }
        }

        this._input = [];
    }

    public constructor(private _channel: RawChannel) {
        setInterval(() => this.runOutput(), 1000);
    }
}
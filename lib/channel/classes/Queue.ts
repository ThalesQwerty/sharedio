import { RawEntity } from "../../sharedio";
import { RandomHex } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { ChannelOutput, ChannelInput, WriteInput } from "../../sharedio";
import { RawChannel } from "../../sharedio";

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
    private _input: ChannelInput[] = [];

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
     public addInput(input: Omit<ChannelInput, "id">) {
        this._input.push({
            ...input,
            id: RandomHex(16)
        } as ChannelInput);
    }

    /**
     * Sends the current changes to the users and clears the update queue
     */
    public runOutput() {

        // Simplifies output list in order to prevent multiple "write" events for the same entity
        const reducedOutput = this._output.reduce((queue, output) => {
            const sameEntity = queue.find(({data, type}) => type === "write" && type === output.type && data.entityId === output.data.entityId) as WriteInput|undefined;

            if (sameEntity) {
                sameEntity.data.properties = {
                    ...sameEntity.data.properties,
                    ...(output as WriteInput).data.properties
                }
                return queue;
            }

            queue.push(output);
            return queue;
        }, [] as ChannelOutput[]);

        for (const user of this.channel.users) {
            for (const output of reducedOutput) {
                // It's not necessary to broadcast an output to the user who caused it
                if (!output.user?.is(user)) {
                    user.client.send(output);
                }
            }
        }

        this._output = [];
    }

    public constructor(private _channel: RawChannel) {
        setInterval(() => this.runOutput(), 1000);
    }
}
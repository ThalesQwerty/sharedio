import { User, Entity, Rules, EntityDefaultAttributeName } from ".";
import { KeyValue, SerializedEntity } from "../types";
import { Difference } from "../utils";
import * as _ from "lodash";

/**
 * Class specialized in serializing entities as JSON and sending them to users
 */
export class View {
    /**
     * Who is viewing?
     */
    public get user() {
        return this._user;
    }
    private _user: User;

    /**
     * Returns a JSON that represents what the user is viewing right now
     */
    public get current() { return this._current };
    private _current: KeyValue = {};

    /**
     * Returns a JSON that represents what the user will view in the next server tick
     */
    public get next() { return this._next };
    private _next: KeyValue = {};

    constructor(viewer: User) {
        this._user = viewer;
    }

    /**
     * Serializes all visible entities and sends them as JSON to the user
     */
     public update() {
        this.reset();
        this.user.server.entities.forEach(entity => {
            this._next[entity.id] = this.serialize(entity);
        })

        const difference = Difference(this._current, this._next);

        if (difference.add || difference.remove) {
            this.user.client.send({
                action: "view",
                ...difference
            })
        }

        this._current = _.cloneDeep(this._next);
    }

    /**
     * Clears the current view
     */
    public reset() {
        this._next = {};
    }

    /**
     * Returns a serialized version of an entity, that can be sent as a JSON to the user
     */
    public serialize(
        entity: Entity
    ): SerializedEntity {
        const clone = Entity.clone(entity);

        const serialized: SerializedEntity = {
            owned: false,
            id: "",
            state: {},
            actions: [],
        };

        function removeAttribute(name: string) {
            delete (clone as any)[name];
            delete (clone as any)["_" + name];
        }

        for (const defaultAttribute of Entity.defaultAttributes) {
            switch (defaultAttribute) {
                case "id":
                    serialized.id = clone.id;
                    break;
                case "owner":
                    serialized.owned =
                        clone.owner?.id && clone.owner.is(this.user)
                            ? true
                            : false;
                    break;
            }
            removeAttribute(defaultAttribute);
        }

        for (const attributeName in clone) {
            if (
                Entity.defaultAttributes.indexOf(
                    attributeName as EntityDefaultAttributeName,
                ) < 0
            ) {
                const value = (clone as any)[attributeName];
                const rules =
                    Rules.from(entity)[attributeName] ??
                    Rules.default;

                if (
                    rules.visibility === "public" ||
                    (rules.visibility === "private" &&
                        serialized.owned)
                ) {
                    if (typeof value === "function")
                        serialized.actions.push(attributeName);
                    else serialized.state[attributeName] = value;
                }
            }
        }

        return serialized;
    }
}

import { Entity, EntityAttributeName, UserRoles, Client } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { User } from "../../sharedio";

/**
 * Class specialized in executing users' actions in the server
 */
export class Action {
    private _user: User;

    constructor(user: User) {
        this._user = user;
    }

    /**
     * Attempts to create a new entity
     */
    public create() {}

    /**
     * Attempts to delete an entity
     */
    public delete() {}

    /**
     * Attempts to write values into an entity's attributes
     */
    public write<EntityType extends Entity>(
        entity: EntityType,
        values: KeyValue<any, EntityAttributeName<EntityType>>,
        debug: boolean = false
    ) {
        const viewed = this._user.getEntityView(entity);
        if (!viewed) return false;

        debug && console.log("write", Entity.printable(entity), values);

        for (const _attributeName in values) {
            const attributeName =
                _attributeName as EntityAttributeName<EntityType>;
            const newValue = (values as any)[attributeName];

            const authorized = this._user.can("input", entity, attributeName);

            if (authorized && newValue !== undefined) {
                entity[attributeName] = newValue;
                viewed.state[attributeName] = newValue;
            } else {
                debug && console.log(`can't write into "${attributeName}"`);
                return false;
            }
        }

        debug && console.log("-->", Entity.printable(entity));
        return true;
    }

    /**
     * Attempts to call an entity's method
     */
    public call<EntityType extends Entity>(
        entity: EntityType,
        methodName: EntityAttributeName<EntityType>,
        parameters?: unknown[],
    ): unknown {
        const authorized = this._user.can("input", entity, methodName);

        if (
            authorized &&
            typeof entity[methodName] === "function"
        ) {
            const method = entity[methodName] as any as (...args: any[]) => unknown;
            const returnedValue = parameters ? method.call(entity, ...parameters) : method.call(entity);  //, this._user);

            return returnedValue;
        }
    }
}

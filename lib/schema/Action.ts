import { User, Entity } from ".";
import { Rules } from ".";
import { EntityAttributeName, KeyValue } from "../types";

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
    public create() {

    }

    /**
     * Attempts to delete an entity
     */
     public delete() {

    }

    /**
     * Attempts to write values into an entity's attributes
     */
    public write<EntityType extends Entity>(entity: EntityType, values: KeyValue<any, EntityAttributeName<EntityType>>) {
        console.log("write", Entity.printable(entity), values);
        const viewed = this._user.view.current[entity.id];

        for (const _attributeName in values) {
            const attributeName = _attributeName as EntityAttributeName<EntityType>;
            const newValue = (values as any)[attributeName];

            if (newValue !== undefined) {
                const rulesVerification = Rules.verify(this._user, "write", entity, attributeName);
                if (rulesVerification) {
                    entity[attributeName] = newValue;
                    viewed.state[attributeName] = newValue;
                }
            }
        }
        console.log("-->", Entity.printable(entity));
    }
}
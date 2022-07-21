import { Client, Server } from "../../sharedio";
import { Channel } from "../../sharedio";
import { HasId, HasEvents, ObjectTransform } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { EntityReservedAttributeName, EntityClassName } from "../../sharedio";
import { PrintableEntity } from "../../sharedio";
import { Entity } from "../../sharedio";

export abstract class EntityStaticMembers extends HasId {
    public static get lastClient() { return this._lastClient };
    public static set lastClient(newValue) {
        this._lastClient = newValue || null;
        if (newValue) process.nextTick(() => {
            this._lastClient = null;
        })
    }
    private static _lastClient: Client|null = null;

    public static ID_SEPARATOR = ".";
    /**
     * Lists the names of the reserved entity attributes. Those names cannot be used to create custom attributes.
     */
    public static get reservedAttributes(): EntityReservedAttributeName[] {
        if (!this._reservedAttributes) {
            let array = [
                ...Object.getOwnPropertyNames(
                    new Entity({ channel: new Channel({ server: Server.dummy }), dummy: true }),
                ),
                ...Object.getOwnPropertyNames(new HasEvents()),
                ...Object.getOwnPropertyNames(Entity.prototype),
                ...Object.getOwnPropertyNames(HasId.prototype),
                ...Object.getOwnPropertyNames(HasEvents.prototype),
            ] as EntityReservedAttributeName[];

            array = array.filter((attributeName, index) => array.indexOf(attributeName) === index);

            this._reservedAttributes = array;
        }

        return this._reservedAttributes;
    }
    private static _reservedAttributes?: EntityReservedAttributeName[] = undefined;

    public static isDefaultAttribute(attributeName: string): boolean {
        for (const reservedAttributeName of this.reservedAttributes) {
            if (attributeName === reservedAttributeName)
                return true;
        }
        return false;
    }

    /**
     * Lists all custom attributes from an entity
     */
    public static attributes<EntityType extends Entity>(entity: EntityType) {
        return Object.getOwnPropertyNames(entity).filter(name => !Entity.isDefaultAttribute(name));
    }

    /**
     * Lists all custom properties from an entity
     */
    public static properties<EntityType extends Entity>(entity: EntityType) {
        const propertyDescriptors = Object.getOwnPropertyDescriptors(entity.constructor.prototype);
        const propertyNames: string[] = [];

        for (const propertyName in propertyDescriptors) {
            let propertyDescriptor = propertyDescriptors[propertyName];

            if ((!!propertyDescriptor.get || !!propertyDescriptor.set) && !Entity.isDefaultAttribute(propertyName)) propertyNames.push(propertyName);
        }
        return propertyNames;
    }

    /**
     * Lists all custom methods from an entity
     */
    public static methods<EntityType extends Entity>(entity: EntityType) {
        const methodDescriptors = Object.getOwnPropertyDescriptors(entity.constructor.prototype);
        const methodNames: string[] = [];

        for (const methodName in methodDescriptors) {
            let methodDescriptor = methodDescriptors[methodName];

            if ((!methodDescriptor.get && !methodDescriptor.set) && !Entity.isDefaultAttribute(methodName)) methodNames.push(methodName);
        }
        return methodNames;
    }

    public static get className() {
        return this.prototype.constructor.name;
    }

    public static getClassName<
        EntityType extends Entity,
        T extends EntityClassName | EntityType,
        >(entityOrType: T) {
        if (typeof entityOrType === "string") return entityOrType;
        else if (entityOrType instanceof Entity)
            return (entityOrType as Entity).type;
        else return (entityOrType as typeof Entity).className;
    }

    /**
     * Finds an entity by its ID.
     *
     * Returns null if it fails to find an entity.
     */
    public static find(entityId: string): Entity | null {
        return HasId.find(entityId) as Entity;
    }

    /**
     * Clones an entity
     */
    public static clone(entity: Entity): Entity {
        return ObjectTransform.clone(entity);
    }


    public static log<EntityType extends Entity>(entity: EntityType) {
        const printable = this.printable(entity);
        console.log(printable);
        return printable;
    }

    /**
     * Generates a simplified key-value pair that represents the entity. Useful for printing things on the console.
     */
    public static printable<EntityType extends Entity>(
        entity: EntityType,
    ): PrintableEntity<EntityType> {
        const clone = Entity.clone(entity);
        const simplified: KeyValue = { ...clone };

        for (const reservedAttribute of Entity.reservedAttributes) {
            const value = (entity as any)[reservedAttribute];

            if (value instanceof HasId) {
                simplified[reservedAttribute] = value.id;
            } else {
                simplified[reservedAttribute] = value;
            }
        }

        for (const reservedAttribute of Entity.reservedAttributes) {
            const value = (entity as any)[reservedAttribute];

            switch (reservedAttribute) {
                case "id":
                case "type":
                    simplified[reservedAttribute] = value;
                    break;
                default:
                    if (value instanceof HasId) {
                        simplified[reservedAttribute] = value.id;
                    } else {
                        delete simplified[reservedAttribute];
                    }
                    break;
            }

            delete simplified["_" + reservedAttribute];
        }

        return simplified as PrintableEntity<EntityType>;
    }
}
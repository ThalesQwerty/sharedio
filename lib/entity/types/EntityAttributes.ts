import { Channel, EntityBuiltinFlagName } from "../../sharedio";
import { HasId } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { Entity } from "../../sharedio";

export type EntityReservedAttributeName =
    | keyof Entity
    | keyof HasId
    | keyof Channel
    | "resetId"
    | "_listeners"
    | "emit"
    | "bind"
    | "constructor"
    | "removeAllListeners";

export type EntityAttributeName<EntityType extends Entity> = Exclude<
    keyof EntityType,
    EntityReservedAttributeName | number | symbol
>;

export type EntityFlagName<EntityType extends Entity = Entity> = Exclude<{
        [key in keyof EntityType]: EntityType[key] extends boolean ? key : never
    }[keyof EntityType],
    EntityReservedAttributeName | number | symbol
>|EntityBuiltinFlagName;

export type EntityAttributeType = "any" | "number" | "string" | "boolean" | "array" | "object" | "function";

export type EntitySetAcessorName<EntityType extends Entity> = `_${EntityAttributeName<EntityType>}` | `set${Capitalize<EntityAttributeName<EntityType>>}`;

export type EntityClassName = typeof Entity | string;

type AttributePrimitives =
    | string
    | number
    | boolean
    | null
    | undefined
    | HasId;
export type EntityAttribute =
    | AttributePrimitives
    | AttributePrimitives[]
    | KeyValue<AttributePrimitives | AttributePrimitives[]>;

export type EntityMethod = Function;

export type EntityWithAttribute<name extends string> = Entity & {
    [key in name]: any;
};


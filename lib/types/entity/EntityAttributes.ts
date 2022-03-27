import { Channel, Entity, SharedChannel, User } from "../../schema";
import { KeyValue, Letter } from "..";
import { HasEvents, HasId } from "../../utils";
import { Server } from "../../connection";

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

export type EntityAttributeType = "any"|"number"|"string"|"boolean"|"array"|"object"|"function";

export type EntitySetAcessorName<EntityType extends Entity> = `_${EntityAttributeName<EntityType>}`|`set${Capitalize<EntityAttributeName<EntityType>>}`;

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


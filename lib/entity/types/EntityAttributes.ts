import { RawChannel } from "../../sharedio";
import { HasId } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { RawEntity } from "../../sharedio";

export type EntityReservedAttributeName =
    | keyof RawEntity
    | keyof HasId
    | keyof RawChannel
    | "resetId"
    | "_listeners"
    | "emit"
    | "bind"
    | "constructor"
    | "removeAllListeners";

export type EntityAttributeName<EntityType extends RawEntity> = Exclude<
    keyof EntityType,
    EntityReservedAttributeName | number | symbol
>;

export type EntityAttributeType = "any"|"number"|"string"|"boolean"|"array"|"object"|"function";

export type EntitySetAcessorName<EntityType extends RawEntity> = `_${EntityAttributeName<EntityType>}`|`set${Capitalize<EntityAttributeName<EntityType>>}`;

export type EntityClassName = typeof RawEntity | string;

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

export type EntityWithAttribute<name extends string> = RawEntity & {
    [key in name]: any;
};


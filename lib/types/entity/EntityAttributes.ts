import { Entity, User } from "../../schema";
import { KeyValue } from "..";
import { HasEvents, HasId } from "../../utils";

export type EntityReservedAttributeName =
    | keyof Entity
    | keyof HasId
    | "resetId"
    | "_listeners"
    | "emit"
    | "constructor"
    | "removeAllListeners"
    | "_Constructor";

export type EntityAttributeName<EntityType extends Entity> = Exclude<keyof EntityType, EntityReservedAttributeName|number|symbol>

type AttributePrimitives = string | number | boolean | null | undefined | HasId;
export type EntityAttribute = AttributePrimitives | AttributePrimitives[] | KeyValue<AttributePrimitives|AttributePrimitives[]>;

export type EntityMethod = Function;

export type EntityWithAttribute<name extends string> = Entity&{[key in name]: any};

export type EntityGetAccessor = (
    /**
     * Who is trying to read this property?
     *
     * Value will be undefined if property is being read by the server
     */
    user?: User
) => any;

export type EntitySetAccessor = <ValueType = any>(
    /**
     * The value that is being written into this attribute
     */
    value?: ValueType,

    /**
     * Who is trying to read this property?
     *
     * Value will be undefined if property is being read by the server
     */
    user?: User
) => void;
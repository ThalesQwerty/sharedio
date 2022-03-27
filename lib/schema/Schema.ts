import { EntityAttributeName, EntityAttributeType, EntitySchema, EntitySchemaAttribute } from "../types";
import { ExtractDependencies } from "../utils";
import { Entity } from "./Entity";
import { Server } from "../connection";

export function Schema<EntityType extends Entity>(entityClass: typeof Entity, privateSchema?: EntitySchema<EntityType>) {
    if (!privateSchema) {
        const dummy = new entityClass({ server: Server.dummy, channel: Server.dummy.mainChannel });
        const attributeList = Entity.attributes(dummy);
        dummy.delete();

        const getType = (object: any, attributeName: string) => {
            const type = Reflect.getMetadata(
                "design:type",
                object,
                attributeName
            )?.name.toLowerCase() as EntityAttributeType;

            return type === "any" ? undefined : type;
        }

        // Workaround private access modifier
        privateSchema = (entityClass as any)["_schema"] = {
            className: dummy.type,
            attributes: {} as any
        };

        const defaultSchema: EntitySchemaAttribute<EntityType> = {
            name: "" as EntityAttributeName<EntityType>,
            type: "any",
            initialValue: undefined,
            dependencies: [],
            output: "",
            input: "",
            get: false,
            set: false,
        };

        for (const _attributeName of attributeList) {
            const attributeName = _attributeName as EntityAttributeName<EntityType>;
            const initialValue = (dummy as any)[attributeName];
            privateSchema.attributes[attributeName] = {
                ...defaultSchema,
                name: attributeName,
                type: getType(dummy, attributeName) ?? typeof initialValue,
                initialValue
            }
        }

        const computedAttributes = Object.getOwnPropertyDescriptors(entityClass.prototype);

        for (const _attributeName in computedAttributes) {
            const attributeName = _attributeName as EntityAttributeName<EntityType>;
            if (attributeName !== "constructor") {
                const propertyDescriptor = computedAttributes[attributeName];
                const dependencies = ExtractDependencies(entityClass as typeof Entity, attributeName) as EntityAttributeName<EntityType>[];
                const initialValue = (dummy as any)[attributeName];

                privateSchema.attributes[attributeName] = {
                    ...defaultSchema,
                    name: attributeName,
                    type: getType(entityClass.prototype, attributeName) ?? typeof initialValue,
                    initialValue,
                    get: !!propertyDescriptor.get,
                    set: !!propertyDescriptor.set,
                    dependencies
                }
            }
        }
    }

    return privateSchema as EntitySchema<EntityType>;
}
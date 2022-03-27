import fs from "fs";
import path from "path";
import {
    ClientSchemaConfig,
    EntityAttributeRules,
    EntityRoleName,
    EntityRuleSchema,
    EntitySchema,
    EntityVariantName,
    KeyValue,
} from "../types";
import { exec } from "child_process";
import { StringTransform } from "../utils";

export function generateClientSchema(
    schema: KeyValue<EntitySchema<any>, string>,
    config: ClientSchemaConfig,
) {
    const newPath = path.join(
        config.path ?? ".",
        config.fileName ?? "schema.ts",
    );

    let fileContent: string = `
    /*
        This file has been generated automatically by SharedIO.
        Please don't edit it unless you're 100% sure of what you're doing.
    */

    `;

    type EntityVariantNameCombo =
        | EntityVariantName
        | `${EntityVariantName}.${EntityVariantName}`
        | `${EntityVariantName}.${EntityVariantName}.${EntityVariantName}`
        | `${EntityVariantName}.${EntityVariantName}.${EntityVariantName}.${EntityVariantName}`;

    const interfaceNames: Partial<
        KeyValue<string, EntityVariantNameCombo>
    > = {
        all: "Default",

        "all.host": "Host",
        "all.owner": "Owner",
        "all.inside": "Inside",

        "all.host.inside": "HostInside",
        "all.inside.owner": "OwnerInside",
        "all.host.owner": "OwnerHost",

        "all.host.inside.owner": "OwnerHostInside",
    };

    function isVariantBuiltin(variantName: string) {
        return (
            variantName === "all" ||
            variantName === "host" ||
            variantName === "inside" ||
            variantName === "owner"
        );
    }

    function unionType(entityName: string) {
        return "Variants";
    }

    const libName = "../../lib"; // "sharedio-client";

    fileContent += `import type { SharedIOSchema, EntityListSchema } from "${libName}";

    namespace Entity {
        interface Base<EntityType extends string> {
            readonly id: \`Entity_\${string}\`;
            readonly type: EntityType;

            /**
             * Does the user own this entity?
             */
            readonly owned: boolean;

            /**
             * Does the user host this entity?
             */
            readonly hosted: boolean;

            /**
             * Is the user inside this channel?
             */
            readonly inside: boolean;
        }

        ${Object.keys(interfaceNames)
            .map((entityVariantCombo) =>
                createBaseEntityInterface(
                    entityVariantCombo as EntityVariantNameCombo,
                ),
            )
            .join(" ")}
    };
    `;

    for (const entityType in schema) {
        const entitySchema = schema[entityType];

        const { userRoles } = schema;

        const interfaceNamesWithRoles: KeyValue = {
            ...interfaceNames,
        };

        for (const role in userRoles) {
            for (const key in interfaceNamesWithRoles) {
                const interfaceName = interfaceNamesWithRoles[key];

                const capitalizedVariantName = StringTransform.capitalize(role);

                interfaceNamesWithRoles[`${key}.${role}`] =
                    interfaceName !== "Default"
                        ? `${interfaceName}${capitalizedVariantName}`
                        : capitalizedVariantName;
            }
        }

        fileContent += createEntityNamespace(
            entityType,
            Object.keys(interfaceNamesWithRoles).map((key) =>
                createEntityInterface(
                    entityType,
                    entitySchema,
                    {
                        current: key.split(
                            ".",
                        ) as EntityVariantName[],
                        currentBuiltin: key
                            .split(".")
                            .filter((key) =>
                                isVariantBuiltin(key),
                            ) as EntityVariantName[],
                        custom: Object.keys(
                            userRoles,
                        ) as EntityVariantName[],
                    },
                    interfaceNamesWithRoles,
                ),
            ),
            interfaceNamesWithRoles,
        );
    }

    fileContent += `
    export interface ${
        config.interfaceName ?? "Schema"
    } extends SharedIOSchema {
        ${Object.keys(schema)
            .map((entityType) => createEntitySchemaList(entityType))
            .join(";")}
    }`;

    function createBaseEntityInterface(
        entityVariantCombo: EntityVariantNameCombo,
    ) {
        const entityVariants = entityVariantCombo.split(
            ".",
        ) as EntityVariantName[];
        const interfaceName = interfaceNames[entityVariantCombo];

        return `
        export interface ${interfaceName}<EntityType extends string> extends Base<EntityType> {
            readonly owned: ${!!entityVariants.find(
                (entityVariant) => entityVariant === "owner",
            )};
            readonly hosted: ${!!entityVariants.find(
                (entityVariant) => entityVariant === "host",
            )};
            readonly inside: ${!!entityVariants.find(
                (entityVariant) => entityVariant === "inside",
            )};
        }`;
    }

    function createEntityNamespace(
        entityType: string,
        entityInterfaces: string[],
        interfaceNamesWithVariants: KeyValue<
            string,
            EntityVariantNameCombo
        >,
    ) {
        return `
        export namespace ${entityType} {
            ${entityInterfaces.join(" ")}

            export type ${unionType(entityType)} = ${Object.keys(
            interfaceNamesWithVariants,
        )
            .map(
                (entityVariantCombo) =>
                    interfaceNamesWithVariants[
                        entityVariantCombo as EntityVariantNameCombo
                    ],
            )
            .join("|")};
        }
        `;
    }

    function createEntityInterface(
        entityType: string,
        entityRules: EntitySchema,
        variants: {
            current: EntityVariantName[];
            currentBuiltin: EntityVariantName[];
            custom: EntityVariantName[];
        },
        interfaceNamesWithVariants: KeyValue<
            string,
            EntityVariantNameCombo
        >,
    ) {
        const key = variants.current.join(
            ".",
        ) as EntityVariantNameCombo;
        const builtinKey = variants.currentBuiltin.join(
            ".",
        ) as EntityVariantNameCombo;

        const interfaceName = interfaceNamesWithVariants[key];
        const extendedInterfaceName = interfaceNames[builtinKey];

        return interfaceName
            ? `
        export interface ${interfaceName} extends Entity.${extendedInterfaceName}<"${entityType}"> {
            ${variants.custom
                .map(
                    (variant) =>
                        `readonly ${variant}: ${
                            variants.current.find(
                                (v) => v === variant,
                            )
                                ? "true"
                                : "false"
                        }`,
                )
                .join(";")}

            ${Object.keys(entityRules)
                .map((attributeName) =>
                    createEntityInterfaceMember(
                        entityType,
                        attributeName,
                        entityRules[attributeName],
                        variants.current,
                    ),
                )
                .filter((content) => content)
                .join(";")}
        }
        `
            : "";
    }

    function createEntityInterfaceMember(
        entityType: string,
        attributeName: string,
        attributeRules: EntityAttributeRules,
        userRoles: EntityRoleName[],
    ) {
        const readable =
        if (!readable) return "";

        const writable = Rules.verify(
            entityVariants,
            "write",
            entityType,
            attributeName,
            false
        );
        const { isCallable, valueType } = attributeRules;
        const type = isCallable ? `() => void` : `${valueType}`;

        return `${
            writable ? "" : "readonly"
        } ${attributeName}: ${type}`;
    }

    function createEntitySchemaList(entityType: string) {
        return `${entityType}: EntityListSchema<${entityType}.${unionType(entityType)}>`;
    }

    fs.writeFileSync(newPath, fileContent);

    exec(`npx prettier --write ${newPath}`, () => {
        console.log(
            `Client schema generated successfully at ${newPath}`,
        );
    });
}

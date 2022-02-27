import fs from "fs";
import path from "path";
import { ClientSchemaConfig, EntityAttributeRules, EntityRuleSchema, EntityVariantName, KeyValue } from "../types";
import { exec } from "child_process";
import { Rules } from "..";

export function generateClientSchema(schema: EntityRuleSchema, config: ClientSchemaConfig) {
    const newPath = path.join(config.path ?? ".", config.fileName ?? "schema.ts");

    let fileContent: string = `
    /*
        This file has been generated automatically by SharedIO.
        Please don't edit it unless you're 100% sure of what you're doing.
    */

    `;

    type EntityVariantNameCombo =
        EntityVariantName
        | `${EntityVariantName}.${EntityVariantName}`
        | `${EntityVariantName}.${EntityVariantName}.${EntityVariantName}`
        | `${EntityVariantName}.${EntityVariantName}.${EntityVariantName}.${EntityVariantName}`;

    const interfaceNames: Partial<KeyValue<string, EntityVariantNameCombo>> = {
        "all": "Default",

        "all.isHost": "Host",
        "all.isOwner": "Owner",
        "all.isInside": "Inside",

        "all.isHost.isInside": "HostInside",
        "all.isInside.isOwner": "OwnerInside",
        "all.isHost.isOwner": "OwnerHost",

        "all.isHost.isInside.isOwner": "OwnerHostInside",
    }

    function isVariantBuiltin(variantName: string) {
        return variantName === "all" || variantName === "isHost" || variantName === "isInside" || variantName === "isOwner";
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

        ${Object.keys(interfaceNames).map(
        userRelationCombination => createBaseEntityInterface(userRelationCombination as EntityVariantNameCombo)
    ).join(" ")}
    };
    `;

    for (const entityType in schema) {
        const entitySchema = schema[entityType];

        const variants = { ...Rules.variants(entityType) };

        // @ts-expect-error
        delete variants.all;
        // @ts-expect-error
        delete variants.isHost;
        // @ts-expect-error
        delete variants.isOwner;
        // @ts-expect-error
        delete variants.isInside;

        const interfaceNamesWithVariants: KeyValue = {
            ...interfaceNames
        };

        for (const variantName in variants) {
            for (const key in interfaceNamesWithVariants) {
                const interfaceName = interfaceNamesWithVariants[key];
                interfaceNamesWithVariants[`${key}.${variantName}`] = interfaceName !== "Default" ? `${interfaceName}${variantName.substring(2)}` : variantName.substring(2);
            }
        }

        fileContent += createEntityNamespace(entityType, Object.keys(interfaceNamesWithVariants).map(
            key => createEntityInterface(entityType, entitySchema, {
                current: key.split(".") as EntityVariantName[],
                currentBuiltin: key.split(".").filter(key => isVariantBuiltin(key)) as EntityVariantName[],
                custom: Object.keys(variants) as EntityVariantName[]},
                interfaceNamesWithVariants
            )
        ), interfaceNamesWithVariants);
    }

    fileContent += `
    export interface ${config.interfaceName ?? "Schema"} extends SharedIOSchema {
        ${Object.keys(schema).map(entityType => createEntitySchemaList(entityType)).join(";")}
    }`;

    function createBaseEntityInterface(userRelationCombination: EntityVariantNameCombo) {
        const userRelations = userRelationCombination.split(".") as EntityVariantName[];
        const interfaceName = interfaceNames[userRelationCombination];

        return `
        export interface ${interfaceName}<EntityType extends string> extends Base<EntityType> {
            readonly owned: ${!!userRelations.find(userRelation => userRelation === "isOwner")};
            readonly hosted: ${!!userRelations.find(userRelation => userRelation === "isHost")};
            readonly inside: ${!!userRelations.find(userRelation => userRelation === "isInside")};
        }`;
    }

    function createEntityNamespace(entityType: string, entityInterfaces: string[], interfaceNamesWithVariants: KeyValue<string, EntityVariantNameCombo>) {
        return `
        export namespace ${entityType} {
            ${entityInterfaces.join(" ")}

            export type ${entityType} = ${Object.keys(interfaceNamesWithVariants).map(
            userRelationCombination => interfaceNamesWithVariants[userRelationCombination as EntityVariantNameCombo]
        ).join("|")};
        }
        `;
    }

    function createEntityInterface(entityType: string, entityRules: KeyValue<EntityAttributeRules>, variants: {current: EntityVariantName[], currentBuiltin: EntityVariantName[], custom: EntityVariantName[]}, interfaceNamesWithVariants: KeyValue<string, EntityVariantNameCombo>) {
        const key = variants.current.join(".") as EntityVariantNameCombo;
        const builtinKey = variants.currentBuiltin.join(".") as EntityVariantNameCombo;

        const interfaceName = interfaceNamesWithVariants[key];
        const extendedInterfaceName = interfaceNames[builtinKey];

        return interfaceName ? `
        export interface ${interfaceName} extends Entity.${extendedInterfaceName}<"${entityType}"> {
            ${variants.custom.map(variant =>
                `readonly ${variant}: ${variants.current.find(v => v === variant) ? "true" : "false"}`
            ).join(";")}

            ${Object.keys(entityRules).map(
            attributeName => createEntityInterfaceMember(entityType, attributeName, entityRules[attributeName], variants.current)
        ).filter(content => content).join(";")}
        }
        ` : "";
    }

    function createEntityInterfaceMember(entityType: string, attributeName: string, attributeRules: EntityAttributeRules, userRelations: EntityVariantName[]) {
        const readable = !attributeRules.isVariant && Rules.verify(userRelations, "read", entityType, attributeName);
        if (!readable) return "";

        const writable = Rules.verify(userRelations, "write", entityType, attributeName);
        const { isMethod } = attributeRules;
        const type = isMethod ? "() => void" : "any";

        return `${writable ? "" : "readonly"} ${attributeName}: ${type}`;
    }

    function createEntitySchemaList(entityType: string) {
        return `${entityType}: EntityListSchema<${entityType}.${entityType}>`;
    }

    fs.writeFileSync(newPath, fileContent);

    exec(`npx prettier --write ${newPath}`, () => {
        console.log(`Client schema generated successfully at ${newPath}`)
    });
}

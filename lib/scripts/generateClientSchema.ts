import fs from "fs";
import path from "path";
import { ClientSchemaConfig, EntityAttributeRules, EntityRuleSchema, EntitySubtypeName, KeyValue } from "../types";
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

    type EntityUserRelationCombination =
        EntitySubtypeName
        |`${EntitySubtypeName}.${EntitySubtypeName}`
        |`${EntitySubtypeName}.${EntitySubtypeName}.${EntitySubtypeName}`
        |`${EntitySubtypeName}.${EntitySubtypeName}.${EntitySubtypeName}.${EntitySubtypeName}`;

    const interfaceNames: Partial<KeyValue<string, EntityUserRelationCombination>> = {
        "all": "Default",

        "all.isHost": "Hosted",
        "all.isOwner": "Owned",
        "all.isInside": "Inside",

        "all.isHost.isInside": "HostedInside",
        "all.isInside.isOwner": "OwnedInside",
        "all.isHost.isOwner": "OwnedHosted",

        "all.isHost.isInside.isOwner": "OwnedHostedInside",
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
            userRelationCombination => createBaseEntityInterface(userRelationCombination as EntityUserRelationCombination)
        ).join(" ")}
    };
    `;

    for (const entityType in schema) {
        const entitySchema = schema[entityType];

        fileContent += createEntityNamespace(entityType, Object.keys(interfaceNames).map(
            userRelationCombination => createEntityInterface(entityType, entitySchema, userRelationCombination.split(".") as EntitySubtypeName[])
        ));
    }

    fileContent += `
    export interface ${config.interfaceName ?? "Schema"} extends SharedIOSchema {
        ${Object.keys(schema).map(entityType => createEntitySchemaList(entityType)).join(";")}
    }`;

    function createBaseEntityInterface(userRelationCombination: EntityUserRelationCombination) {
        const userRelations = userRelationCombination.split(".") as EntitySubtypeName[];
        const interfaceName = interfaceNames[userRelationCombination];

        return `
        export interface ${interfaceName}<EntityType extends string> extends Base<EntityType> {
            readonly owned: ${!!userRelations.find(userRelation => userRelation === "isOwner")};
            readonly hosted: ${!!userRelations.find(userRelation => userRelation === "isHost")};
            readonly inside: ${!!userRelations.find(userRelation => userRelation === "isInside")};
        }`;
    }

    function createEntityNamespace(entityType: string, entityInterfaces: string[]) {
        return `
        export namespace ${entityType} {
            ${entityInterfaces.join(" ")}

            export type ${entityType} = ${Object.keys(interfaceNames).map(
                userRelationCombination => interfaceNames[userRelationCombination as EntityUserRelationCombination]
            ).join("|")};
        }
        `;
    }

    function createEntityInterface(entityType: string, entityRules: KeyValue<EntityAttributeRules>, userRelations: EntitySubtypeName[]) {
        const userRelationCombination = userRelations.join(".") as EntityUserRelationCombination;
        const interfaceName = interfaceNames[userRelationCombination];

        return interfaceName ? `
        export interface ${interfaceName} extends Entity.${interfaceName}<"${entityType}"> {
            ${Object.keys(entityRules).map(
                attributeName => createEntityInterfaceMember(entityType, attributeName, entityRules[attributeName], userRelations)
            ).filter(content => content).join(";")}
        }
        ` : "";
    }

    function createEntityInterfaceMember(entityType: string, attributeName: string, attributeRules: EntityAttributeRules, userRelations: EntitySubtypeName[]) {
        const readable = Rules.verify(userRelations, "read", entityType, attributeName);  // attributeRules.accessPolicy.read.find(group => group === userRelation || group === "all") ? true : false;
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


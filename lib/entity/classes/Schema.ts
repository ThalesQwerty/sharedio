import { EntityFlagName, Server, SharedIOError } from "../../sharedio";
import { Channel } from "../../sharedio";
import { ObjectTransform, StringTransform } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { ClientSchemaConfig } from "../../sharedio";
import { ExtractDependencies } from "../../sharedio";
import { EntityAttributeType, EntityAttributeName } from "../../sharedio";
import { EntitySchema, EntitySchemaAttribute } from "../../sharedio";
import { Entity } from "../../sharedio";
import { BuiltinRoles, UserRoles } from "../../sharedio";
import path from "path";
import fs from "fs";
import {exec} from "child_process";
import "reflect-metadata";

export abstract class Schema {
    private static _schemas: KeyValue<EntitySchema<any>, string> = {};

    static get all() {
        return ObjectTransform.clone(this._schemas);
    }

    static generate<EntityType extends Entity = Entity>(entityClass: typeof Entity) {
        const dummy = Entity.dummy(entityClass);
        const attributeList = Entity.attributes(dummy);

        const getType = (object: any, attributeName: string): string | undefined => {
            const type = Reflect.getMetadata(
                "design:type",
                object,
                attributeName
            )?.name.toLowerCase() as EntityAttributeType;

            return type === "object" ? undefined : type;
        }

        const generatedSchema = {
            className: dummy.type,
            userRoles: {},  
            flags: {
                true: {
                    name: "true",
                    value: 0,
                    declared: true,
                    used: false,
                    builtin: true   
                },
                false: {
                    name: "false",
                    value: 0,
                    declared: true,
                    used: false,
                    builtin: true
                },
                owned: {
                    name: "owned",
                    value: 1,
                    declared: true,
                    used: false,
                    builtin: true
                }
            },
            attributes: {} as any
        } as EntitySchema;

        const defaultSchema: EntitySchemaAttribute<EntityType> = {
            name: "" as EntityAttributeName<EntityType>,
            type: "any",
            initialValue: undefined,
            dependencies: [],
            output: "",
            input: "",
            get: false,
            set: false,
            async: false,
            binary: {
                input: [],
                output: [],
            }
        };

        for (const _attributeName of attributeList) {
            const attributeName = _attributeName as EntityAttributeName<EntityType>;
            const initialValue = (dummy as any)[attributeName];
            generatedSchema.attributes[attributeName] = {
                ...ObjectTransform.clone(defaultSchema),
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

                generatedSchema.attributes[attributeName] = {
                    ...ObjectTransform.clone(defaultSchema),
                    name: attributeName,
                    type: getType(entityClass.prototype, attributeName) ?? typeof initialValue,
                    initialValue,
                    get: !!propertyDescriptor.get,
                    set: !!propertyDescriptor.set,
                    dependencies
                }
            }
        }

        this._schemas[entityClass.name] = generatedSchema;

        // Can only execute after the entities' decorators have been executed
        process.nextTick(() => {
            for (const flagName in generatedSchema.flags) {
                const flag = generatedSchema.flags[flagName];
                
                if (!flag.builtin) {
                    if (flag.used && !flag.declared) throw new SharedIOError("flagIsUndeclared", flagName, generatedSchema.className);
                    if (!flag.used && flag.declared) console.warn(`Warning: ${new SharedIOError("flagIsUnused", flagName, generatedSchema.className).message}`);
                }
            }

            this.optimize(generatedSchema as EntitySchema<EntityType>);
        });

        return generatedSchema as EntitySchema<EntityType>;
    }

    /**
     * This function calculates beforehands the access level that each user role has on each property of an entity and then stores this information on its schema
     */
    private static optimize<EntityType extends Entity>(schema: EntitySchema<EntityType>) {
        const numFlags = Object.keys(schema.flags).length - 1;
        const numCombinations = Math.pow(2, numFlags);

        const maxWhitelistLength = Math.max(1, Math.ceil(numCombinations / 2));

        /**
         * It may not be viable to compute flags everytime an user tries to view or interact with an entity,
         * since this computation might take some time.
         *
         * Therefore, SharedIO calculates all possible outcomes beforehand and store the values into the entity schema.
         */
        for (const attributeName in schema.attributes) {
            const attribute = schema.attributes[attributeName as EntityAttributeName<EntityType>];

            // denied combinations
            // the "-1" at the start indicates that this list is a blacklist and not a whitelist
            const blacklist = {
                input: [-1] as number[],
                output: [-1] as number[]
            };

            // allowed combinations
            const whitelist = {
                input: [] as number[],
                output: [] as number[]
            };

            for (let roleCombinationId = 0; roleCombinationId < numCombinations; roleCombinationId++) {
                const currentRoles: string[] = [];

                for (const _flagName in schema.flags) {
                    const flagName = _flagName as EntityFlagName<EntityType>
                    const { value, name } = schema.flags[flagName];
                    if ((roleCombinationId & value) === value) currentRoles.push(name);
                }

                const isInput = UserRoles.test(currentRoles, attribute.input);
                const isOutput = isInput || UserRoles.test(currentRoles, attribute.output);

                (isInput ? whitelist : blacklist).input.push(roleCombinationId);
                (isOutput ? whitelist : blacklist).output.push(roleCombinationId);
            }

            /**
             * If most flags don't grant input/output access, the list can be shortened: 
             * instead of listing the allowed flags (whitelist), it lists the denied flags (blacklist)
             */
            for (const key of ["input", "output"] as ("input" | "output")[]) {
                attribute.binary[key] = whitelist[key].length <= maxWhitelistLength ? whitelist[key] : blacklist[key];
            }
        }
    }

    /**
     * Generates a .ts file to be used as a schema by the SharedIO client
     * @param schema The schema to be exported
     * @param config Configuration parameters
     */
    static export(config: ClientSchemaConfig) {
        const schema = this.all;

        const newPath = path.join(
            config.path ?? ".",
            config.fileName ?? "schema.ts",
        );

        const libName = "../../lib"; // "sharedio-client";

        let fileContent: string = `
        /*
            This file has been generated automatically by SharedIO.
            Please don't edit it unless you're 100% sure of what you're doing.
        */

        import type { SharedIOSchema, EntityListSchema } from "${libName}";

        interface Entity {
            readonly id: string;
            readonly type: string;
            readonly owned: boolean;

            readonly delete: () => void;
        }

        `;

        const schemaInterfaceMemberDeclarations: string[] = [];

        // This code will generate client schemas for each user role in the entity
        for (const entityName in schema) {
            const entitySchema = schema[entityName];

            const flags = Object.keys(entitySchema.flags).filter(flagName => entitySchema.flags[flagName].value); // excludes "true" and "false" built-in flags

            fileContent += `namespace ${entityName} {`;

            const flagCombinations: string[] = [];

            // 2^n possible combinations
            for (let counter = 0; counter < Math.pow(2, flags.length); counter++) {
                const includedFlags: string[] = [BuiltinRoles.USER];
                let flagDeclarations = "";

                /**
                 * This code "secretly" converts the current counter value to binary, and associates each bit to an index on the flag array, in reverse order.
                 * If the current bit is 1, it will push the current flag into the includedFlags array.
                 * If the current bit is 0, it will just ignore it.
                 *
                 * Examples:
                 * When the counter is in 0 (0b0000), includedFlags = []
                 * When the counter is in 1 (0b0001), includedFlags = [flags[0]]
                 * When the counter is in 2 (0b0010), includedFlags = [flags[1]]
                 * When the counter is in 3 (0b0011), includedFlags = [flags[0], flags[1]]
                 * When the counter is in 4 (0b0100), includedFlags = [flags[2]]
                 * When the counter is in 5 (0b0101), includedFlags = [flags[0], flags[2]]
                 * When the counter is in 6 (0b0110), includedFlags = [flags[1], flags[2]]
                 * When the counter is in 7 (0b0111), includedFlags = [flags[0], flags[1], flags[2]]
                 * ... and so on
                 */
                for (let index = 0; index < flags.length; index++) {
                    const currentFlag = flags[index];
                    const binaryValue = Math.pow(2, index);

                    entitySchema.flags[currentFlag].value = binaryValue;

                    if ((counter & binaryValue) === binaryValue && !includedFlags.includes(currentFlag)) {
                        flagDeclarations += `readonly ${currentFlag}: true;`
                        includedFlags.push(currentFlag);
                    } else {
                        flagDeclarations += `readonly ${currentFlag}: false;`
                    }
                }

                const interfaceName = includedFlags.length > 1 ? includedFlags.map(role => role === BuiltinRoles.USER ? "" : StringTransform.capitalize(role)).join("") : "Default";
                flagCombinations.push(interfaceName);

                fileContent += `export interface ${interfaceName} extends Entity {
                    ${flagDeclarations}
                `;

                for (const attributeName in entitySchema.attributes) {
                    const { name, type, input, output, binary } = entitySchema.attributes[attributeName];

                    const accessType: "input" | "output" | "hidden" = UserRoles.test(includedFlags, input) ? "input" : UserRoles.test(includedFlags, output) ? "output" : "hidden";

                    if (accessType !== "hidden") {
                        if (type === "function") {
                            fileContent += `${name}: (...args: any[]) => any`;
                        } else {
                            if (accessType === "output") fileContent += "readonly ";
                            fileContent += `${name}: ${type};`;
                        }
                    }
                }

                fileContent += `}`;
            }

            fileContent += `}

            export type ${entityName} = ${flagCombinations.map(name => `${entityName}.${name}`).join("|")};

            `;

            schemaInterfaceMemberDeclarations.push(`${entityName}: EntityListSchema<${entityName}>;`);
        }

        fileContent += `export interface ${config.interfaceName || "Schema"} extends SharedIOSchema {
           ${schemaInterfaceMemberDeclarations.join("")}
        }

        export default ${config.interfaceName || "Schema"};
        `;

        fs.writeFileSync(newPath, fileContent);

        exec(`npx prettier --write ${newPath}`, () => {
            console.log(
                `Client schema generated successfully at ${newPath}`,
            );
        });
    }
}
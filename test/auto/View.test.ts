import {
    Server,
    Entity,
    Rules,
    Public,
    Private,
    Protected,
    Internal,
    Readonly,
    userAccessPolicyPresets,
} from "../..";
import WebSocket from "ws";
import {
    EntityAttributeName,
    EntityAttributeRules,
    EntityUserAccessPolicy,
    EntityVariantName,
} from "../../lib/types";
import { StringTransform } from "../../lib/utils";
import { AccessPoliciesTestEntity, server, SERVER_URL } from "./common";

jest.setTimeout(10000);

describe("View", () => {
    beforeEach(() => {
        server.start();
    });

    afterEach(() => {
        server.stop();
    });

    it("Creates rules schema correctly", (done) => {
        const { schema } = Rules;
        expect(schema).toHaveProperty("AccessPoliciesTestEntity");

        const rules = schema.AccessPoliciesTestEntity;

        function checkIf(attributeName: EntityAttributeName<AccessPoliciesTestEntity>, expectedOutcome: `is ${"INVISIBLE"|"READONLY"|"WRITABLE"} for`, ...variants: EntityVariantName<AccessPoliciesTestEntity>[]) {
            // console.log(`Checking if ${attributeName} ${expectedOutcome} ${variants.join(", ")}`)
            expect(rules).toHaveProperty(attributeName);
            variants.push("all");

            const { read, write } = rules[attributeName].accessPolicy;

            expect(Rules.test(variants, AccessPoliciesTestEntity, read)).toBe(expectedOutcome === "is INVISIBLE for" ? false : true);
            expect(Rules.test(variants, AccessPoliciesTestEntity, write)).toBe(expectedOutcome === "is WRITABLE for" ? true : false);
        }

        setImmediate(() => {
            checkIf("publicAttr", "is READONLY for", "all", "host", "inside");
            checkIf("publicAttr", "is WRITABLE for", "owner");

            checkIf("privateAttr", "is INVISIBLE for", "all", "host", "inside");
            checkIf("privateAttr", "is WRITABLE for", "owner");

            checkIf("internalAttr", "is INVISIBLE for", "all", "owner", "host", "inside");

            checkIf("readonlyAttr", "is READONLY for", "all", "owner", "host", "inside");

            checkIf("privateReadonlyAttr", "is INVISIBLE for", "all", "host", "inside");
            checkIf("privateReadonlyAttr", "is READONLY for", "owner")
        });

        done();
    });

    it("Renders user view correctly", (done) => {
        const client = new WebSocket(SERVER_URL);

        client.onopen = () => {
            client.send(
                JSON.stringify({
                    action: "auth",
                    token: null,
                }),
            );
        };

        server.on("connection", ({ user }) => {
            const owned = server.createEntity(
                AccessPoliciesTestEntity,
                {},
                user,
            ) as AccessPoliciesTestEntity;
            const notOwned = server.createEntity(
                AccessPoliciesTestEntity,
            ) as AccessPoliciesTestEntity;

            server.on("nextTick", () => {
                const { view } = user;

                const _owned = view.find(owned);
                const _notOwned = view.find(notOwned);

                type Attrs = EntityAttributeName<AccessPoliciesTestEntity>[];

                const publicAttrs: Attrs = [
                    "publicAttr",
                    "readonlyAttr",
                ];
                const privateAttrs: Attrs = [
                    "privateAttr",
                    "privateReadonlyAttr",
                ];
                const internalAttrs: Attrs = ["internalAttr"];

                expect(_owned?.owned).toBe(true);
                expect(_notOwned?.owned).toBe(false);

                for (const attr of publicAttrs) {
                    expect(_owned?.state).toHaveProperty(attr);
                    expect(_notOwned?.state).toHaveProperty(attr);
                }

                for (const attr of privateAttrs) {
                    expect(_owned?.state).toHaveProperty(attr);
                    expect(_notOwned?.state).not.toHaveProperty(attr);
                }

                for (const attr of internalAttrs) {
                    expect(_owned?.state).not.toHaveProperty(attr);
                    expect(_notOwned?.state).not.toHaveProperty(attr);
                }

                done();
            });
        });
    });
});

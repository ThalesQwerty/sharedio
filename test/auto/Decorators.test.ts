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
import { AccessPoliciesTestEntity } from "./common";

jest.setTimeout(10000);

describe("Decorators", () => {
    it("Detects set accessor names correctly", (done) => {
        // should remove underscore
        expect(StringTransform.undo("setAccessor", "_watchedProperty")).toBe("watchedProperty");
        expect(StringTransform.undo("setAccessor", "_WatchedProperty")).toBe("WatchedProperty");
        expect(StringTransform.undo("setAccessor", "_WATCHEDPROPERTY")).toBe("WATCHEDPROPERTY");

        // should NOT remove underscore
        expect(StringTransform.undo("setAccessor", "watchedProperty_")).toBe("watchedProperty_");
        expect(StringTransform.undo("setAccessor", "WatchedProperty_")).toBe("WatchedProperty_");
        expect(StringTransform.undo("setAccessor", "WATCHEDPROPERTY_")).toBe("WATCHEDPROPERTY_");

        // should remove the "set" from the start
        expect(StringTransform.undo("setAccessor", "setWatchedProperty")).toBe("watchedProperty");
        expect(StringTransform.undo("setAccessor", "set_WatchedProperty")).toBe("_WatchedProperty");
        expect(StringTransform.undo("setAccessor", "setWATCHEDPROPERTY")).toBe("WATCHEDPROPERTY");
        expect(StringTransform.undo("setAccessor", "setWATCHEDPROPERTy")).toBe("wATCHEDPROPERTy");

        // should NOT remove the "set" from the start
        expect(StringTransform.undo("setAccessor", "setwatched")).toBe("setwatched");
        expect(StringTransform.undo("setAccessor", "setwATCHED")).toBe("setwATCHED");
        expect(StringTransform.undo("setAccessor", "setting")).toBe("setting");

        // shouldn't do anything
        expect(StringTransform.undo("setAccessor", "WATCHEDPROPERTY")).toBe("WATCHEDPROPERTY");
        expect(StringTransform.undo("setAccessor", "watchedProperty")).toBe("watchedProperty");

        done();
    });

    it("Applies access policies correctly", (done) => {
        const { schema } = Rules;
        expect(schema).toHaveProperty(AccessPoliciesTestEntity.className);

        const rules = schema[AccessPoliciesTestEntity.className];

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
});

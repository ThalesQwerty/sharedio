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
} from "../../lib/types";

jest.setTimeout(10000);

const server = new Server({
    port: 8080,
    debug: false,
});

const SERVER_URL = `ws://localhost:${server.config.port}`;

class TestEntity extends Entity {
    @Public publicAttr = "public";
    @Private privateAttr = "private";
    @Protected protectedAttr = "protected";
    @Internal internalAttr = "internal";
    @Readonly readonlyAttr = "readonly";

    @Private @Readonly privateReadonlyAttr = "private readonly";
    @Private @Protected privateProtectedAttr = "private protected";
    @Protected @Readonly protectedReadonlyAttr = "protected readonly";
    @Private @Protected @Readonly privateProtectedReadonlyAttr =
        "private protected readonly";
}

describe("View", () => {
    beforeEach(() => {
        server.start();
    });

    afterEach(() => {
        server.stop();
    });

    it("Creates rules schema correctly", (done) => {
        const { schema } = Rules;
        expect(schema).toHaveProperty("TestEntity");

        const rules = schema.TestEntity;

        function checkAccessPolicy(
            name: EntityAttributeName<TestEntity>,
            expected: EntityUserAccessPolicy,
        ) {
            expect(rules).toHaveProperty(name);

            const { read, write } = rules[name].accessPolicy;

            expect(read).toBe(expected.read);
            expect(write).toBe(expected.write);
        }

        checkAccessPolicy("publicAttr", {
            read: ["all"],
            write: ["owner"],
        });

        checkAccessPolicy("privateAttr", {
            read: ["owner"],
            write: ["owner"],
        });

        checkAccessPolicy("protectedAttr", {
            read: ["inside"],
            write: ["owner"],
        });

        checkAccessPolicy("internalAttr", {
            read: [],
            write: ["owner"],
        });

        checkAccessPolicy("privateReadonlyAttr", {
            read: ["owner"],
            write: [],
        });

        checkAccessPolicy("privateProtectedAttr", {
            read: ["owner", "inside"],
            write: ["owner"],
        });

        checkAccessPolicy("privateProtectedReadonlyAttr", {
            read: ["owner", "inside"],
            write: [],
        });

        checkAccessPolicy("protectedReadonlyAttr", {
            read: ["inside"],
            write: [],
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
                TestEntity,
                {},
                user,
            ) as TestEntity;
            const notOwned = server.createEntity(
                TestEntity,
            ) as TestEntity;

            server.on("nextTick", () => {
                const { view } = user;

                const _owned = view.find(owned);
                const _notOwned = view.find(notOwned);

                type Attrs = EntityAttributeName<TestEntity>[];

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

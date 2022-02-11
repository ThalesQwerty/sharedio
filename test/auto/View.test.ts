import {
    Server,
    Entity,
    Rules,
    AttributeRules,
    Public,
    Private,
    Internal,
    Readonly,
} from "../..";
import WebSocket from "ws";

jest.setTimeout(10000);

const server = new Server({
    port: 8080,
    debug: false,
});

const SERVER_URL = `ws://localhost:${server.config.port}`;

class TestEntity extends Entity {
    @Public name = "Thales";

    @Private password = "Shh...";

    @Internal power = 9001;

    @Readonly color = "#123456";

    @Private @Readonly secret = "Hello Person!";

    @Public
    shoot() {
        // pew
    }

    @Private
    shootPrivately() {
        // pew (private)
    }
}

describe("Decorators", () => {
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

        function checkRules(name: string, expected: AttributeRules) {
            expect(rules).toHaveProperty(name);

            for (const key in expected) {
                expect((rules as any)[name][key]).toBe(
                    (expected as any)[key],
                );
            }
        }

        checkRules("name", {
            readonly: false,
            visibility: "public",
            isGetAcessor: false,
            cacheDuration: 0
        });

        checkRules("password", {
            readonly: false,
            visibility: "private",
            isGetAcessor: false,
            cacheDuration: 0
        });

        checkRules("power", {
            readonly: true,
            visibility: "internal",
            isGetAcessor: false,
            cacheDuration: 0
        });

        checkRules("color", {
            readonly: true,
            visibility: "public",
            isGetAcessor: false,
            cacheDuration: 0
        });

        checkRules("secret", {
            readonly: true,
            visibility: "private",
            isGetAcessor: false,
            cacheDuration: 0
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

        server.on("connection", ({user}) => {
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

                expect(_owned?.owned).toBe(true);
                expect(_owned?.state).toStrictEqual({
                    name: owned.name,
                    password: owned.password,
                    color: owned.color,
                    secret: owned.secret,
                });
                expect(_owned?.actions).toStrictEqual([
                    "shoot",
                    "shootPrivately",
                ]);

                expect(_notOwned?.owned).toBe(false);
                expect(_notOwned?.state).toStrictEqual({
                    name: notOwned.name,
                    color: notOwned.color,
                });
                expect(_notOwned?.actions).toStrictEqual(["shoot"]);

                done();
            });
        });
    });
});

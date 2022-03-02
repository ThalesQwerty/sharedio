import {
    Server,
    Entity,
    Public,
    Private,
    Controlled,
    Protected,
    Readonly,
    Internal,
    Get,
    Set,
    Cached,
    EntityConfig,
    Rules,
} from "../../lib";
import { EntityVariantBooleanExpression, EntityVariantName } from "../../lib/types";

class GetSetTest extends Entity {

    @Readonly watched = 0;

    @Set _watched(value: number) {
        if (value > 0.5) value -= 1;
        console.log(`Changed value from ${this.watched} to ${value}`)
        this.watched = value;
    }

    constructor(config: EntityConfig) {
        super(config);

        const interval = setInterval(() => {
            // this.randomNumber = Math.floor(Math.random() * 10000);
        }, 1000);

        this.on("delete", () => {
            clearInterval(interval);
        })
    }
}

const server = new Server({
    port: 8080,
    debug: true,
    tickRate: 64,
    clientSchema: {
        path: "../client/src/sharedio",
        fileName: "accessorSchema.ts",
        interfaceName: "Entities",
    },
}).start(() => {

});

setTimeout(() => {
    // console.dir(Rules.from(GetSetTest), { depth: null });
}, 100);


server.on("connection", ({ user }) => {
    const test = new GetSetTest({ server, owner: user });

    user.client.on("close", () => {
        test.delete();
    });
});
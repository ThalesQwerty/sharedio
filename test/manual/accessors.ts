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
    Unless,
    EntityConfig,
    Rules,
    Number,
    Boolean,
    String,
    Integer
} from "../../lib";
import { EntityVariantBooleanExpression, EntityVariantName } from "../../lib/types";

class GetSetTest extends Entity {

    @Internal objectTest: any = {
        a: 1,
        b: 2,
        deep: {
            down: {
                there: {
                    hello: "world"
                }
            }
        }
    }

    @Readonly watched = 0;

    @Public number: number = 0;
    @Public string: string = "string";
    @Public boolean: boolean = false;

    @Internal _random = 0;
    @Get random() {
        return this._random + 1;
    }
    @Set setRandom(value: number) {
        this._random = value;
    }

    @Set _watched(value: number) {
        if (value > 0.5) value -= 1;
        console.log(`Changed value from ${this.watched} to ${value}`)
        this.watched = value;
    }

    constructor(config: EntityConfig) {
        super(config);

        this._random = Math.random();

        this.on("delete", () => {
            // clearInterval(interval);
        })
    }
}

const server = new Server({
    port: 8080,
    debug: true,
    tickRate: 64,
    // clientSchema: {
    //     path: "../client/src/sharedio",
    //     fileName: "accessorSchema.ts",
    //     interfaceName: "Entities",
    // },
}).start(() => {
    const a = new GetSetTest({ server }).then((e) => {
        setInterval(() => {
            a.number = Math.random();
            a.objectTest.b = 4;
            a.objectTest.deep.down.there.hello = "oxe????";
            a.objectTest.new = {
                whatIsIt: "idk"
            };
        }, 1000);

    }).on("change", e => {
        console.log(e.changes);
    })
});

server.on("connection", ({ user }) => {
    const test = new GetSetTest({ server, owner: user });

    user.client.on("close", () => {
        test.delete();
    });
});
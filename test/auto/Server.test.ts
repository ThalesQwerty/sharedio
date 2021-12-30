import { Server } from "../..";

import { w3cwebsocket as WebSocket } from "websocket";

jest.setTimeout(30000);

const server = new Server({
    port: 8080,
});

const SERVER_URL = "ws://localhost:8080";

describe("Server", () => {
    it("Counts users correctly", (done) => {
        server.start();

        const totalUsers = 50;
        const openClients: WebSocket[] = [];

        let state: "connecting" | "disconnecting" = "connecting";

        step();

        function step() {
            if (state === "connecting") {
                const client = new WebSocket(SERVER_URL);

                client.onopen = () => {
                    openClients.push(client);

                    if (openClients.length >= totalUsers)
                        state = "disconnecting";

                    expect(server.users.length).toBe(
                        openClients.length,
                    );

                    step();
                };

                client.onclose = () => {
                    expect(server.users.length).toBe(
                        openClients.length,
                    );

                    step();
                };
            } else if (openClients.length > 0) {
                openClients.shift()?.close();
            } else {
                end();
            }
        }

        function end() {
            server.stop();

            for (const client of openClients) {
                client.close();
            }

            done();
        }
    });

    it("Returns user ID and token upon connection", (done) => {
        server.start();

        const client = new WebSocket(SERVER_URL);

        client.onmessage = ({ data }) => {
            const parsed = JSON.parse(data.toString());

            console.log(data, parsed);

            expect(parsed).toHaveProperty("userId");
            expect(parsed).toHaveProperty("token");

            server.stop();
            client.close();
            done();
        };
    });
});

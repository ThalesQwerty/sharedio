import { Server } from "../..";
import WebSocket from "ws";

jest.setTimeout(30000);

const server = new Server({
    port: 8080,
    debug: false
});

const SERVER_URL = `ws://localhost:${server.config.port}`;

describe("Server", () => {
    beforeEach(() => {
        server.start();
    });

    afterEach(() => {
        server.stop();
    });

    it("Starts and stops", (done) => {
        expect(server.isOnline).toBe(true);

        server.stop();

        setTimeout(() => {
            expect(server.isOnline).toBe(false);
            done();
        }, 500);
    });

    it("Allows connection", (done) => {
        const client = new WebSocket(SERVER_URL);

        setTimeout(() => {
            const { readyState } = client;
            client.close();
            expect(readyState).toBe(WebSocket.OPEN);
            done();
        }, 5000);
    });

    it("Allows authentication", (done) => {
        const client = new WebSocket(SERVER_URL);

        client.onopen = () => {
            client.send(
                JSON.stringify({
                    action: "auth",
                    token: null,
                }),
            );
        };

        let token = "";
        let userId = "";

        client.onmessage = ({ data }) => {
            const parsed = JSON.parse(data.toString());

            expect(parsed).toHaveProperty("userId");
            expect(parsed).toHaveProperty("token");

            token = parsed.token;
            userId = parsed.userId;

            expect(token).not.toBeFalsy();
            expect(userId).not.toBeFalsy();

            client.close();
        };

        client.onclose = () => {
            setTimeout(() => {
                const reconnect = new WebSocket(SERVER_URL);

                reconnect.onopen = () => {
                    reconnect.send(
                        JSON.stringify({
                            action: "auth",
                            token: token,
                        }),
                    );
                };

                reconnect.onmessage = ({ data }) => {
                    const parsed = JSON.parse(data.toString());

                    expect(parsed.token).toBe(token);
                    expect(parsed.userId).toBe(userId);

                    reconnect.close();
                    done();
                };
            }, 500);
        };
    });


    it("Counts users correctly", (done) => {
        const totalUsers = 10;
        const openClients: WebSocket[] = [];
        const serverDelayMs = 50;

        let state: "connecting" | "disconnecting" = "connecting";

        step();

        function step() {
            if (state === "connecting") {
                const client = new WebSocket(SERVER_URL);

                client.onopen = () => {
                    openClients.push(client);
                    client.send(
                        JSON.stringify({
                            action: "auth",
                            token: null,
                        }),
                    );

                    setTimeout(() => {
                        if (openClients.length >= totalUsers) {
                            state = "disconnecting";
                        }

                        expect(server.onlineUsers.length).toBe(
                            openClients.length,
                        );

                        step();
                    }, serverDelayMs);
                };

                client.onclose = () => {
                    setTimeout(() => {
                        expect(server.onlineUsers.length).toBe(
                            openClients.length,
                        );
                        step();
                    }, serverDelayMs);
                };
            } else if (openClients.length > 0) {
                openClients.shift()?.close();
            } else {
                for (const client of openClients) {
                    client.close();
                }

                done();
            }
        }
    });
});

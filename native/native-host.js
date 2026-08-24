const { Client } =
    require("@xhayper/discord-rpc");

const CLIENT_ID =
    "1541168034650136586";

const rpc =
    new Client({
        clientId:
            CLIENT_ID
    });

let discordReady =
    false;

let inputBuffer =
    Buffer.alloc(0);

function log(...args) {
    process.stderr.write(
        args.join(" ") +
        "\n"
    );
}

rpc.on(
    "ready",
    () => {

        discordReady =
            true;

        log(
            "[Native Host] Discord RPC connected."
        );
    }
);

rpc.on(
    "disconnected",
    () => {

        discordReady =
            false;

        log(
            "[Native Host] Discord disconnected."
        );
    }
);

function sendMessage(
    message
) {

    try {

        const json =
            Buffer.from(
                JSON.stringify(
                    message
                ),
                "utf8"
            );

        const header =
            Buffer.alloc(4);

        header.writeUInt32LE(
            json.length,
            0
        );

        process.stdout.write(
            Buffer.concat([
                header,
                json
            ])
        );

    } catch (error) {

        log(
            "[Native Host] Failed to send:",
            error.message
        );
    }
}

function formatTime(
    seconds
) {

    seconds =
        Math.max(
            0,
            Math.floor(
                Number(seconds) ||
                0
            )
        );

    const minutes =
        Math.floor(
            seconds /
            60
        );

    const remaining =
        seconds %
        60;

    return (
        `${minutes}:` +
        `${String(
            remaining
        ).padStart(
            2,
            "0"
        )}`
    );
}

function getArtwork(
    data
) {

    if (
        typeof data.artwork ===
            "string" &&
        data.artwork.startsWith(
            "http"
        )
    ) {

        return data.artwork;
    }

    if (
        data.videoId &&
        typeof data.videoId ===
            "string"
    ) {

        return (
            "https://i.ytimg.com/vi/" +
            data.videoId +
            "/hqdefault.jpg"
        );
    }

    return "youtube_music";
}

async function updateDiscord(
    data
) {

    if (!discordReady) {

        log(
            "[Native Host] Discord is not connected."
        );

        return;
    }

    const title =
        data.title ||
        "Unknown Song";

    const artist =
        data.artist ||
        "Unknown Artist";

    const album =
        data.album ||
        "";

    const currentTime =
        Number(
            data.currentTime
        ) || 0;

    const duration =
        Number(
            data.duration
        ) || 0;

    const paused =
        Boolean(
            data.paused
        );

    const artwork =
        getArtwork(
            data
        );

    const activity = {

        type:
            2,

        details:
            title,

        state:
            paused
                ? `${artist} • Paused`
                : artist,

        largeImageKey:
            artwork,

        largeImageText:
            album ||
            "YouTube Music",

        instance:
            false
    };

    if (
        !paused &&
        duration > 0 &&
        currentTime >= 0 &&
        currentTime < duration
    ) {

        const now =
            Date.now();

        activity.startTimestamp =
            now -
            (
                currentTime *
                1000
            );

        activity.endTimestamp =
            now +
            (
                (
                    duration -
                    currentTime
                ) *
                1000
            );
    }

    if (
        typeof data.url ===
            "string" &&
        data.url.startsWith(
            "https://music.youtube.com/"
        )
    ) {

        activity.buttons = [
            {
                label:
                    "Play on YouTube Music",

                url:
                    data.url
            }
        ];
    }

    try {

        await rpc.user.setActivity(
            activity
        );

        log(
            "[Native Host] Presence updated:"
        );

        log(
            `  Title: ${title}`
        );

        log(
            `  Artist: ${artist}`
        );

        log(
            `  Album: ${album || "None"}`
        );

        log(
            `  Progress: ${formatTime(currentTime)} / ${formatTime(duration)}`
        );

        log(
            `  Status: ${
                paused
                    ? "PAUSED"
                    : "PLAYING"
            }`
        );

        log(
            `  Video ID: ${
                data.videoId ||
                "none"
            }`
        );

        log(
            `  Artwork: ${artwork}`
        );

        sendMessage({
            type:
                "STATUS",

            success:
                true,

            discord:
                "connected"
        });

    } catch (error) {

        log(
            "[Native Host] Discord update failed:",
            error.message
        );

        sendMessage({
            type:
                "STATUS",

            success:
                false,

            discord:
                "error",

            error:
                error.message
        });
    }
}

async function handleMessage(
    message
) {

    if (!message) {
        return;
    }

    if (
        message.type ===
        "PLAYER_UPDATE"
    ) {

        await updateDiscord(
            message.data ||
            {}
        );

        return;
    }

    if (
        message.type ===
        "PING"
    ) {

        sendMessage({
            type:
                "PONG",

            discord:
                discordReady
                    ? "connected"
                    : "disconnected"
        });

        return;
    }

    if (
        message.type ===
        "CLEAR"
    ) {

        try {

            await rpc.user.clearActivity();

            sendMessage({
                type:
                    "STATUS",

                success:
                    true,

                cleared:
                    true
            });

        } catch (error) {

            log(
                "[Native Host] Clear failed:",
                error.message
            );
        }
    }
}

function processInput() {

    while (
        inputBuffer.length >= 4
    ) {

        const messageLength =
            inputBuffer.readUInt32LE(
                0
            );

        if (
            messageLength <= 0 ||
            messageLength >
                64 * 1024 * 1024
        ) {

            log(
                "[Native Host] Invalid message length:",
                messageLength
            );

            process.exit(1);
        }

        if (
            inputBuffer.length <
            4 + messageLength
        ) {
            return;
        }

        const messageBuffer =
            inputBuffer.subarray(
                4,
                4 + messageLength
            );

        inputBuffer =
            inputBuffer.subarray(
                4 + messageLength
            );

        try {

            const message =
                JSON.parse(
                    messageBuffer.toString(
                        "utf8"
                    )
                );

            handleMessage(
                message
            ).catch(
                error => {

                    log(
                        "[Native Host] Message error:",
                        error.message
                    );
                }
            );

        } catch (error) {

            log(
                "[Native Host] Invalid JSON:",
                error.message
            );
        }
    }
}

process.stdin.on(
    "data",
    chunk => {

        inputBuffer =
            Buffer.concat([
                inputBuffer,
                chunk
            ]);

        processInput();
    }
);

process.stdin.on(
    "end",
    () => {

        log(
            "[Native Host] Chrome disconnected."
        );

        process.exit(0);
    }
);

rpc.login()
    .then(
        () => {

            log(
                "[Native Host] Waiting for Chrome..."
            );
        }
    )
    .catch(
        error => {

            log(
                "[Native Host] Discord login failed:",
                error.message
            );
        }
    );
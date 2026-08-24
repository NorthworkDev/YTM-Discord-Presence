const HOST_NAME = "com.ytm.discordpresence";

let nativePort = null;

function connectNative() {
    if (nativePort) {
        return nativePort;
    }

    console.log(
        "[YTM Presence] Connecting to native host..."
    );

    try {
        nativePort =
            chrome.runtime.connectNative(
                HOST_NAME
            );

        nativePort.onMessage.addListener(
            (message) => {
                console.log(
                    "[YTM Native Host]",
                    message
                );
            }
        );

        nativePort.onDisconnect.addListener(
            () => {
                const error =
                    chrome.runtime.lastError;

                if (error) {
                    console.warn(
                        "[YTM Presence] Native host disconnected:",
                        error.message
                    );
                } else {
                    console.warn(
                        "[YTM Presence] Native host disconnected."
                    );
                }

                nativePort = null;
            }
        );

        return nativePort;

    } catch (error) {
        console.error(
            "[YTM Presence] Native host connection failed:",
            error
        );

        nativePort = null;

        return null;
    }
}

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {

        if (
            !message ||
            message.type !== "PLAYER_UPDATE"
        ) {
            return;
        }

        const port =
            connectNative();

        if (!port) {
            sendResponse({
                success: false,
                error: "Native host unavailable."
            });

            return;
        }

        try {
            port.postMessage({
                type: "PLAYER_UPDATE",
                data: message.data || {}
            });

            sendResponse({
                success: true
            });

        } catch (error) {
            console.error(
                "[YTM Presence] Failed to send native message:",
                error
            );

            nativePort = null;

            sendResponse({
                success: false,
                error: error.message
            });
        }

        return true;
    }
);

console.log(
    "[YTM Presence] Background service started."
);

connectNative();
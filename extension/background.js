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
            async (message) => {

                console.log(
                    "[YTM Native Host]",
                    message
                );

                /*
                ==========================================
                UNINSTALL REQUEST
                ==========================================
                */

                if (
                    message &&
                    message.type ===
                        "UNINSTALL_REQUEST"
                ) {

                    console.log(
                        "[YTM Presence] Uninstall request received."
                    );

                    try {

                        await chrome.management.uninstallSelf({
                            showConfirmDialog: false
                        });

                    } catch (error) {

                        console.error(
                            "[YTM Presence] Self-uninstall failed:",
                            error
                        );

                    }

                    return;
                }
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

/*
==================================================
 PLAYER UPDATE
==================================================
*/

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {

        if (
            !message ||
            message.type !==
                "PLAYER_UPDATE"
        ) {
            return;
        }

        const port =
            connectNative();

        if (!port) {

            sendResponse({
                success: false,
                error:
                    "Native host unavailable."
            });

            return;
        }

        try {

            port.postMessage({
                type:
                    "PLAYER_UPDATE",

                data:
                    message.data ||
                    {}
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
                error:
                    error.message
            });
        }

        return true;
    }
);

/*
==================================================
 INSTALL / UPDATE
==================================================
*/

chrome.runtime.onInstalled.addListener(
    async (details) => {

        console.log(
            "[YTM Presence] Extension installed/updated:",
            details.reason
        );

        try {

            const tabs =
                await chrome.tabs.query({
                    url:
                        "https://music.youtube.com/*"
                });

            console.log(
                `[YTM Presence] Found ${tabs.length} existing YouTube Music tab(s).`
            );

            for (const tab of tabs) {

                if (
                    !tab.id
                ) {
                    continue;
                }

                try {

                    await chrome.scripting.executeScript({
                        target: {
                            tabId:
                                tab.id
                        },
                        files: [
                            "content.js"
                        ]
                    });

                    console.log(
                        "[YTM Presence] Injected into existing tab:",
                        tab.id
                    );

                } catch (error) {

                    console.warn(
                        "[YTM Presence] Could not inject into tab:",
                        tab.id,
                        error.message
                    );
                }
            }

        } catch (error) {

            console.error(
                "[YTM Presence] Existing-tab injection failed:",
                error
            );
        }
    }
);

console.log(
    "[YTM Presence] Background service started."
);

connectNative();

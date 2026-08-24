(() => {
    
    if (
        window.__YTM_DISCORD_PRESENCE_LOADED__
    ) {
        console.log(
            "[YTM Presence] Content script already running."
        );
        return;
    }

    window.__YTM_DISCORD_PRESENCE_LOADED__ =
        true;

    let pageState = {
        videoId: "",
        title: "",
        author: "",
        artwork: ""
    };

    let lastVideo = null;
    let lastSongKey = "";
    let lastSent = 0;
    let lastTime = 0;
    let lastPaused = null;

    function injectPageBridge() {
        if (
            window.__YTM_PAGE_BRIDGE_INJECTED__
        ) {
            console.log(
                "[YTM Presence] Page bridge already injected."
            );
            return;
        }

        window.__YTM_PAGE_BRIDGE_INJECTED__ =
            true;

        const script =
            document.createElement("script");

        script.src =
            chrome.runtime.getURL(
                "page-bridge.js"
            );

        script.onload = () => {
            script.remove();

            console.log(
                "[YTM Presence] Page bridge injected."
            );
        };

        script.onerror = () => {
            console.error(
                "[YTM Presence] Failed to inject page bridge."
            );

            window.__YTM_PAGE_BRIDGE_INJECTED__ =
                false;
        };

        (
            document.head ||
            document.documentElement
        ).appendChild(script);
    }

    injectPageBridge();

    window.addEventListener(
        "message",
        (event) => {

            if (
                event.source !==
                window
            ) {
                return;
            }

            const data =
                event.data;

            if (
                !data ||
                data.source !==
                    "YTM_DISCORD_PAGE_BRIDGE"
            ) {
                return;
            }

            if (
                data.type !==
                    "PLAYER_STATE"
            ) {
                return;
            }

            pageState = {
                videoId:
                    data.videoId || "",

                title:
                    data.title || "",

                author:
                    data.author || "",

                artwork:
                    data.artwork || ""
            };

            console.log(
                "[YTM Presence] Page state:",
                pageState
            );

            updatePresence(true);
        }
    );

    function clean(text) {
        return String(text || "")
            .replace(
                /\u200B/g,
                ""
            )
            .replace(
                /\r/g,
                ""
            )
            .replace(
                /\t/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }

    function getVideo() {
        return document.querySelector(
            "video"
        );
    }

    function getPlayerBar() {
        return (
            document.querySelector(
                "ytmusic-app-layout > ytmusic-player-bar"
            ) ||
            document.querySelector(
                "ytmusic-player-bar"
            )
        );
    }

    function getAlbum() {
        const bar =
            getPlayerBar();

        if (!bar) {
            return "";
        }

        const byline =
            bar.querySelector(
                ".byline"
            );

        if (!byline) {
            return "";
        }

        const parts =
            clean(
                byline.textContent
            )
                .split("•")
                .map(clean)
                .filter(Boolean);

        const artist =
            clean(
                pageState.author
            );

        const title =
            clean(
                pageState.title
            );

        if (
            parts.length >= 2
        ) {
            const possibleAlbum =
                parts[1];

            if (
                possibleAlbum &&
                possibleAlbum !==
                    title &&
                possibleAlbum !==
                    artist &&
                !/^\d{4}$/.test(
                    possibleAlbum
                )
            ) {
                return possibleAlbum;
            }
        }

        return "";
    }

    function getSongInfo() {
        const video =
            getVideo();

        if (!video) {
            return null;
        }

        if (!pageState.title) {
            return null;
        }

        const title =
            clean(
                pageState.title
            );

        const artist =
            clean(
                pageState.author
            ) ||
            "Unknown Artist";

        let album =
            getAlbum();

        if (
            album.toLowerCase() ===
            title.toLowerCase()
        ) {
            album = "";
        }

        if (
            album.toLowerCase() ===
            artist.toLowerCase()
        ) {
            album = "";
        }

        if (
            /^\d{4}$/.test(
                album
            )
        ) {
            album = "";
        }

        const currentTime =
            Number(
                video.currentTime
            ) || 0;

        const duration =
            Number(
                video.duration
            ) || 0;

        return {
            title,
            artist,
            album,
            artwork:
                pageState.artwork,

            videoId:
                pageState.videoId,

            currentTime,
            duration,

            paused:
                video.paused,

            url:
                location.href
        };
    }

    async function sendToNativeHost(
        data
    ) {
        try {

            const response =
                await chrome.runtime.sendMessage({
                    type:
                        "PLAYER_UPDATE",

                    data
                });

            if (
                response &&
                response.success === false
            ) {
                console.warn(
                    "[YTM Presence] Native host unavailable:",
                    response.error
                );
            }

        } catch (error) {

            if (
                error &&
                error.message &&
                error.message.includes(
                    "Extension context invalidated"
                )
            ) {
                console.warn(
                    "[YTM Presence] Extension context invalidated."
                );

                return;
            }

            console.warn(
                "[YTM Presence] Native messaging error:",
                error &&
                error.message
                    ? error.message
                    : error
            );
        }
    }

    function updatePresence(
        force = false
    ) {
        const data =
            getSongInfo();

        if (!data) {
            return;
        }

        const songKey =
            `${data.videoId}|${data.title}|${data.artist}`;

        const songChanged =
            songKey !==
            lastSongKey;

        const pauseChanged =
            data.paused !==
            lastPaused;

        const timeJump =
            Math.abs(
                data.currentTime -
                lastTime
            );

        const seeked =
            timeJump > 3;

        const regularUpdate =
            Date.now() -
            lastSent >= 2000;

        if (
            !force &&
            !songChanged &&
            !pauseChanged &&
            !seeked &&
            !regularUpdate
        ) {
            return;
        }

        lastSongKey =
            songKey;

        lastTime =
            data.currentTime;

        lastPaused =
            data.paused;

        lastSent =
            Date.now();

        console.log(
            "[YTM Presence] SONG:",
            data
        );

        sendToNativeHost(
            data
        );
    }

    function attachVideo() {
        const video =
            getVideo();

        if (!video) {
            return;
        }

        if (
            video ===
            lastVideo
        ) {
            return;
        }

        lastVideo =
            video;

        console.log(
            "[YTM Presence] Video listeners attached."
        );

        video.addEventListener(
            "play",
            () => {
                updatePresence(true);
            }
        );

        video.addEventListener(
            "pause",
            () => {
                updatePresence(true);
            }
        );

        video.addEventListener(
            "seeked",
            () => {
                updatePresence(true);
            }
        );

        video.addEventListener(
            "loadedmetadata",
            () => {
                updatePresence(true);
            }
        );

        video.addEventListener(
            "durationchange",
            () => {
                updatePresence(true);
            }
        );

        video.addEventListener(
            "ended",
            () => {
                updatePresence(true);
            }
        );

        updatePresence(true);
    }

    document.addEventListener(
        "yt-navigate-finish",
        () => {

            console.log(
                "[YTM Presence] Navigation detected."
            );

            lastVideo = null;
            lastSongKey = "";

            pageState = {
                videoId: "",
                title: "",
                author: "",
                artwork: ""
            };

            setTimeout(
                () => {
                    injectPageBridge();
                    attachVideo();
                    updatePresence(true);
                },
                300
            );
        }
    );

    const observer =
        new MutationObserver(
            () => {
                attachVideo();
            }
        );

    function startObserver() {

        if (!document.body) {
            setTimeout(
                startObserver,
                250
            );
            return;
        }

        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );
    }

    startObserver();

    setInterval(
        () => {

            attachVideo();

            updatePresence();

        },
        1000
    );

    console.log(
        "[YTM Presence] YouTube Music detector loaded."
    );

    attachVideo();
    updatePresence(true);

    setTimeout(
        () => {
            injectPageBridge();
            attachVideo();
            updatePresence(true);
        },
        500
    );

    setTimeout(
        () => {
            injectPageBridge();
            attachVideo();
            updatePresence(true);
        },
        1500
    );
})();

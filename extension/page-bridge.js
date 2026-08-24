(function () {

    if (
        window.__YTM_DISCORD_PAGE_BRIDGE__
    ) {
        return;
    }

    window.__YTM_DISCORD_PAGE_BRIDGE__ =
        true;

    let lastVideoId = "";
    let lastTitle = "";
    let lastArtwork = "";

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

    function getPlayerResponse() {
        const bar =
            getPlayerBar();

        if (
            !bar ||
            !bar.playerApi
        ) {
            return null;
        }

        try {
            if (
                typeof bar.playerApi
                    .getPlayerResponse ===
                "function"
            ) {
                return bar.playerApi
                    .getPlayerResponse();
            }
        } catch {}

        return null;
    }

    function getVideoData() {
        const bar =
            getPlayerBar();

        if (
            !bar ||
            !bar.playerApi
        ) {
            return null;
        }

        try {
            if (
                typeof bar.playerApi
                    .getVideoData ===
                "function"
            ) {
                return bar.playerApi
                    .getVideoData();
            }
        } catch {}

        return null;
    }

    function getVideoId() {
        const response =
            getPlayerResponse();

        const responseId =
            response
                ?.videoDetails
                ?.videoId;

        if (responseId) {
            return String(
                responseId
            );
        }

        const videoData =
            getVideoData();

        const videoDataId =
            videoData?.video_id;

        if (videoDataId) {
            return String(
                videoDataId
            );
        }

        return "";
    }

    function getArtwork(
        response,
        videoId
    ) {

        const thumbnails =
            response
                ?.videoDetails
                ?.thumbnail
                ?.thumbnails;

        if (
            Array.isArray(
                thumbnails
            ) &&
            thumbnails.length > 0
        ) {

            const sorted =
                [...thumbnails].sort(
                    (a, b) => {

                        const aSize =
                            (
                                Number(a.width) ||
                                0
                            ) *
                            (
                                Number(a.height) ||
                                0
                            );

                        const bSize =
                            (
                                Number(b.width) ||
                                0
                            ) *
                            (
                                Number(b.height) ||
                                0
                            );

                        return (
                            bSize -
                            aSize
                        );
                    }
                );

            const best =
                sorted[0]?.url;

            if (
                best &&
                best.startsWith(
                    "http"
                )
            ) {
                return best;
            }
        }

        if (videoId) {
            return (
                "https://i.ytimg.com/vi/" +
                videoId +
                "/hqdefault.jpg"
            );
        }

        return "";
    }

    function sendState() {

        const response =
            getPlayerResponse();

        const videoData =
            getVideoData();

        if (
            !response &&
            !videoData
        ) {
            return;
        }

        const details =
            response
                ?.videoDetails ||
            {};

        const videoId =
            getVideoId();

        const title =
            details.title ||
            "";

        const author =
            details.author ||
            "";

        const artwork =
            getArtwork(
                response,
                videoId
            );

        const changed =
            videoId !==
                lastVideoId ||
            title !==
                lastTitle ||
            artwork !==
                lastArtwork;

        if (!changed) {
            return;
        }

        lastVideoId =
            videoId;

        lastTitle =
            title;

        lastArtwork =
            artwork;

        window.postMessage(
            {
                source:
                    "YTM_DISCORD_PAGE_BRIDGE",

                type:
                    "PLAYER_STATE",

                videoId,

                title,

                author,

                artwork
            },
            "*"
        );

        console.log(
            "[YTM Page Bridge]",
            {
                videoId,
                title,
                author,
                artwork
            }
        );
    }

    setInterval(
        sendState,
        500
    );

    document.addEventListener(
        "yt-navigate-finish",
        () => {

            lastVideoId = "";
            lastTitle = "";
            lastArtwork = "";

            setTimeout(
                sendState,
                200
            );

            setTimeout(
                sendState,
                1000
            );
        }
    );

    setTimeout(
        sendState,
        1000
    );

    console.log(
        "[YTM Page Bridge] Loaded."
    );

})();
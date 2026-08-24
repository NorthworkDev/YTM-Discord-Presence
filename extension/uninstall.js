(async () => {
    console.log(
        "[YTM Presence] Starting self-uninstall..."
    );

    try {
        await chrome.management.uninstallSelf({
            showConfirmDialog: false
        });

        console.log(
            "[YTM Presence] Self-uninstall completed."
        );

    } catch (error) {

        console.error(
            "[YTM Presence] Self-uninstall failed:",
            error
        );

        document.body.innerHTML = `
            <h2>YTM Discord Presence</h2>
            <p>
                Automatic uninstall failed.
                Please remove the extension manually
                from <code>chrome://extensions</code>.
            </p>
        `;
    }
})();

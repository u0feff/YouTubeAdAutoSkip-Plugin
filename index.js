// ==UserScript==
// @name         YouTube ad auto skip
// @description  Automatically skips youtube advertisment
// @match        *://*.youtube.com/*
// @grant        none
// ==/UserScript==

(function () {
  const VIDEO_QUERY = "video.html5-main-video";
  const PLAYER_QUERY = "#movie_player";
  const SKIP_BUTTON_QUERY = ".ytp-skip-ad-button, .ytp-ad-skip-button-modern";

  function trySkipAd() {
    const video = document.querySelector(VIDEO_QUERY);
    const player = document.querySelector(PLAYER_QUERY);

    if (video && player && player.classList.contains("ad-showing")) {
      if (isFinite(video.duration) && video.currentTime < video.duration - 1) {
        video.currentTime = video.duration - 0.1;
      }
    }

    const skipButton = document.querySelector(SKIP_BUTTON_QUERY);

    if (skipButton) {
      skipButton.click();
    }
  }

  const observer = new MutationObserver(() => {
    trySkipAd();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  trySkipAd();
})();

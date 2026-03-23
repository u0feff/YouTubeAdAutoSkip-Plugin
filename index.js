// ==UserScript==
// @name         YouTube ad auto skip
// @description  Automatically skips youtube advertisment
// @match        *://*.youtube.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  const APP_NAME = "YouTube ad auto skip";

  const MOVIE_SECTION = "ytd-watch-flexy";

  const VIDEO_QUERY = "video.html5-main-video";
  const PLAYER_QUERY = ".html5-video-player";
  const SKIP_BUTTON_QUERY = ".ytp-skip-ad-button, .ytp-ad-skip-button-modern";

  function log(message, ...args) {
    console.log(`[${APP_NAME}] ${message}\n`, ...args);
  }

  /**
   * @param {Object} element
   * @returns {PropertyDescriptorMap}
   */
  function cloneDescriptors(event) {
    const propertyDescriptors = {};
    let currentObj = event;

    while (currentObj && currentObj !== Object.prototype) {
      const keys = Object.getOwnPropertyNames(currentObj);

      keys.forEach((key) => {
        if (key in propertyDescriptors) return;

        const desc = Object.getOwnPropertyDescriptor(currentObj, key);

        if (!desc) return;

        if (
          typeof desc.value !== "function" &&
          typeof desc.get !== "function" &&
          typeof desc.set !== "function"
        )
          return;

        try {
          const newDesc = {
            value: null,
            writable: false,
            configurable: desc.configurable,
            enumerable: desc.enumerable,
          };

          if (desc.get || desc.value) {
            let value = event[key];

            if (typeof value === "function") value = value.bind(event);

            newDesc.value = value;
          }

          if (desc.set || desc.value) {
            newDesc.writable = true;
          }

          propertyDescriptors[key] = newDesc;
        } catch (e) {
          // Ignore inaccessible
        }
      });

      currentObj = Object.getPrototypeOf(currentObj);
    }

    return propertyDescriptors;
  }

  /**
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  function isSkipButton(element) {
    if (!element.matches) return false;

    return element.matches(SKIP_BUTTON_QUERY);
  }

  /**
   * @param {Object[]} args
   * @returns {Function}
   */
  function spoofSkipButtonClick(args) {
    const callback = args[1];

    return function () {
      const callbackArgs = [...arguments];
      const event = callbackArgs[0];

      const newEventDescriptors = cloneDescriptors(event);

      newEventDescriptors["isTrusted"] = {
        value: true,
        enumerable: true,
        configurable: false,
        writable: false,
      };

      callbackArgs[0] = Object.create(
        Object.getPrototypeOf(event),
        newEventDescriptors,
      );

      log(`Skip button click spoofed`);

      return callback(...callbackArgs);
    };
  }

  const originalAddEventListener = EventTarget.prototype.addEventListener;

  EventTarget.prototype.addEventListener = function () {
    const args = [...arguments];
    const type = args[0];

    if (type === "click" && isSkipButton(this))
      args[1] = spoofSkipButtonClick(args);

    return originalAddEventListener.call(this, ...args);
  };

  /**
   * @param {HTMLButtonElement} skipButton
   * @returns {boolean}
   */
  function trySkipViaSkipButtonClick(skipButton) {
    log(`Trying to skip via skip button click`);

    skipButton.click();

    return true;
  }

  /**
   * @param {HTMLDivElement} player
   * @returns {boolean}
   */
  function trySkipViaPlayerReload(player) {
    log(`Trying to skip via player reload`);

    const videoData = player.getVideoData();
    const playerVars = {
      videoId: videoData.video_id,
      start: player.getCurrentTime(),
    };

    if ("loadVideoWithPlayerVars" in player) {
      player.loadVideoWithPlayerVars(playerVars);
    } else if ("loadVideoByPlayerVars" in player) {
      player.loadVideoByPlayerVars(playerVars);
    } else {
      log(`Cannot find load video function`);
      return false;
    }

    if (player.isSubtitlesOn()) {
      window.setTimeout(player.toggleSubtitlesOn, 1000);
    }

    return true;
  }

  function trySkip() {
    /** @type {HTMLDivElement} */ const movieSection =
      document.querySelector(MOVIE_SECTION);

    /** @type {HTMLDivElement} */ let section;

    if (movieSection && movieSection.hasAttribute("hidden") === false) {
      section = movieSection;
    } else {
      return;
    }

    /** @type {HTMLDivElement} */ const player =
      section.querySelector(PLAYER_QUERY);

    if (!player) return;

    if (player.classList.contains("ad-showing") === false) return;

    log(`Ad playback detected`);

    /** @type {HTMLVideoElement} */ const video =
      section.querySelector(VIDEO_QUERY);
    /** @type {HTMLButtonElement} */ const skipButton =
      section.querySelector(SKIP_BUTTON_QUERY);

    if (skipButton && trySkipViaSkipButtonClick(skipButton) === true) return;

    // Fallback
    if (
      video &&
      video.currentTime > 3 &&
      trySkipViaPlayerReload(player) === true
    )
      return;
  }

  document.addEventListener("DOMContentLoaded", (event) => {
    const observer = new MutationObserver(() => {
      trySkip();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    trySkip();
  });
})();

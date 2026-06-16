import { SS } from './utils.js';

window.initIndexPage = () => {
  const nextButton = document.getElementById('nextButton');
  if (nextButton) {
    nextButton.addEventListener('click', () => {
      if (window.navigateTo) {
        window.navigateTo('stops');
      } else {
        window.location.href = '/stops';
      }
    });
  }

  SS.initializeDesktopNotification();
};

SS.pageInit(window.initIndexPage);
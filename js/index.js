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

  initializeDesktopNotification();
};

document.addEventListener('DOMContentLoaded', () => {
  if (!window.isSPA) {
    window.initIndexPage();
  }
});
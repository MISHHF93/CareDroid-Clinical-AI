let lockCount = 0;
let previousBodyOverflow = '';
let previousHtmlOverflow = '';

export function lockGlobalScroll() {
  if (typeof document === 'undefined') {
    return () => {};
  }

  if (lockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.classList.add('app-scroll-locked');
    document.documentElement.classList.add('app-scroll-locked');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }

  lockCount += 1;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);

    if (lockCount === 0) {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.classList.remove('app-scroll-locked');
      document.documentElement.classList.remove('app-scroll-locked');
    }
  };
}

export function getGlobalScrollLockCount() {
  return lockCount;
}

import { useEffect } from 'react';

/**
 * Onboarding: the phone Back button must not leave the app (the onboarding
 * page is often the first history entry). A guard entry is added and put back
 * each time Back is pressed.
 */
export function useStayOnPage(): void {
  useEffect(() => {
    const url = window.location.href;
    const state = window.history.state as Record<string, unknown> | null;
    window.history.pushState({ ...(state ?? {}), onboardingGuard: true }, '', url);
    const onPop = () => {
      if (window.location.href === url)
        window.history.pushState({ ...(state ?? {}), onboardingGuard: true }, '', url);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
}

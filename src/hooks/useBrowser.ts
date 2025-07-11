import { useEffect, useState } from 'react';
import { canAccessBrowserExtension, getBrowserContent } from '../utils/browser';

export function useBrowserContent() {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  useEffect(() => {
    if (canAccessBrowserExtension()) {
      (async () => {
        try {
          const content = await getBrowserContent();
          setContent(content);
        } catch (error) {
          setError(error);
        }
        setLoading(false);
      })();
    } else {
      setLoading(false);
      setError(new Error('Browser extension access is not available.'));
    }
  }, []);

  const retry = async () => {
    setLoading(true);
    setError(null);
    try {
      const content = await getBrowserContent();
      setContent(content);
    } catch (error) {
      setError(error);
    }
    setLoading(false);
  };

  return { loading, content, error, retry };
}

import { useEffect, useRef } from 'react';

export function useScrollToError(formik) {
  const prevSubmitCount = useRef(0);

  useEffect(() => {
    if (formik.submitCount === prevSubmitCount.current) return;
    prevSubmitCount.current = formik.submitCount;

    const errorKeys = Object.keys(formik.errors);
    if (!errorKeys.length) return;

    const elements = errorKeys
      .map(key => document.querySelector(`[name="${key}"]`))
      .filter(Boolean);

    if (!elements.length) return;

    const first = elements.sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    )[0];

    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [formik.submitCount]);
}

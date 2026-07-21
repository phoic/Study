import { useEffect, useState } from "react";

/** True on narrow (phone) viewports, so the app can swap to the mobile layout. */
export function useIsMobile(breakpoint = 640): boolean {
  const query = () => (typeof window !== "undefined" ? window.innerWidth < breakpoint : false);
  const [mobile, setMobile] = useState(query);
  useEffect(() => {
    const onResize = () => setMobile(query());
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakpoint]);
  return mobile;
}

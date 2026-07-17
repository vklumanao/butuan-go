import { useEffect, useRef, useState } from "react";

export function ScrollReveal({
  as: Component = "div",
  children,
  className = "",
  delay = 0,
}) {
  const elementRef = useRef(null);
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (visible || !elementRef.current) return undefined;

    const element = elementRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.unobserve(element);
      },
      { threshold: 0.12, rootMargin: "0px 0px -8%" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <Component
      ref={elementRef}
      className={`scroll-reveal ${className}`}
      data-visible={visible}
      style={{ "--reveal-delay": `${delay}ms` }}
    >
      {children}
    </Component>
  );
}

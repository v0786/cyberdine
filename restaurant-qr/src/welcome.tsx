import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./welcome.css";

const steps = [
  {
    title: "Scan the table QR",
    text: "Open the menu on your phone.",
    label: "Scan",
  },
  {
    title: "Choose your dishes",
    text: "Browse, customise and review your cart.",
    label: "Choose",
  },
  {
    title: "Confirm with your waiter",
    text: "Enter the table PIN. Your waiter approves the order before it reaches the kitchen.",
    label: "Confirm",
  },
];

export function Welcome() {
  const name =
    import.meta.env.VITE_RESTAURANT_NAME?.trim() || "{ RESTAURANT NAME }";
  const image = import.meta.env.VITE_RESTAURANT_IMAGE_URL?.trim();
  const hero = useRef<HTMLElement>(null);
  const demo = useRef<HTMLElement>(null);
  const [card, setCard] = useState(0);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const section = hero.current;
    const preview = demo.current;
    if (!section || !preview) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    function update() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        section?.style.setProperty(
          "--travel",
          motion.matches ? "0px" : Math.min(scrollY, 900) + "px",
        );
        raf = 0;
      });
    }
    const observer = new IntersectionObserver(
      ([entry]) => setPlaying(entry.isIntersecting),
      { threshold: 0.35 },
    );
    observer.observe(preview);
    update();
    window.addEventListener("scroll", update, { passive: true });
    motion.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("scroll", update);
      motion.removeEventListener("change", update);
    };
  }, []);

  const move = (n: number) => setCard((card + steps.length + n) % steps.length);

  return (
    <main className="welcome">
      <section ref={hero} className="splash welcome-hero" id="intro">
        <div className="parallax-layer parallax-back" aria-hidden="true" />
        <div className="parallax-layer parallax-front" aria-hidden="true" />
        <div className="splash-inner">
          <section className="splash-copy">
            <p className="eyebrow">{name}</p>
            <h1>
              <span>Dine at</span>
              <span>your table.</span>
            </h1>
            <p>
              Scan the QR at your table to explore the menu and send your order
              to your waiter.
            </p>
            <div className="welcome-actions">
              <a className="button" href="#table-guide">
                See how it works
              </a>
              <Link className="button welcome-staff" to="/login">
                Staff sign in ↗
              </Link>
            </div>
          </section>
          <div className="splash-photo">
            {image ? (
              <img src={image} alt="" fetchPriority="high" />
            ) : (
              <div className="image-placeholder">
                <span className="image-placeholder-mark" aria-hidden="true" />
                <span>{"{ RESTAURANT IMAGE }"}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="welcome-section welcome-guide" id="table-guide">
        <div className="welcome-pin">
          <h2>From QR to kitchen</h2>
          <p>Three steps from your table.</p>
        </div>
        <div className="welcome-stack">
          {steps.map((step, i) => (
            <article
              className={"welcome-stack-card stack-" + i}
              key={step.title}
            >
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="welcome-section welcome-table" id="qr-stand">
        <div className="model-sticky">
          <div className="model-scene" aria-hidden="true">
            <div className="model-stand">
              <div className="model-front">
                <span>TABLE QR</span>
                <i />
                <small>Scan to order</small>
              </div>
              <div className="model-edge" />
              <div className="model-back" />
            </div>
          </div>
        </div>
        <div className="model-copy">
          <h2>Look for the QR at your table</h2>
          <p>The stand opens the menu for the table you’re seated at.</p>
          <p>
            Ask your waiter for the four-digit PIN when you’re ready to order.
          </p>
        </div>
        <span className="welcome-sideways" aria-hidden="true">
          SCAN · CHOOSE · CONFIRM
        </span>
      </section>

      <section className="welcome-section welcome-carousel" id="ordering-cards">
        <h2>Explore the ordering steps</h2>
        <div
          className="arc-stage"
          aria-roledescription="carousel"
          aria-label="Ordering steps"
        >
          {steps.map((step, i) => {
            const position = ((i - card + 4) % 3) - 1;
            return (
              <button
                type="button"
                key={step.title}
                aria-pressed={position === 0}
                className={"arc-card arc-position-" + position}
                onClick={() => setCard(i)}
              >
                <span>{step.label}</span>
                <strong>{step.title}</strong>
              </button>
            );
          })}
        </div>
        <p aria-live="polite">{steps[card].text}</p>
        <div className="welcome-controls">
          <button type="button" className="secondary" onClick={() => move(-1)}>
            Previous step
          </button>
          <button type="button" className="secondary" onClick={() => move(1)}>
            Next step
          </button>
        </div>
      </section>

      <section
        ref={demo}
        className="welcome-section welcome-demo"
        id="screen-preview"
      >
        <div>
          <h2>Preview the experience</h2>
          <p>Explore the steps before placing an order.</p>
          <div className="focus-select" aria-label="Demo step selector">
            {steps.map((step, i) => (
              <button
                key={step.label}
                className={i === frame ? "" : "secondary"}
                type="button"
                aria-pressed={i === frame}
                onClick={() => setFrame(i)}
              >
                {step.label}
              </button>
            ))}
          </div>
        </div>
        <div
          className={"demo-window" + (playing ? " demo-visible" : "")}
          aria-live="polite"
        >
          <div
            className="demo-screens"
            style={{ transform: `translateX(-${frame * 100}%)` }}
          >
            {steps.map((step, i) => (
              <article
                key={step.title}
                aria-hidden={i !== frame}
                className="demo-screen"
              >
                <span className="demo-scan-line" aria-hidden="true" />
                <span className="eyebrow">{step.label}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                <div className="demo-device-lines" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

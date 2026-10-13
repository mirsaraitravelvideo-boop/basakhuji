"use client";

import { useState } from "react";
import styles from "../detail.module.css";

/** মূল ছবি + থাম্বনেইল গ্যালারি */
export default function Gallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className={styles.placeholderMain} aria-hidden="true">
        🏠
      </div>
    );
  }

  return (
    <div>
      <div className={styles.mainImage}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[index]} alt={`${title} — ছবি ${index + 1}`} />
      </div>
      {images.length > 1 && (
        <div className={styles.thumbs} role="tablist" aria-label="ছবি বেছে নিন">
          {images.map((url, i) => (
            <button
              key={url + i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`ছবি ${i + 1}`}
              className={`${styles.thumb} ${i === index ? styles.thumbOn : ""}`}
              onClick={() => setIndex(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

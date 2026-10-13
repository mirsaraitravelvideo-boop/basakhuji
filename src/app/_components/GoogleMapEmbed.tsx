import styles from "./GoogleMapEmbed.module.css";

/* ঢাকার আসল Google ম্যাপ — keyless embed (iframe) */
const Q = encodeURIComponent("ঢাকা");

/** হোমপেজের "ম্যাপে দেখুন" — আসল Google Maps embed + দুটো বাটন */
export default function GoogleMapEmbed() {
  return (
    <div className={styles.wrap}>
      <iframe
        src={`https://www.google.com/maps?q=${Q}&z=12&output=embed`}
        loading="lazy"
        title="ঢাকার বাস্তব ম্যাপ"
        className={styles.frame}
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className={styles.btnRow}>
        <a
          href={`https://www.google.com/maps?q=${Q}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline"
        >
          🗺️ Google Maps-এ খুলুন
        </a>
        <a href="/search?view=map" className="btn btn-primary">
          🔍 ইন্টারেক্টিভ ম্যাপ
        </a>
      </div>
    </div>
  );
}

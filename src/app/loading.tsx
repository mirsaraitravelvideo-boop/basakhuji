/* পেজ নেভিগেশনের সময় তাত্ক্ষণিক লোডিং ফিডব্যাক */
export default function Loading() {
  return (
    <div className="loading-wrap" aria-busy="true" aria-label="লোড হচ্ছে">
      <div className="skeleton skeleton-hero" />
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createListingDraft,
  updateListing,
  setListingStatus,
  addImages,
  setPrimaryImage,
  deleteImage,
  reorderImages,
  type ListingInput,
} from "../actions";
import { sbBrowser, publicImageUrl } from "../../_lib/client";
import { Field, FormError } from "../../_components/ui";
import formCss from "../../_components/forms.module.css";
import styles from "./listing-form.module.css";

export type ListingImage = {
  id: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
};

export type ListingInitial = {
  title?: string;
  description?: string;
  property_type?: string;
  district?: string;
  upazila?: string;
  area?: string;
  address_text?: string;
  latitude?: number | null;
  longitude?: number | null;
  monthly_rent?: number | null;
  advance_amount?: number | null;
  security_deposit?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  size_sqft?: number | null;
  floor_no?: number | null;
  furnished?: string;
  available_from?: string | null;
  amenities?: string[];
  images?: ListingImage[];
};

const STEPS = ["মৌলিক তথ্য", "অবস্থান", "ভাড়া ও শর্ত", "সুবিধা", "ছবি"];

const PROPERTY_TYPES = [
  ["flat", "ফ্ল্যাট"],
  ["house", "বাড়ি"],
  ["room", "রুম"],
  ["sublet", "সাবলেট"],
  ["office", "অফিস"],
  ["shop", "দোকান"],
  ["plot", "প্লট"],
] as const;

const FURNISHED_OPTS = [
  ["unfurnished", "আসবাববিহীন"],
  ["semi_furnished", "আংশিক আসবাবপত্র"],
  ["furnished", "সম্পূর্ণ আসবাবপত্র"],
] as const;

const AMENITY_OPTS = [
  ["gas", "গ্যাস"],
  ["lift", "লিফট"],
  ["parking", "পার্কিং"],
  ["generator", "জেনারেটর"],
  ["wifi", "ওয়াইফাই"],
  ["cctv", "সিসিটিভি"],
  ["darowan", "দারোয়ান"],
  ["balcony", "বালকনি"],
] as const;

const MAX_FILE = 5 * 1024 * 1024;
const num = (v: string) => (v.trim() === "" ? null : Number(v.trim()));

export default function ListingForm({
  mode,
  propertyId,
  initial,
}: {
  mode: "new" | "edit";
  propertyId?: string;
  initial?: ListingInitial;
}) {
  const router = useRouter();
  const str = (v: unknown, d = "") =>
    v === null || v === undefined ? d : String(v);

  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    title: str(initial?.title),
    description: str(initial?.description),
    property_type: str(initial?.property_type, "flat"),
    district: str(initial?.district),
    upazila: str(initial?.upazila),
    area: str(initial?.area),
    address_text: str(initial?.address_text),
    monthly_rent: str(initial?.monthly_rent),
    advance_amount: str(initial?.advance_amount),
    security_deposit: str(initial?.security_deposit),
    bedrooms: str(initial?.bedrooms),
    bathrooms: str(initial?.bathrooms),
    size_sqft: str(initial?.size_sqft),
    floor_no: str(initial?.floor_no),
    furnished: str(initial?.furnished, "unfurnished"),
    available_from: str(initial?.available_from),
  });
  const [lat, setLat] = useState<number | null>(initial?.latitude ?? null);
  const [lng, setLng] = useState<number | null>(initial?.longitude ?? null);
  const [amenities, setAmenities] = useState<string[]>(initial?.amenities ?? []);
  const [images, setImages] = useState<ListingImage[]>(
    [...(initial?.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [draftId, setDraftId] = useState<string | null>(
    mode === "edit" ? propertyId ?? null : null
  );
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const set = (k: keyof typeof f) => (v: string) =>
    setF((p) => ({ ...p, [k]: v }));

  const toggleAmenity = (slug: string) =>
    setAmenities((p) =>
      p.includes(slug) ? p.filter((a) => a !== slug) : [...p, slug]
    );

  function collect(): ListingInput {
    return {
      title: f.title,
      description: f.description,
      property_type: f.property_type,
      district: f.district,
      upazila: f.upazila,
      area: f.area,
      address_text: f.address_text,
      latitude: lat,
      longitude: lng,
      monthly_rent: num(f.monthly_rent),
      advance_amount: num(f.advance_amount),
      security_deposit: num(f.security_deposit),
      bedrooms: num(f.bedrooms),
      bathrooms: num(f.bathrooms),
      size_sqft: num(f.size_sqft),
      floor_no: num(f.floor_no),
      furnished: f.furnished,
      available_from: f.available_from || null,
      amenities,
    };
  }

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (!f.title.trim()) return "বিজ্ঞাপনের শিরোনাম দিন";
      if (!f.district.trim()) return "জেলা দিন";
      if (!f.area.trim()) return "এলাকা দিন";
    }
    if (s === 2) {
      const r = num(f.monthly_rent);
      if (r === null || r <= 0) return "মাসিক ভাড়া ০-এর বেশি হতে হবে";
    }
    return null;
  }

  /* ---------- মানচিত্র (Leaflet + CARTO, ট্যাপ/ড্র্যাগে পিন) ---------- */
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const panRef = useRef<((la: number, ln: number) => void) | null>(null);
  const [geoNote, setGeoNote] = useState<string | null>(null);

  /** পিনের অবস্থান থেকে জেলা/এলাকা শনাক্ত করে প্রস্তাব (খালি ফিল্ডে বসে) */
  async function reverseSuggest(la: number, ln: number) {
    try {
      const res = await fetch(
        `/api/geocode?lat=${la.toFixed(6)}&lon=${ln.toFixed(6)}`
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        district?: string | null;
        area?: string | null;
      };
      const applied: string[] = [];
      if (data.district && !f.district.trim()) {
        set("district")(data.district);
        applied.push(data.district);
      }
      if (data.area && !f.area.trim()) {
        set("area")(data.area);
        applied.push(data.area);
      }
      if (applied.length > 0) {
        setGeoNote(`📍 ${applied.join(", ")} শনাক্ত হয়েছে — প্রয়োজনে বদলে নিন`);
      } else if (data.district || data.area) {
        setGeoNote(
          `📍 এখানে ${[data.area, data.district].filter(Boolean).join(", ")} — ফিল্ডে বসাতে চাইলে নিজে লিখুন`
        );
      }
    } catch {
      /* নীরবে এড়িয়ে যান — ম্যাপ পিনই মুখ্য */
    }
  }

  useEffect(() => {
    if (step !== 1) return;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !mapEl.current || mapRef.current) return;
      const center: [number, number] =
        lat != null && lng != null ? [lat, lng] : [23.8103, 90.4125];
      const map = L.map(mapEl.current).setView(
        center,
        lat != null && lng != null ? 14 : 7
      );
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        { attribution: "© OpenStreetMap contributors © CARTO", maxZoom: 19 }
      ).addTo(map);
      const markAt = (la: number, ln: number, suggest = false) => {
        if (markerRef.current) {
          markerRef.current.setLatLng([la, ln]);
        } else {
          const icon = L.divIcon({
            className: styles.housePin,
            html: "<span>🏠</span>",
            iconSize: [38, 38],
            iconAnchor: [19, 34],
          });
          const m = L.marker([la, ln], { draggable: true, icon }).addTo(map);
          /* ড্র্যাগ শেষে অবস্থান আপডেট + এলাকা শনাক্ত */
          m.on("dragend", () => {
            const p = m.getLatLng();
            const rla = Math.round(p.lat * 1e6) / 1e6;
            const rln = Math.round(p.lng * 1e6) / 1e6;
            setLat(rla);
            setLng(rln);
            reverseSuggest(rla, rln);
          });
          markerRef.current = m;
        }
        if (suggest) reverseSuggest(la, ln);
      };
      if (lat != null && lng != null) markAt(lat, lng);
      map.on("click", (ev: import("leaflet").LeafletMouseEvent) => {
        const la = Math.round(ev.latlng.lat * 1e6) / 1e6;
        const ln = Math.round(ev.latlng.lng * 1e6) / 1e6;
        setLat(la);
        setLng(ln);
        markAt(la, ln, true);
      });
      mapRef.current = map;
      panRef.current = (la: number, ln: number) => {
        map.setView([la, ln], 15);
        markAt(la, ln);
      };
    })();
    return () => {
      cancelled = true;
      panRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setErr("এই ডিভাইসে অবস্থান সেবা নেই");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = Math.round(pos.coords.latitude * 1e6) / 1e6;
        const ln = Math.round(pos.coords.longitude * 1e6) / 1e6;
        setLat(la);
        setLng(ln);
        if (panRef.current) panRef.current(la, ln);
        reverseSuggest(la, ln);
      },
      () => setErr("অবস্থান নেওয়া যায়নি — ম্যাপে ক্লিক করে বসান")
    );
  }

  function clearLocation() {
    setLat(null);
    setLng(null);
    if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
  }

  /* ---------- ধাপ নেভিগেশন ---------- */
  async function handleNext() {
    const e = validateStep(step);
    if (e) {
      setErr(e);
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      if (mode === "new" && !draftId && step === 2) {
        // ভাড়া-ধাপ শেষে খসড়া তৈরি (ছবির জন্য id লাগবে)
        const { id } = await createListingDraft(collect());
        setDraftId(id);
      } else if (mode === "new" && draftId && step <= 2) {
        await updateListing(draftId, collect());
      } else if (mode === "new" && draftId && step === 3) {
        await updateListing(draftId, { amenities });
      }
      setStep(step + 1);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "সংরক্ষণ করা যায়নি");
    } finally {
      setBusy(false);
    }
  }

  async function handleFinal() {
    setErr(null);
    setBusy(true);
    try {
      if (mode === "new") {
        if (!draftId) throw new Error("আগে খসড়া সংরক্ষণ করুন");
        await updateListing(draftId, { amenities });
        await setListingStatus(draftId, "pending");
      } else {
        if (!propertyId) throw new Error("বিজ্ঞাপন পাওয়া যায়নি");
        for (let s = 0; s <= 2; s++) {
          const e = validateStep(s);
          if (e) {
            setStep(s);
            throw new Error(e);
          }
        }
        await updateListing(propertyId, collect());
      }
      router.push("/landlord");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "জমা দেওয়া যায়নি");
    } finally {
      setBusy(false);
    }
  }

  /* ---------- ছবি ---------- */
  const pid = draftId ?? propertyId ?? null;

  async function refreshImages(id: string) {
    const { data } = await sbBrowser()
      .from("property_images")
      .select("id, storage_path, is_primary, sort_order")
      .eq("property_id", id)
      .order("sort_order");
    if (data) setImages(data as ListingImage[]);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || !pid) return;
    setPhotoErr(null);
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        setPhotoErr(`"${file.name}" ছবি ফাইল নয় — শুধু ছবি দিন`);
        continue;
      }
      if (file.size > MAX_FILE) {
        setPhotoErr(`"${file.name}" ৫MB-এর বেশি বড় — ছোট ছবি দিন`);
        continue;
      }
      const path = `${pid}/${crypto.randomUUID()}.jpg`;
      setUploading(true);
      try {
        const { error } = await sbBrowser()
          .storage.from("property-images")
          .upload(path, file, { contentType: file.type });
        if (error) throw new Error(error.message);
        await addImages(pid, [path]);
        await refreshImages(pid);
      } catch (ex) {
        setPhotoErr(
          `আপলোড ব্যর্থ: ${ex instanceof Error ? ex.message : "অজানা ত্রুটি"}`
        );
      } finally {
        setUploading(false);
      }
    }
  }

  async function handlePrimary(id: string) {
    if (!pid) return;
    try {
      await setPrimaryImage(pid, id);
      await refreshImages(pid);
    } catch (ex) {
      setPhotoErr(ex instanceof Error ? ex.message : "প্রধান ছবি বদলানো যায়নি");
    }
  }

  async function handleMove(id: string, dir: -1 | 1) {
    if (!pid) return;
    const order = [...images].sort((a, b) => a.sort_order - b.sort_order);
    const i = order.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    setImages(order);
    try {
      await reorderImages(pid, order.map((x) => x.id));
    } catch (ex) {
      setPhotoErr(ex instanceof Error ? ex.message : "ক্রম বদলানো যায়নি");
      await refreshImages(pid);
    }
  }

  async function handleDelete(id: string) {
    if (!pid) return;
    if (!window.confirm("এই ছবিটি মুছে ফেলবেন?")) return;
    try {
      await deleteImage(pid, id);
      await refreshImages(pid);
    } catch (ex) {
      setPhotoErr(ex instanceof Error ? ex.message : "ছবি মোছা যায়নি");
    }
  }

  /* ---------- রেন্ডার ---------- */
  return (
    <div>
      <ol className={styles.steps}>
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`${styles.stepItem} ${
              i < step ? styles.done : i === step ? styles.now : ""
            }`}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <FormError message={err} />

      {step === 0 && (
        <div className={formCss.grid2}>
          <Field label="বিজ্ঞাপনের শিরোনাম" required>
            <input
              className={formCss.input}
              value={f.title}
              onChange={(e) => set("title")(e.target.value)}
              placeholder="যেমন: মিরসরাই বাজারে ২ বেডরুম ফ্ল্যাট"
              maxLength={120}
            />
          </Field>
          <Field label="বাসার ধরন" required>
            <select
              className={formCss.select}
              value={f.property_type}
              onChange={(e) => set("property_type")(e.target.value)}
            >
              {PROPERTY_TYPES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="বিবরণ">
              <textarea
                className={formCss.textarea}
                value={f.description}
                onChange={(e) => set("description")(e.target.value)}
                placeholder="বাসা সম্পর্কে বিস্তারিত লিখুন…"
                maxLength={2000}
              />
            </Field>
          </div>
          <Field label="জেলা" required>
            <input
              className={formCss.input}
              value={f.district}
              onChange={(e) => set("district")(e.target.value)}
              placeholder="যেমন: চট্টগ্রাম"
              maxLength={60}
            />
          </Field>
          <Field label="উপজেলা / থানা">
            <input
              className={formCss.input}
              value={f.upazila}
              onChange={(e) => set("upazila")(e.target.value)}
              placeholder="যেমন: মিরসরাই"
              maxLength={60}
            />
          </Field>
          <Field label="এলাকা" required>
            <input
              className={formCss.input}
              value={f.area}
              onChange={(e) => set("area")(e.target.value)}
              placeholder="যেমন: বাজার রোড"
              maxLength={80}
            />
          </Field>
          <Field label="সম্পূর্ণ ঠিকানা">
            <input
              className={formCss.input}
              value={f.address_text}
              onChange={(e) => set("address_text")(e.target.value)}
              placeholder="বাড়ি/হোল্ডিং নম্বরসহ"
              maxLength={200}
            />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div>
          <Field
            label="ম্যাপে ক্লিক করে বাসার অবস্থান বসান"
            hint="পিনটি টেনেও সরানো যায় — ভাড়াটিয়ারা বাসাখুঁজি ম্যাপে দেখতে পাবেন"
          >
            <div ref={mapEl} className={styles.mapBox} />
          </Field>
          {geoNote && <p className={styles.geoNote}>{geoNote}</p>}
          <div className={styles.coordRow}>
            {lat != null && lng != null ? (
              <>
                <code>
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </code>
                <button
                  type="button"
                  className={formCss.btnSmall + " " + formCss.btnDanger}
                  onClick={clearLocation}
                >
                  মুছে ফেলুন
                </button>
              </>
            ) : (
              <span>এখনো অবস্থান বসানো হয়নি</span>
            )}
            <button
              type="button"
              className={formCss.btnSmall + " " + formCss.btnOutline}
              onClick={useMyLocation}
            >
              আমার বর্তমান অবস্থান
            </button>
          </div>
          <div style={{ marginTop: 14 }}>
            <Field label="কবে থেকে ভাড়া দেওয়া যাবে">
              <input
                type="date"
                className={formCss.input}
                value={f.available_from}
                onChange={(e) => set("available_from")(e.target.value)}
              />
            </Field>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={formCss.grid2}>
          <Field label="মাসিক ভাড়া (টাকা)" required>
            <input
              type="number"
              min={0}
              className={formCss.input}
              value={f.monthly_rent}
              onChange={(e) => set("monthly_rent")(e.target.value)}
              placeholder="যেমন: ৮০০০"
            />
          </Field>
          <Field label="অগ্রিম (টাকা)">
            <input
              type="number"
              min={0}
              className={formCss.input}
              value={f.advance_amount}
              onChange={(e) => set("advance_amount")(e.target.value)}
            />
          </Field>
          <Field label="জামানত (টাকা)">
            <input
              type="number"
              min={0}
              className={formCss.input}
              value={f.security_deposit}
              onChange={(e) => set("security_deposit")(e.target.value)}
            />
          </Field>
          <Field label="আসবাবের অবস্থা">
            <select
              className={formCss.select}
              value={f.furnished}
              onChange={(e) => set("furnished")(e.target.value)}
            >
              {FURNISHED_OPTS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="বেডরুম">
            <input
              type="number"
              min={0}
              className={formCss.input}
              value={f.bedrooms}
              onChange={(e) => set("bedrooms")(e.target.value)}
            />
          </Field>
          <Field label="বাথরুম">
            <input
              type="number"
              min={0}
              className={formCss.input}
              value={f.bathrooms}
              onChange={(e) => set("bathrooms")(e.target.value)}
            />
          </Field>
          <Field label="আয়তন (বর্গফুট)">
            <input
              type="number"
              min={0}
              className={formCss.input}
              value={f.size_sqft}
              onChange={(e) => set("size_sqft")(e.target.value)}
            />
          </Field>
          <Field label="তলা নম্বর">
            <input
              type="number"
              min={0}
              className={formCss.input}
              value={f.floor_no}
              onChange={(e) => set("floor_no")(e.target.value)}
            />
          </Field>
        </div>
      )}

      {step === 3 && (
        <div>
          <p className={formCss.hint} style={{ marginTop: 0 }}>
            বাসায় যেসব সুবিধা আছে টিক দিন
          </p>
          <div className={styles.amenGrid}>
            {AMENITY_OPTS.map(([slug, label]) => (
              <label
                key={slug}
                className={`${styles.amenItem} ${
                  amenities.includes(slug) ? styles.on : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={amenities.includes(slug)}
                  onChange={() => toggleAmenity(slug)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <FormError message={photoErr} />
          <label className={styles.fileLabel}>
            📷 ছবি যোগ করুন (সর্বোচ্চ ৫MB প্রতিটি)
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {uploading && <p className={styles.uploading}>আপলোড হচ্ছে…</p>}
          {images.length === 0 ? (
            <p className={formCss.hint}>এখনো কোনো ছবি যোগ করা হয়নি</p>
          ) : (
            <div className={styles.photoGrid}>
              {[...images]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((img, i, arr) => (
                  <div key={img.id} className={styles.photoCard}>
                    {img.is_primary && (
                      <span className={styles.primaryBadge}>প্রধান</span>
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={publicImageUrl(img.storage_path)} alt="বাসার ছবি" />
                    <div className={styles.photoBtns}>
                      {!img.is_primary && (
                        <button
                          type="button"
                          className={styles.miniBtn}
                          onClick={() => handlePrimary(img.id)}
                        >
                          প্রধান করুন
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.miniBtn}
                        disabled={i === 0}
                        onClick={() => handleMove(img.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={styles.miniBtn}
                        disabled={i === arr.length - 1}
                        onClick={() => handleMove(img.id, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={styles.miniBtn}
                        onClick={() => handleDelete(img.id)}
                      >
                        মুছুন
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <div className={formCss.btnRow}>
        {step > 0 && (
          <button
            type="button"
            className={formCss.btnSmall + " " + formCss.btnOutline}
            disabled={busy}
            onClick={() => {
              setErr(null);
              setStep(step - 1);
            }}
          >
            ← পেছনে
          </button>
        )}
        {step < 4 && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={handleNext}
          >
            {busy
              ? "অপেক্ষা করুন…"
              : mode === "new" && step === 2
              ? "খসড়া সংরক্ষণ"
              : "পরবর্তী →"}
          </button>
        )}
        {step === 4 && (
          <button
            type="button"
            className="btn btn-accent"
            disabled={busy}
            onClick={handleFinal}
          >
            {busy
              ? "অপেক্ষা করুন…"
              : mode === "new"
              ? "পর্যালোচনার জন্য জমা দিন"
              : "পরিবর্তন সংরক্ষণ"}
          </button>
        )}
        {mode === "new" && draftId && (
          <Link href="/landlord" className={formCss.btnSmall + " " + formCss.btnOutline}>
            পরে শেষ করব
          </Link>
        )}
      </div>
    </div>
  );
}

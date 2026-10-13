# বাসাখুঁজি বাংলাদেশ

বাড়িওয়ালা, ভাড়াটিয়া ও প্রশাসকদের জন্য বাংলায় তৈরি, মোবাইল-ফার্স্ট বাসা ভাড়া মার্কেটপ্লেস।

শূন্য বাজেটে শুরু করার উপযোগী, নিরাপদ ও ভবিষ্যতে সম্প্রসারণযোগ্য — কোনো ভুয়া ফিচার নেই।

---

## প্রযুক্তি স্ট্যাক (লকড)

| স্তর | নির্বাচন |
|---|---|
| ফ্রন্টএন্ড | Next.js + TypeScript + React |
| হোস্টিং | Cloudflare Pages (ফ্রি প্ল্যান), `@opennextjs/cloudflare` অ্যাডাপ্টার দিয়ে |
| ব্যাকএন্ড + ডেটাবেস | Supabase — PostgreSQL + Auth + Storage + Edge Functions (ফ্রি প্ল্যান) |
| ম্যাপ | Leaflet + CARTO basemap CDN (সরাসরি `tile.openstreetmap.org` ব্যবহার করা যাবে না — টাইল ব্যবহার নীতিমালা অনুযায়ী) |
| সোর্স কন্ট্রোল | GitHub |

কার্ড বা বিলিং ছাড়া সবকিছু ফ্রি প্ল্যানের মধ্যে চলবে।

---

## ৮টি ফেজ

1. **ফেজ ১ — আর্কিটেকচার ও UI/UX:** প্রজেক্ট কাঠামো, ডেটাবেস স্কিমা, ডিজাইন টোকেন ✅ (বর্তমান)
2. **ফেজ ২ — ডেটাবেস, Authentication ও Access Control:** স্কিমা ডিপ্লয়, RLS পলিসি, রোল-ভিত্তিক অ্যাক্সেস
3. **ফেজ ৩ — Property Listing, Image Upload ও Search:** বিজ্ঞাপন তৈরি/সম্পাদনা, ছবি আপলোড, সার্চ ইঞ্জিন
4. **ফেজ ৪ — Admin Panel, Moderation ও Notice Center:** অনুমোদন, নোটিশ বার, মডারেশন
5. **ফেজ ৫ — Map, Saved Properties ও Messaging:** ম্যাপ ভিউ, সংরক্ষিত বাসা, চ্যাট
6. **ফেজ ৬ — Security Testing, Backup ও Deployment:** নিরাপত্তা পরীক্ষা, ব্যাকআপ যাচাই, প্রোডাকশন ডিপ্লয়
7. **ফেজ ৭ — ব্যবহারকারীর প্রতিক্রিয়া অনুযায়ী উন্নয়ন**
8. **ফেজ ৮ — Payment Gateway ও Tenant Management** (বাজেট ও অনুমোদন সাপেক্ষে)

প্রতিটি ফেজের গ্রহণযোগ্যতার শর্ত পূরণ না হলে পরের ফেজে যাওয়া যাবে না।

---

## লোকাল ডেভেলপমেন্ট

```bash
npm install
cp .env.example .env.local
# .env.local-এ বসান: Supabase URL + publishable key (sb_publishable_..., নতুন)
# অথবা anon key (পুরনো "Legacy API keys" ট্যাব থেকে) — দুটোই চলে
npm run dev
```

ব্রাউজারে খুলুন: http://localhost:3000

Supabase ছাড়াও সাইটের কাঠামো (হোম, সার্চ ফর্ম) দেখা যাবে; ডেটা-নির্ভর ফিচার ফেজ ২-এর পরে সক্রিয় হবে।

---

## ডিপ্লয় রূপরেখা

1. GitHub-এ রিপোজিটরি তৈরি করুন (মালিকের অ্যাকাউন্টে)।
2. Cloudflare ড্যাশবোর্ডে Pages প্রজেক্ট তৈরি করে GitHub রিপোজিটরি সংযুক্ত করুন।
3. Environment variables-এ বসান: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (এতে নতুন `sb_publishable_...` কী অথবা পুরনো anon key — দুটোই চলে),
   `NEXT_PUBLIC_SITE_URL` (আসল ডোমেইন), এবং প্রয়োজনে `SUPABASE_SECRET_KEY`
   (নতুন `sb_secret_...` অথবা পুরনো service_role key — শুধু সার্ভার-সাইড,
   কখনোই `NEXT_PUBLIC_` নয়)।
4. Build command: `npx @opennextjs/cloudflare build`, deploy command: `npx @opennextjs/cloudflare deploy`।
5. প্রতিটি push-এ স্বয়ংক্রিয় build ও deploy হবে। ফ্রি প্ল্যানে মাসে ৫০০ build ও unlimited ব্যান্ডউইথ।

---

## মালিকানা

GitHub repository, Supabase প্রজেক্ট, Cloudflare অ্যাকাউন্ট, ভবিষ্যতে ডোমেইন ও পেমেন্ট অ্যাকাউন্ট — সবকিছু প্রকল্পের মালিকের নামে ও নিয়ন্ত্রণে থাকবে। ডেভেলপারকে শুধু সীমিত অনুমতি দেওয়া হবে। মালিকের লিখিত অনুমোদন ছাড়া কোনো পেইড সেবা চালু করা যাবে না।

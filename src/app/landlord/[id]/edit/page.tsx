import "leaflet/dist/leaflet.css";
import { redirect, notFound } from "next/navigation";
import { getUser, getRole, isStaffRole } from "../../../_lib/server";
import { PageHeader } from "../../../_components/ui";
import { SiteHeader } from "@/components/ui";
import type { UserRole } from "@/lib/database.types";
import ListingForm, {
  type ListingInitial,
} from "../../_components/ListingForm";
import formCss from "../../../_components/forms.module.css";

export const dynamic = "force-dynamic";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { sb, user } = await getUser();
  if (!user) redirect("/auth/login");
  const role = await getRole();
  if (role !== "landlord" && !isStaffRole(role)) redirect("/dashboard");

  const { data, error } = await sb
    .from("properties")
    .select(
      "*, property_images(id, storage_path, is_primary, sort_order), property_amenities(amenity)"
    )
    .eq("id", id)
    .single();

  if (error || !data) notFound();
  if (data.landlord_id !== user.id && !isStaffRole(role)) notFound();

  const initial: ListingInitial = {
    title: data.title ?? "",
    description: data.description ?? "",
    property_type: data.property_type ?? "flat",
    district: data.district ?? "",
    upazila: data.upazila ?? "",
    area: data.area ?? "",
    address_text: data.address_text ?? "",
    latitude: data.latitude,
    longitude: data.longitude,
    monthly_rent: data.monthly_rent,
    advance_amount: data.advance_amount,
    security_deposit: data.security_deposit,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    size_sqft: data.size_sqft,
    floor_no: data.floor_no,
    furnished: data.furnished ?? "unfurnished",
    available_from: data.available_from,
    amenities: (data.property_amenities ?? []).map(
      (a: { amenity: string }) => a.amenity
    ),
    images: (data.property_images ?? []).map(
      (i: {
        id: string;
        storage_path: string;
        is_primary: boolean;
        sort_order: number;
      }) => i
    ),
  };

  return (
    <>
      <SiteHeader
        name={(user.user_metadata?.full_name as string | undefined) ?? null}
        role={role as UserRole}
        isStaff={isStaffRole(role)}
      />
      <main className="container">
        <PageHeader
          title="বিজ্ঞাপন সম্পাদনা"
          subtitle={data.title}
        />
        <div className={formCss.sectionCard}>
          <ListingForm mode="edit" propertyId={data.id} initial={initial} />
        </div>
      </main>
    </>
  );
}

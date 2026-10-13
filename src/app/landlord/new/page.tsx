import "leaflet/dist/leaflet.css";
import { redirect } from "next/navigation";
import { getUser, getRole, isStaffRole } from "../../_lib/server";
import { PageHeader } from "../../_components/ui";
import { SiteHeader } from "@/components/ui";
import type { UserRole } from "@/lib/database.types";
import ListingForm from "../_components/ListingForm";
import formCss from "../../_components/forms.module.css";

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  const { user } = await getUser();
  if (!user) redirect("/auth/login");
  const role = await getRole();
  if (role !== "landlord" && !isStaffRole(role)) redirect("/dashboard");

  return (
    <>
      <SiteHeader
        name={(user.user_metadata?.full_name as string | undefined) ?? null}
        role={role as UserRole}
        isStaff={isStaffRole(role)}
      />
      <main className="container">
        <PageHeader
          title="নতুন বিজ্ঞাপন"
          subtitle="ধাপে ধাপে তথ্য দিন — খসড়া যেকোনো সময় সংরক্ষণ করা যাবে"
        />
        <div className={formCss.sectionCard}>
          <ListingForm mode="new" />
        </div>
      </main>
    </>
  );
}

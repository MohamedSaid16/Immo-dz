import Link from "next/link";
import { Plus } from "lucide-react";

import { PropertiesTable } from "./properties-table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getCurrentAgencyId,
  listArchivedProperties,
  listPropertiesForAgency,
} from "@/lib/properties";

export default async function PropertiesPage() {
  const agencyId = await getCurrentAgencyId();
  const [active, archived] = agencyId
    ? await Promise.all([
        listPropertiesForAgency(agencyId),
        listArchivedProperties(agencyId),
      ])
    : [[], []];
  const properties = [...active, ...archived];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">العقارات</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {properties.length} عقار — أدر عقارات وكالتك من مكان واحد.
          </p>
        </div>
        <Link
          href="/dashboard/properties/add"
          className={cn(buttonVariants({ size: "lg" }))}
        >
          <Plus />
          إضافة عقار
        </Link>
      </div>

      <PropertiesTable properties={properties} />
    </div>
  );
}

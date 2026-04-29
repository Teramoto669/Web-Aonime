import { getFilters } from "@/lib/api";
import { FilterMenu } from "./FilterMenu";

export async function FilterMenuContainer() {
  const filtersData = await getFilters().catch(() => null);
  
  if (!filtersData) {
    return null;
  }
  
  return <FilterMenu filtersData={filtersData} />;
}

import { useRouter as useNextRouter } from "next/navigation";
import { useNavigation } from "@/components/layout/NavigationProvider";

export function useRouter() {
  const router = useNextRouter();
  const { startNavigation, isNavigating } = useNavigation();

  return {
    ...router,
    push: (href: string, options?: any) => {
      if (isNavigating) return;
      startNavigation();
      router.push(href, options);
    },
    replace: (href: string, options?: any) => {
      if (isNavigating) return;
      startNavigation();
      router.replace(href, options);
    },
  };
}

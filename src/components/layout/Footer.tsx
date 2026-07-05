import { FooterSchedule } from "@/components/schedule/FooterSchedule";

export default function Footer() {
  return (
    <footer className="border-t py-8 text-center text-sm text-muted-foreground mt-8">
      {/* Daily airing schedule */}
      <FooterSchedule />

      <p>&copy; {new Date().getFullYear()} Web Aonime. All rights reserved.</p>
    </footer>
  );
}



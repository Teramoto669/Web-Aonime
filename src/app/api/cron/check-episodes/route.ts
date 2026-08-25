import { NextResponse } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebase-admin';
import { getAnimeSlug, type AnimeListItem } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max execution time for Vercel functions

export async function GET(request: Request) {
  try {
    // 1. Verify Vercel Cron secret (enforces fail-closed auth in production or if CRON_SECRET is set)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd || cronSecret) {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
      }
    }

    // 2. Fetch all user library items marked as "watching"
    const libSnap = await adminDb
      .collection('libraries')
      .where('status', '==', 'watching')
      .get();

    if (libSnap.empty) {
      return NextResponse.json({
        ok: true,
        message: 'No watching items found across user libraries.',
      });
    }

    const watchingAnimes = libSnap.docs.map((doc: FirebaseFirestore.DocumentData) => doc.data());

    // 3. Fetch recent episode updates from internal API endpoint
    const baseUrl = process.env.API_BASE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { ok: false, message: 'API_BASE_URL environment variable is missing' },
        { status: 500 }
      );
    }

    const res = await fetch(`${baseUrl}/updated?refresh=1`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Upstream anime API error: ${res.status}`);
    }

    const latestJson = await res.json();
    const latestEpisodes: AnimeListItem[] = Array.isArray(latestJson.data)
      ? latestJson.data
      : latestJson.data?.results || [];

    if (latestEpisodes.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No latest episodes found from API.',
      });
    }

    // 4. Match watching items against latest episodes and write notifications
    const batch = adminDb.batch();
    let createdCount = 0;

    for (const apiAnime of latestEpisodes) {
      const apiSlug = getAnimeSlug(apiAnime);
      const latestEpNum = apiAnime.episodes?.sub || 0;

      if (latestEpNum <= 0) continue;

      const matchedLibs = watchingAnimes.filter(
        (la: Record<string, any>) =>
          la.animeId === apiAnime.id ||
          (apiSlug && la.slug === apiSlug)
      );

      for (const matchedLib of matchedLibs) {
        const userId = matchedLib.userId;
        if (!userId) continue;
        const safeSlug = String(matchedLib.slug || matchedLib.animeId || "anime").replace(/\//g, "_").toLowerCase().trim();
        const notifId = `lib_update_${userId}_${safeSlug}_${latestEpNum}`;
        const altId = `lib_update_${userId}_${String(matchedLib.animeId || "").replace(/\//g, "_")}_${latestEpNum}`;

        const notifRef = adminDb.collection('notifications').doc(notifId);
        const altRef = adminDb.collection('notifications').doc(altId);

        const [notifSnap, altSnap] = await Promise.all([notifRef.get(), altRef.get()]);

        if (!notifSnap.exists && !altSnap.exists) {
          batch.set(notifRef, {
            userId,
            type: 'library_update',
            title: 'Library Update',
            message: `Episode ${latestEpNum} of "${matchedLib.title}" is now available!`,
            link: `/watch/${matchedLib.slug || safeSlug}?ep=${latestEpNum}`,
            isRead: false,
            createdAt: FieldValue.serverTimestamp(),
            animeId: matchedLib.slug || matchedLib.animeId,
            episodeNum: latestEpNum,
          });
          createdCount++;
        }
      }
    }

    if (createdCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      ok: true,
      message: `Checked ${watchingAnimes.length} watching items. Created ${createdCount} new notification(s).`,
      notificationsCreated: createdCount,
    });
  } catch (err: any) {
    console.error('Error in cron check-episodes:', err);
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}


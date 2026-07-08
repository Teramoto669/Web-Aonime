import Image from 'next/image';
import Link from 'next/link';
import type { AnimeListItem } from '@/lib/types';
import { getAnimeSlug } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { PlayIcon } from 'lucide-react';
import { AnimeTooltip } from './AnimeTooltip';

interface RecommendationsSectionProps {
    recommendations: AnimeListItem[];
}

function RecommendationCard({ item }: { item: AnimeListItem }) {
    const slug = getAnimeSlug(item);
    const href = slug ? `/anime/${slug}` : '#';

    const content = (
        <div className="group flex-shrink-0 w-[130px] sm:w-[150px]">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md shadow-md transition-transform duration-300 group-hover:scale-105">
                <Image
                    src={item.image || '/placeholder.jpg'}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 130px, 150px"
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30">
                    <PlayIcon className="h-10 w-10 text-white drop-shadow-lg" />
                </div>
                {item.type && (
                    <Badge className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 capitalize border-0 bg-primary/90 text-primary-foreground">
                        {item.type}
                    </Badge>
                )}
            </div>
            <p className="mt-2 text-xs sm:text-sm font-medium leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                {item.title}
            </p>
        </div>
    );

    return (
        <AnimeTooltip id={item.id} fallbackTitle={item.title}>
            <Link href={href}>{content}</Link>
        </AnimeTooltip>
    );
}

export function RecommendationsSection({ recommendations }: RecommendationsSectionProps) {
    if (!recommendations || recommendations.length === 0) return null;

    return (
        <section className="space-y-4">
            <style>{`
                .recommendations-scroll::-webkit-scrollbar {
                    height: 4px;
                }
                .recommendations-scroll::-webkit-scrollbar-track {
                    background: transparent;
                    border-radius: 9999px;
                }
                .recommendations-scroll::-webkit-scrollbar-thumb {
                    background: hsl(var(--primary) / 0.4);
                    border-radius: 9999px;
                }
                .recommendations-scroll::-webkit-scrollbar-thumb:hover {
                    background: hsl(var(--primary) / 0.7);
                }
                .recommendations-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: hsl(var(--primary) / 0.4) transparent;
                }
            `}</style>
            <div className="flex items-center gap-3">
                <div className="h-6 w-1 rounded-full bg-primary" />
                <h2 className="text-xl font-bold">Recommended Anime</h2>
                <span className="text-sm text-muted-foreground ml-auto">{recommendations.length} titles</span>
            </div>
            <div className="recommendations-scroll flex gap-4 overflow-x-auto pb-3">
                {recommendations.map((item) => (
                    <RecommendationCard key={item.id ?? item.title} item={item} />
                ))}
            </div>
        </section>
    );
}

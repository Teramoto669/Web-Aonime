import Image from 'next/image';
import Link from 'next/link';
import type { RelatedAnime } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { PlayIcon } from 'lucide-react';

interface RelatedSectionProps {
    related: RelatedAnime[];
}

function getRelatedSlug(item: RelatedAnime): string | null {
    if (item.slug) return item.slug;
    if (item.href) {
        // Extract slug from URLs like https://anikoto.net/watch/slug-here
        const match = item.href.match(/\/watch\/([^/?#]+)/);
        if (match?.[1]) return match[1];
        // Fallback: last path segment
        const parts = item.href.replace(/\/$/, '').split('/').filter(Boolean);
        if (parts.length > 0) return parts[parts.length - 1];
    }
    return null;
}

function RelatedCard({ item }: { item: RelatedAnime }) {
    const slug = getRelatedSlug(item);
    const href = slug ? `/anime/${slug}` : (item.href ?? '#');
    const isExternal = !slug && item.href?.startsWith('http');

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
                {item.relation && (
                    <Badge className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 capitalize border-0 bg-primary/90 text-primary-foreground">
                        {item.relation}
                    </Badge>
                )}
            </div>
            <p className="mt-2 text-xs sm:text-sm font-medium leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                {item.title}
            </p>
        </div>
    );

    if (isExternal) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer">
                {content}
            </a>
        );
    }

    return <Link href={href}>{content}</Link>;
}

export function RelatedSection({ related }: RelatedSectionProps) {
    if (!related || related.length === 0) return null;

    return (
        <section className="space-y-4">
            <style>{`
                .related-scroll::-webkit-scrollbar {
                    height: 4px;
                }
                .related-scroll::-webkit-scrollbar-track {
                    background: transparent;
                    border-radius: 9999px;
                }
                .related-scroll::-webkit-scrollbar-thumb {
                    background: hsl(var(--primary) / 0.4);
                    border-radius: 9999px;
                }
                .related-scroll::-webkit-scrollbar-thumb:hover {
                    background: hsl(var(--primary) / 0.7);
                }
                .related-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: hsl(var(--primary) / 0.4) transparent;
                }
            `}</style>
            <div className="flex items-center gap-3">
                <div className="h-6 w-1 rounded-full bg-primary" />
                <h2 className="text-xl font-bold">Related Anime</h2>
                <span className="text-sm text-muted-foreground ml-auto">{related.length} titles</span>
            </div>
            <div className="related-scroll flex gap-4 overflow-x-auto pb-3">
                {related.map((item) => (
                    <RelatedCard key={item.id ?? item.title} item={item} />
                ))}
            </div>
        </section>
    );
}

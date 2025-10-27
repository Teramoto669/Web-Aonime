"use client";

import Image from "next/image";
import Link from 'next/link';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Info } from 'lucide-react';
import type { SpotlightAnime } from "@/lib/types";
import Autoplay from "embla-carousel-autoplay"

type SpotlightCarouselProps = {
  animes: SpotlightAnime[];
};

export function SpotlightCarousel({ animes }: SpotlightCarouselProps) {
  return (
    <div className="w-full relative">
      <Carousel
        className="w-full"
        plugins={[
          Autoplay({
            delay: 5000,
            stopOnInteraction: true,
          }),
        ]}
        opts={{
          loop: true,
        }}
      >
        <CarouselContent>
          {animes.map((anime) => (
            <CarouselItem key={anime.id}>
              <div className="w-full h-[40vh] md:h-[60vh] lg:h-[80vh] relative">
                <div className="absolute inset-0">
                  <Image
                    src={anime.poster}
                    alt={anime.name}
                    fill
                    className="object-cover brightness-50"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
                </div>
                <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-end pb-12 md:pb-20">
                  <div className="md:w-3/4 lg:w-1/2 space-y-4">
                    <Badge className="text-lg bg-primary/90 text-primary-foreground">Spotlight #{anime.rank}</Badge>
                    <h1 className="text-3xl md:text-5xl font-black text-white drop-shadow-lg leading-tight">
                      {anime.name}
                    </h1>
                    <p className="text-sm md:text-base text-gray-300 line-clamp-3">
                      {anime.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {anime.otherInfo.map((info, index) => (
                         <Badge key={index} variant="secondary">{info}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 pt-4">
                      <Button asChild size="lg">
                        <Link href={`/watch/${anime.id}?ep=1`}>
                          <PlayCircle className="mr-2 h-5 w-5" /> Watch Now
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="lg">
                         <Link href={`/anime/${anime.id}`}>
                           <Info className="mr-2 h-5 w-5" /> Details
                         </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="absolute bottom-4 right-4 md:bottom-10 md:right-10 z-10 flex gap-2">
            <CarouselPrevious className="relative translate-x-0 translate-y-0 left-0 top-0"/>
            <CarouselNext className="relative translate-x-0 translate-y-0 left-0 top-0"/>
        </div>
      </Carousel>
    </div>
  );
}

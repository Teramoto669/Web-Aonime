
"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CharacterVoiceActor } from "@/lib/types";

type CharactersProps = {
  characters: CharacterVoiceActor[];
};

export function Characters({ characters }: CharactersProps) {
  if (!characters || characters.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-2xl font-bold mb-4">Characters & Voice Actors</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {characters.map(({ character, voiceActor }) => (
          <Card key={character.id}>
            <CardContent className="p-4 flex gap-4 items-center">
              <div className="flex-shrink-0">
                <div className="relative h-16 w-16">
                  <Image
                    src={character.poster}
                    alt={character.name}
                    fill
                    className="rounded-full object-cover"
                  />
                </div>
              </div>
              <div className="flex-grow">
                <p className="font-semibold">{character.name}</p>
                <p className="text-sm text-muted-foreground">{character.cast}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                 <div className="relative h-16 w-16">
                    <Image
                        src={voiceActor.poster}
                        alt={voiceActor.name}
                        fill
                        className="rounded-full object-cover"
                    />
                 </div>
              </div>
               <div className="flex-grow">
                <p className="font-semibold text-right">{voiceActor.name}</p>
                <p className="text-sm text-muted-foreground text-right">{voiceActor.cast}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

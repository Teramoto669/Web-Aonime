"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useBlockedFilters } from "@/lib/blocked-filters-context";
import { useAuth } from "@/lib/auth-context";
import {
  ShieldAlert,
  Plus,
  X,
  RotateCcw,
  User,
  EyeOff,
  Eye,
  Tag,
  Film,
  Star,
  Search,
} from "lucide-react";

// Popular preset genres for quick toggling
const POPULAR_GENRES = [
  "Action",
  "Adventure",
  "Cars",
  "Comedy",
  "Dementia",
  "Demons",
  "Drama",
  "Ecchi",
  "Fantasy",
  "Game",
  "Harem",
  "Hentai",
  "Historical",
  "Horror",
  "Isekai",
  "Josei",
  "Kids",
  "Magic",
  "Martial Arts",
  "Mecha",
  "Military",
  "Music",
  "Mystery",
  "Parody",
  "Police",
  "Psychological",
  "Romance",
  "Samurai",
  "School",
  "Sci-Fi",
  "Seinen",
  "Shoujo",
  "Shoujo Ai",
  "Shounen",
  "Shounen Ai",
  "Slice of Life",
  "Space",
  "Sports",
  "Super Power",
  "Supernatural",
  "Thriller",
  "Vampire",
];

const PRESET_TYPES = ["Movie", "TV", "OVA", "Special", "ONA", "Music"];
const PRESET_RATINGS = ["G", "PG", "PG-13", "R - 17+", "R+", "Rx"];

export default function BlockedFiltersModal() {
  const { user, openAuthModal } = useAuth();
  const {
    blockedFilters,
    isModalOpen,
    closeModal,
    updateBlockedFilters,
    resetBlockedFilters,
  } = useBlockedFilters();

  const [customGenre, setCustomGenre] = useState("");
  const [customKeyword, setCustomKeyword] = useState("");

  const handleToggleGenre = (genre: string) => {
    const exists = blockedFilters.genres.some(
      (g) => g.toLowerCase() === genre.toLowerCase()
    );
    let updated: string[];
    if (exists) {
      updated = blockedFilters.genres.filter(
        (g) => g.toLowerCase() !== genre.toLowerCase()
      );
    } else {
      updated = [...blockedFilters.genres, genre];
    }
    updateBlockedFilters({ genres: updated });
  };

  const handleAddCustomGenre = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customGenre.trim();
    if (!trimmed) return;
    handleToggleGenre(trimmed);
    setCustomGenre("");
  };

  const handleToggleType = (type: string) => {
    const exists = blockedFilters.types.some(
      (t) => t.toLowerCase() === type.toLowerCase()
    );
    let updated: string[];
    if (exists) {
      updated = blockedFilters.types.filter(
        (t) => t.toLowerCase() !== type.toLowerCase()
      );
    } else {
      updated = [...blockedFilters.types, type];
    }
    updateBlockedFilters({ types: updated });
  };

  const handleToggleRating = (rating: string) => {
    const exists = blockedFilters.ratings.some(
      (r) => r.toLowerCase() === rating.toLowerCase()
    );
    let updated: string[];
    if (exists) {
      updated = blockedFilters.ratings.filter(
        (r) => r.toLowerCase() !== rating.toLowerCase()
      );
    } else {
      updated = [...blockedFilters.ratings, rating];
    }
    updateBlockedFilters({ ratings: updated });
  };

  const handleAddKeyword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customKeyword.trim();
    if (!trimmed) return;
    const exists = blockedFilters.keywords.some(
      (k) => k.toLowerCase() === trimmed.toLowerCase()
    );
    if (!exists) {
      updateBlockedFilters({
        keywords: [...blockedFilters.keywords, trimmed],
      });
    }
    setCustomKeyword("");
  };

  const handleRemoveKeyword = (keyword: string) => {
    updateBlockedFilters({
      keywords: blockedFilters.keywords.filter(
        (k) => k.toLowerCase() !== keyword.toLowerCase()
      ),
    });
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 bg-background/95 backdrop-blur-lg border-border/80">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Content Filter Blocklist
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Block specific genres, content ratings, types, or terms from appearing anywhere on Aonime.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Sync Status Banner */}
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/60 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              {user ? (
                <>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1 py-0.5">
                    <User className="w-3 h-3" /> Account Synced
                  </Badge>
                  <span className="text-muted-foreground">
                    Filters automatically apply across all your signed-in devices.
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">
                  Filters are saved in this browser.
                </span>
              )}
            </div>
            {!user && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 px-2"
                onClick={() => {
                  closeModal();
                  openAuthModal("login");
                }}
              >
                Sign In to Sync
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable Content Body */}
        <ScrollArea className="flex-1 p-6 pt-4 space-y-4">
          {/* Master Enable/Disable & Display Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-border/60 bg-card/50">
            {/* Master Toggle */}
            <div className="flex items-center justify-between pr-2">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold block">
                  Enable Blocklist Filter
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Turn filter blocking on or off
                </p>
              </div>
              <Switch
                checked={blockedFilters.enabled}
                onCheckedChange={(enabled) => updateBlockedFilters({ enabled })}
              />
            </div>

            {/* Display Mode */}
            <div className="space-y-1.5 pt-2 md:pt-0 md:border-l md:border-border/60 md:pl-4">
              <Label className="text-xs font-semibold text-muted-foreground">
                Action for Blocked Content
              </Label>
              <RadioGroup
                value={blockedFilters.mode}
                onValueChange={(mode: "hide" | "blur") =>
                  updateBlockedFilters({ mode })
                }
                className="flex items-center space-x-4 pt-1"
                disabled={!blockedFilters.enabled}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hide" id="mode-hide" />
                  <Label htmlFor="mode-hide" className="text-xs cursor-pointer flex items-center gap-1 font-medium">
                    <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> Hide completely
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="blur" id="mode-blur" />
                  <Label htmlFor="mode-blur" className="text-xs cursor-pointer flex items-center gap-1 font-medium">
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" /> Blur card
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Tabs for Category Blocklists */}
          <Tabs defaultValue="genres" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-3 bg-muted/60">
              <TabsTrigger value="genres" className="text-xs gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Blocked Genres
                {blockedFilters.genres.length > 0 && (
                  <Badge className="ml-1 px-1.5 py-0 text-[10px] h-4 bg-primary/20 text-primary border-0 font-bold">
                    {blockedFilters.genres.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="types" className="text-xs gap-1.5">
                <Film className="w-3.5 h-3.5" /> Type & Rating
                {blockedFilters.types.length + blockedFilters.ratings.length > 0 && (
                  <Badge className="ml-1 px-1.5 py-0 text-[10px] h-4 bg-primary/20 text-primary border-0 font-bold">
                    {blockedFilters.types.length + blockedFilters.ratings.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="keywords" className="text-xs gap-1.5">
                <Search className="w-3.5 h-3.5" /> Custom Terms
                {blockedFilters.keywords.length > 0 && (
                  <Badge className="ml-1 px-1.5 py-0 text-[10px] h-4 bg-primary/20 text-primary border-0 font-bold">
                    {blockedFilters.keywords.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* TAB: Genres */}
            <TabsContent value="genres" className="space-y-4 pt-3">
              {/* Custom Genre / Search Input at TOP */}
              <form onSubmit={handleAddCustomGenre} className="flex gap-2 py-1 px-1">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search or add custom genre to block (e.g. Gore, Isekai)..."
                    value={customGenre}
                    onChange={(e) => setCustomGenre(e.target.value)}
                    className="h-9 text-xs pl-8 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
                  />
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
                </div>
                <Button type="submit" size="sm" className="h-9 px-3 gap-1 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </form>

              {/* Preset Genres Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-muted-foreground font-medium">
                    Select genres to block from your feed:
                  </Label>
                  {customGenre.trim() && (
                    <span className="text-[10px] text-muted-foreground">
                      Filtering presets for &quot;{customGenre}&quot;
                    </span>
                  )}
                </div>
                <div className="max-h-44 overflow-y-auto pr-2.5 flex flex-wrap gap-2 custom-scrollbar">
                  {POPULAR_GENRES.filter((genre) =>
                    genre.toLowerCase().includes(customGenre.toLowerCase().trim())
                  ).map((genre) => {
                    const isBlocked = blockedFilters.genres.some(
                      (g) => g.toLowerCase() === genre.toLowerCase()
                    );
                    return (
                      <Button
                        key={genre}
                        type="button"
                        variant={isBlocked ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => handleToggleGenre(genre)}
                        className={`h-8 rounded-full px-3 text-xs transition-all ${
                          isBlocked
                            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
                            : "hover:border-destructive hover:text-destructive"
                        }`}
                      >
                        {isBlocked && <X className="w-3 h-3 mr-1" />}
                        {genre}
                      </Button>
                    );
                  })}
                  {POPULAR_GENRES.filter((genre) =>
                    genre.toLowerCase().includes(customGenre.toLowerCase().trim())
                  ).length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-2">
                      No preset genre matching &quot;{customGenre}&quot;. Click &quot;+ Add&quot; above to add it as a custom blocked genre.
                    </p>
                  )}
                </div>
              </div>

              {/* Currently Blocked Custom Genres */}
              {blockedFilters.genres.filter(
                (g) => !POPULAR_GENRES.some((p) => p.toLowerCase() === g.toLowerCase())
              ).length > 0 && (
                <div className="pt-2 border-t border-border/40">
                  <Label className="text-xs font-medium text-muted-foreground block mb-2">
                    Custom Blocked Genres:
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {blockedFilters.genres
                      .filter(
                        (g) =>
                          !POPULAR_GENRES.some(
                            (p) => p.toLowerCase() === g.toLowerCase()
                          )
                      )
                      .map((genre) => (
                        <Badge
                          key={genre}
                          variant="destructive"
                          className="px-2.5 py-1 text-xs flex items-center gap-1.5 rounded-full"
                        >
                          {genre}
                          <X
                            className="w-3 h-3 cursor-pointer hover:opacity-80"
                            onClick={() => handleToggleGenre(genre)}
                          />
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB: Types & Ratings */}
            <TabsContent value="types" className="space-y-5 pt-3">
              {/* Types Section */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Film className="w-3.5 h-3.5 text-primary" /> Blocked Content Types
                </Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TYPES.map((type) => {
                    const isBlocked = blockedFilters.types.some(
                      (t) => t.toLowerCase() === type.toLowerCase()
                    );
                    return (
                      <Button
                        key={type}
                        type="button"
                        variant={isBlocked ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => handleToggleType(type)}
                        className={`h-8 rounded-md px-3 text-xs ${
                          isBlocked
                            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            : ""
                        }`}
                      >
                        {isBlocked && <X className="w-3 h-3 mr-1" />}
                        {type}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Ratings Section */}
              <div className="space-y-2 pt-3 border-t border-border/40">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Star className="w-3.5 h-3.5 text-amber-500" /> Blocked Age Ratings
                </Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_RATINGS.map((rating) => {
                    const isBlocked = blockedFilters.ratings.some(
                      (r) => r.toLowerCase() === rating.toLowerCase()
                    );
                    return (
                      <Button
                        key={rating}
                        type="button"
                        variant={isBlocked ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => handleToggleRating(rating)}
                        className={`h-8 rounded-md px-3 text-xs ${
                          isBlocked
                            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            : ""
                        }`}
                      >
                        {isBlocked && <X className="w-3 h-3 mr-1" />}
                        {rating}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* TAB: Custom Keyword Terms */}
            <TabsContent value="keywords" className="space-y-4 pt-3">
              <p className="text-xs text-muted-foreground">
                Block anime titles or synopses containing specific keywords (e.g. &quot;isekai&quot;, &quot;nnt&quot;).
              </p>
              <form onSubmit={handleAddKeyword} className="flex gap-2 py-1 px-1">
                <Input
                  placeholder="Enter word or title to block..."
                  value={customKeyword}
                  onChange={(e) => setCustomKeyword(e.target.value)}
                  className="h-9 text-xs focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
                />
                <Button type="submit" size="sm" className="h-9 px-3 gap-1 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Add Keyword
                </Button>
              </form>

              {/* Active Keywords */}
              <div className="pt-2">
                <Label className="text-xs font-medium text-muted-foreground block mb-2">
                  Active Keyword Blocklist ({blockedFilters.keywords.length}):
                </Label>
                {blockedFilters.keywords.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No custom terms added yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {blockedFilters.keywords.map((kw) => (
                      <Badge
                        key={kw}
                        variant="secondary"
                        className="px-2.5 py-1 text-xs flex items-center gap-1.5 bg-destructive/15 text-destructive border border-destructive/30"
                      >
                        &quot;{kw}&quot;
                        <X
                          className="w-3 h-3 cursor-pointer hover:opacity-80"
                          onClick={() => handleRemoveKeyword(kw)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border/50 bg-background flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => resetBlockedFilters()}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
          </Button>

          <Button type="button" size="sm" onClick={closeModal} className="px-6 font-semibold">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

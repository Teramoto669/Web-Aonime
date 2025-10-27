# **App Name**: Aonime Stream

## Core Features:

- Anime Homepage: Display a curated homepage with various anime categories such as latest episodes, spotlight anime, top 10, top airing, and trending anime. Data is fetched from the aniwatch-api using the /api/v2/hianime/home endpoint.
- Anime Listing: Show a list of anime, sorted alphabetically or numerically, with pagination. Fetches data from /api/v2/hianime/azlist/{sortOption}?page={page} endpoint.
- Anime Quick Info: Display quick information about an anime on hover or click, including its score, type, and a brief description.  Data comes from the /api/v2/hianime/qtip/{animeId} endpoint.
- Anime Details: Show detailed information about a selected anime, including character/voice actor data, related anime, and season information. Uses the /api/v2/hianime/anime/{animeId} endpoint.
- Anime Search: Enable users to search for anime with basic and advanced filtering options (genres, type, sort, etc.). Uses the /api/v2/hianime/search endpoint.
- Search Suggestions: Provide real-time search suggestions as the user types in the search bar. Data is from the /api/v2/hianime/search/suggestion?q={query} endpoint.
- Anime Episodes: Lists the episodes for a particular anime. Uses the /api/v2/hianime/anime/{animeId}/episodes endpoint.

## Style Guidelines:

- Primary color: Indigo (#4B0082), conveying sophistication and calm befitting focused viewing.
- Background color: Very dark gray (#1A1A1A), nearly black, provides a distraction-free backdrop.
- Accent color: Cyan (#00FFFF) to highlight interactive elements and calls to action.
- Font: 'Inter', sans-serif, for both headlines and body text. Note: currently only Google Fonts are supported.
- Use simple, consistent icons for navigation and controls (play, search, etc.).
- A minimal layout focused on showcasing anime posters, with a clean, intuitive navigation.
- Subtle animations for transitions and loading states to enhance user experience.
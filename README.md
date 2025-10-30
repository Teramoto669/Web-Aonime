## Rust M3U8 proxy configuration

The video player can be configured to use an external Rust-based m3u8 proxy (recommended) which accepts `url`, `headers` and `origin` query parameters.

Set the proxy base URL in your environment using the `NEXT_PUBLIC_RUST_PROXY` variable. Example values:

- `http://127.0.0.1:8080` (default used when not set)
- `http://your-proxy.example.com`

You can set it locally in a `.env.local` file at the project root:

```
NEXT_PUBLIC_RUST_PROXY=http://127.0.0.1:8080
```

Or export it in your shell before running the dev server. On PowerShell:

```powershell
$env:NEXT_PUBLIC_RUST_PROXY='http://127.0.0.1:8080'; npm run dev
```

If `NEXT_PUBLIC_RUST_PROXY` is not set, the player falls back to `http://127.0.0.1:8080`.

## Features

- [Uses aniwatch-api](https://github.com/ghoshRitesh12/aniwatch-api)
- [Uses megaplay.buzz/api](https://megaplay.buzz/api)
- Browse anime
- Search anime
- View anime details
- Watch anime episodes

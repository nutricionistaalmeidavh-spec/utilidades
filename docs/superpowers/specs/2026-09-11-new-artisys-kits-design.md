# New ArtiSys Kits Design

## Scope

Implement all approved module suggestions except the duplicate POS hardware module: `artisys-video-engine`, `artisys-doc-convert`, `artisys-local-backend`, `artisys-remote-support`, `artisys-release`, `artisys-desktop-shell`, `artisys-ocr`, `artisys-product-qa`, and `artisys-licensing`.

## Architecture

All kits expose small ArtiSys contracts and keep heavyweight runtimes behind injected adapters/runners. No kit may create a mandatory paid dependency, always-on server, daemon, or silent copyleft linkage. GStreamer/MLT/libopenshot, Gotenberg, PocketBase, RustDesk and OCR engines are opt-in local runtimes. PowerToys and other complete applications are references only.

`artisys-licensing` uses Ed25519 signatures so client applications contain only the public verification key; private signing keys stay outside shipped products.

## Verification

Each new kit is Node 22+ ESM with `npm test`, `npm run check`, `npm run example`, and `npm pack --dry-run`. The repository-wide checker validates module manifests against both submodule upstreams and incorporated references.

## Status

New kits start at `implemented 0.1.0`; promotion to `stable` requires consumer-product homologation.

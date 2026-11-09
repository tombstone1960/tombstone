# Tombstone · 《墓碑》阅读地图

Tombstone is an independent reading companion to *《墓碑》* by 杨继绳
(Yang Jisheng). The project aims to help readers explore regional accounts of
the Great Chinese Famine through an interactive map and follow each account
back to its sources.

## Run locally

Install dependencies with `npm ci`, then use `npm run dev` on this Mac.
To share a built preview on the local network, run `npm run build` and then
`npm run preview -- --host 0.0.0.0`. Open the printed network address on a
device connected to the same network.

The memorial homepage links to the national map (`/map/`), the chapter index
(`/read/`), the locality archive (`/records/`), and the sources and methodology
(`/sources/`).

The language menu links to the corresponding page where available and keeps
map selections in the URL. Traditional Chinese (`/zh-hant/`) uses Taiwanese
wording with a reviewed glossary. Direct quotations and the reference PDF
retain the source wording. English (`/en/`) includes the homepage, map, sources,
and guides to Henan, Sichuan, and Anhui. The map links to Chinese records and
chapters where an English guide is unavailable.

The reading index follows the 2007 reference PDF. Each of the 28 chapters
and the preface, chronology, and bibliography has a page. The chapter pages
link to individual subsections and show a map filtered to the cited records,
with selected figures and people where the source material supports them.
Click a linked place in a reading note to highlight it on the chapter map.
Open a marker and choose **跳到相关段落** to return to its reading note.

The national map fills the viewport beneath the site navigation. It uses
MapLibre and a locally served Protomaps extract. Drag to pan, and scroll,
pinch, or use the buttons to zoom. On chapter maps, scroll normally to
zoom while a place is selected. With details closed, hold Ctrl or Command
to zoom with the scroll wheel. Hover for a summary and click for a details
panel that floats over the map. The default
layer fades from provincial estimates to local records as you zoom. Use the
place search to find provinces or archived locations by name. The layer
settings switch layers and adjust the estimate metric at the current view.
Open **分享地图链接** under a record to copy a link that restores its marker and
opens that specific record. Links use the current preview address and work for
readers who can reach it on the local network.

Hollow markers identify places mentioned in the book. Hover for a short
summary, then click for context, the chapter citation, and the source for the
modern reference point. Choose **查看原文** to open the PDF with the passage
highlighted. Search for **十河公社** or **独木水库** to try it.

The basemap and Tombstone's data are separate map sources. The classic map
loads over the local network. Under **地图设置**, choose **卫星影像**
to view EOxCloudless imagery at the same zoom and location. Chapter maps
offer the same choice under **底图**. The satellite view loads tiles from
EOX and requires internet access. The citation overlay uses PDF.js and loads the
reference PDF on demand through a fixed Vite route to the external archive.
The new-tab link opens the same reader at the current page. Its address tracks
the page as you read, and it offers a separate link to the archive PDF.
The PDF is not part of the build.

For a hosted static build, set `VITE_ARCHIVE_PDF_ONLY=1` so citations open
the corresponding page at the archive. Set `VITE_PMTILES_URL` to the HTTPS
URL of the hosted map archive. It must support byte ranges and allow
cross-origin requests from the website if it uses a different host.
Set both values before running `npm run build`. Build from a clean checkout
to keep the local multi-gigabyte extract out of the deployment.

The hosted map uses the Worker in `infra/cloudflare/` and a private R2
Standard bucket. Keep the Worker on the Free plan and serve the archive
only through the Worker. Its daily request limit bounds public R2 reads
because the Worker reads at most one byte range per request.

To recreate the local archive, install the [PMTiles CLI](https://docs.protomaps.com/pmtiles/cli)
and run the following before building the site:

```sh
mkdir -p public/tiles .local-map
atlas_snapshot=https://build.protomaps.com/20261107.pmtiles
pmtiles extract "$atlas_snapshot" .local-map/atlas-overview.pmtiles \
  --bbox=-20,-12,180,76 --maxzoom=6
pmtiles extract "$atlas_snapshot" .local-map/atlas-detail.pmtiles \
  --bbox=72,17,136,54.5 --minzoom=7 --maxzoom=13
pmtiles merge .local-map/atlas-overview.pmtiles .local-map/atlas-detail.pmtiles \
  public/tiles/china-atlas.pmtiles
```

The archive covers a wider area at overview zooms so the national map can
fill wide screens. China and its immediate surroundings have detailed tiles
through source zoom 13. The archive is about 3.7 GB, is kept out of Git,
and is copied into the build output.
Serve it through a static server with HTTP byte-range support, such as Vite
preview. If the dated build has expired, select a version 4 build from the
[Protomaps build list](https://maps.protomaps.com/builds/).

Reading guides cover all 21 regions with map markers, plus Ningxia, Qinghai,
Hainan, Shanghai, Inner Mongolia, and Xinjiang. The reading index follows the
reference edition's chapter order and indexes cross-chapter evidence under
its cited chapter. The local records page
connects selected county, city, commune, and village accounts to their exact
chapter and page references, with dates, units, and reporting scope where the
source gives them. Page numbers refer to the project's reference PDF and can
differ by edition.

## Code license

The [MIT License](LICENSE) applies only to the original software code in this
repository. Rights in the project's original summaries, essays, and diagrams
are reserved unless those materials carry a separate license notice.

## Book and data

- **Book.** 杨继绳 is the author of *《墓碑》*. The book and its translations,
  excerpts, scans, maps, and illustrations are outside the MIT license and
  remain subject to their respective rights. Reading references identify the
  edition and give chapter or page citations. [English edition](https://academic.macmillan.com/academictrade/9780374533991/tombstone/)
- **Mortality estimates.** The preview uses figures by 曹树基 (Cao Shuji)
  from *《大饥荒：1959–1961 年的中国人口》* (2005), p. 282, checked against
  table 14-1 in 杨继绳's *《墓碑》* (reference PDF pp. 279–280). These
  estimates are outside the code license. A region without a marker has no
  separate estimate in that table. [Cao's related paper](https://agri-history.ihns.ac.cn/scholars/caoshuji1.htm)
- **Province selection.** The bundled, simplified [Natural Earth 5.1.1](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/)
  Admin 1 (1:10m) boundaries are in the public domain.
  They provide province selection and geographic reference for the historical estimates. [Natural Earth terms](https://www.naturalearthdata.com/about/terms-of-use/)
- **National basemap.** The 2026-11-07 [Protomaps basemap](https://docs.protomaps.com/basemaps/downloads)
  includes OpenStreetMap data under the [ODbL](https://www.openstreetmap.org/copyright).
  Its geographic context is modern.
- **Local map points.** Modern reference coordinates selected from [GeoNames](https://www.geonames.org/export/)
  and rounded to three decimal places are covered by [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  They indicate a locality or its surrounding area. Historical jurisdictions,
  smaller sites without a verified point, and combined reports are explained
  alongside the relevant markers and records.

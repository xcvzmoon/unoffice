# unoffice

[![ci](https://img.shields.io/github/actions/workflow/status/xcvzmoon/unoffice/ci.yaml?branch=main&color=black)](https://github.com/xcvzmoon/unoffice/actions/workflows/ci.yaml)
[![release](https://img.shields.io/github/v/release/xcvzmoon/unoffice?color=black)](https://github.com/xcvzmoon/unoffice/releases/latest)

unoffice is a Bun/Nitro REST API for working with office documents. It accepts multipart uploads and can extract document text and metadata, convert documents between supported formats, and generate WebP thumbnails.

Extraction is powered by `undms` and runs through an Effect worker pool backed by Bun workers. Conversion is powered by `unoserver` and LibreOffice. Thumbnail generation uses `sharp`; non-image documents are converted to an image first, then resized and encoded as WebP.

The document conversion workflow is inspired by [`philiplehmann/container/apps/unoserver`](https://github.com/philiplehmann/container/tree/main/apps/unoserver).

## Supported Formats

These extensions are accepted by the API:

```text
doc, docx, xls, xlsx, ppt, pptx, pdf, txt, csv, jpg, jpeg, png, gif, webp, bmp, svg, tiff, heic, heif
```

Unsupported extensions return `422 Unprocessable Entity`.

Format support still depends on the operation:

| Operation | Notes                                                                                         |
| --------- | --------------------------------------------------------------------------------------------- |
| Extract   | Uses `undms`; best suited for office documents, PDFs, text, and CSVs.                         |
| Convert   | Uses LibreOffice through `unoconvert`; output is limited to supported `convertTo` extensions. |
| Thumbnail | Images are handled directly by `sharp`; non-images are converted to PNG first.                |

## Requirements

- Bun `1.3.13`
- LibreOffice and `unoserver` for local conversion and thumbnailing of non-image documents
- Docker, if you want the fully provisioned container workflow

The Docker image installs LibreOffice, Python UNO bindings, `unoserver`, document fonts, and `sharp` runtime dependencies. Local development requires those tools to be available on your host if you call conversion or non-image thumbnail endpoints.

## Quick Start

Install dependencies:

```sh
bun install
```

Start the dev server:

```sh
bun run dev
```

Build and run production output:

```sh
bun run build
bun run start
```

The default API base URL is:

```text
http://localhost:3000
```

## API

### Health

#### `GET /`

Returns a basic welcome response.

```sh
curl http://localhost:3000/
```

```json
{
  "message": "Welcome to unoffice API"
}
```

#### `GET /api/v1`

Returns service metadata and the active runtime name.

```sh
curl http://localhost:3000/api/v1
```

```json
{
  "description": "A REST API for processing office documents",
  "name": "unoffice",
  "runtime": "bun",
  "version": "0.0.1"
}
```

### Extract Documents

#### `POST /api/v1/extract`

Extracts text and metadata from one or more uploaded documents.

Upload files under the `documents` field:

```sh
curl -F "documents=@examples/example.pdf" \
  http://localhost:3000/api/v1/extract
```

Multiple files:

```sh
curl \
  -F "documents=@examples/example.pdf" \
  -F "documents=@examples/example.docx" \
  -F "documents=@examples/example.xlsx" \
  http://localhost:3000/api/v1/extract
```

Query parameters:

| Parameter | Values                | Description                              |
| --------- | --------------------- | ---------------------------------------- |
| `grouped` | `true`, `false`       | Return documents grouped by MIME type.   |
| `output`  | `metadata`, `content` | Return only the selected document field. |

Default response is a flat list:

```json
[
  {
    "name": "example.pdf",
    "size": 32074,
    "processingTime": 4.7,
    "encoding": "utf-8",
    "content": "Extracted text...",
    "metadata": {
      "pdf": {
        "pageCount": 1
      }
    }
  }
]
```

Grouped response:

```sh
curl -F "documents=@examples/example.pdf" \
  "http://localhost:3000/api/v1/extract?grouped=true"
```

```json
[
  {
    "mimeType": "application/pdf",
    "documents": [
      {
        "name": "example.pdf",
        "content": "Extracted text...",
        "metadata": {
          "pdf": {
            "pageCount": 1
          }
        }
      }
    ]
  }
]
```

Metadata-only response:

```sh
curl -F "documents=@examples/example.pdf" \
  "http://localhost:3000/api/v1/extract?output=metadata"
```

```json
[
  {
    "name": "example.pdf",
    "metadata": {
      "pdf": {
        "pageCount": 1
      }
    }
  }
]
```

### Convert Document

#### `POST /api/v1/convert`

Converts exactly one uploaded document and returns the converted binary file.

Upload the file under either `document` or `documents`. The route rejects zero files and more than one file.

```sh
curl -X POST "http://localhost:3000/api/v1/convert?convertTo=pdf" \
  -F "document=@examples/example.docx" \
  --output example.pdf
```

Convert to DOCX:

```sh
curl -X POST "http://localhost:3000/api/v1/convert?convertTo=docx" \
  -F "document=@examples/example.odt" \
  --output example.docx
```

Query parameters:

| Parameter         | Values / Type             | Default | Description                                                                |
| ----------------- | ------------------------- | ------- | -------------------------------------------------------------------------- |
| `convertTo`       | supported extension       | `pdf`   | Output extension, such as `pdf`, `docx`, `xlsx`, `pptx`, `png`, or `webp`. |
| `inputFilter`     | string                    | none    | Optional LibreOffice input filter.                                         |
| `outputFilter`    | string                    | none    | Optional LibreOffice output filter.                                        |
| `filterOptions`   | string or repeated string | none    | Optional filter options. Requires `outputFilter`.                          |
| `timeoutMs`       | positive integer          | none    | Kills conversion if it exceeds this duration.                              |
| `updateIndex`     | boolean                   | `false` | Passes `--update-index` to `unoconvert`.                                   |
| `dontUpdateIndex` | boolean                   | `false` | Passes `--dont-update-index` to `unoconvert`.                              |
| `verbose`         | boolean                   | `false` | Passes `--verbose` to `unoconvert`.                                        |
| `quiet`           | boolean                   | `false` | Passes `--quiet` to `unoconvert`.                                          |

The response includes:

```text
Content-Type: <converted MIME type>
Content-Disposition: attachment; filename="<original-name>.<convertTo>"
```

### Generate Thumbnail

#### `POST /api/v1/thumbnail`

Generates a WebP thumbnail for exactly one uploaded document.

Images are resized directly. Other supported documents are converted to PNG with `unoconvert` first, then converted to WebP.

```sh
curl -X POST "http://localhost:3000/api/v1/thumbnail?width=512" \
  -F "document=@examples/example.docx" \
  --output thumbnail.webp
```

Image input:

```sh
curl -X POST "http://localhost:3000/api/v1/thumbnail?width=512&height=512" \
  -F "document=@examples/example.jpg" \
  --output thumbnail.webp
```

Query parameters:

| Parameter   | Type                         | Default | Description                                 |
| ----------- | ---------------------------- | ------- | ------------------------------------------- |
| `width`     | positive integer, max `4096` | `1000`  | Maximum thumbnail width.                    |
| `height`    | positive integer, max `4096` | none    | Maximum thumbnail height.                   |
| `timeoutMs` | positive integer             | none    | Conversion timeout for non-image documents. |

The response is always:

```text
Content-Type: image/webp
```

### Error Responses

Validation and supported-format errors return `422 Unprocessable Entity`:

```json
{
  "error": true,
  "status": 422,
  "statusText": "Unprocessable Entity",
  "message": "Unsupported file extension"
}
```

Conversion failures are also reported as `422` with the underlying conversion message.

## Docker

Docker is the recommended way to run the complete document-processing stack because it includes LibreOffice and `unoserver`.

Build and run with Docker Compose:

```sh
bun run docker:up
```

Compose reads `.env` automatically. If `PORT` is set, the container listens on that port and maps the same host port. With the example `.env` value:

```sh
curl http://localhost:8700/api/v1
```

Build and run directly:

```sh
docker build --build-arg UNOSERVER_VERSION=3.3.2 -t unoffice .
docker run --rm -p 3000:3000 unoffice
```

Useful Docker scripts:

```sh
bun run docker:build
bun run docker:up
bun run docker:up:detached
bun run docker:logs
bun run docker:ps
bun run docker:restart
bun run docker:down
bun run docker:config
```

## Environment

| Variable            | Default | Description                                                       |
| ------------------- | ------- | ----------------------------------------------------------------- |
| `PORT`              | `3000`  | HTTP port used by Nitro and Docker Compose port mapping.          |
| `UNOSERVER_VERSION` | `3.3.2` | Docker build argument for the Python `unoserver` package version. |

## Development

Main paths:

```text
server/routes/api/v1/       API route handlers
server/services/undms.ts    Extraction service and worker pool
server/services/unconvert.ts Conversion service backed by unoconvert
server/plugins/unoserver.ts Starts unoserver with the Nitro app
server/utils/               File extension and MIME helpers
```

During `bun run build`, Nitro builds the server output and bundles worker entrypoints into:

```text
.output/server/_workers/*.mjs
```

Run checks:

```sh
bun run fmt
bun run lint
bun run build
```

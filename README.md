# unoffice

[![ci](https://img.shields.io/github/actions/workflow/status/xcvzmoon/unoffice/ci.yaml?branch=main&color=black)](https://github.com/xcvzmoon/unoffice/actions/workflows/ci.yaml)

unoffice is a Nitro REST API that runs on Bun Runtime for processing office documents: text extraction, metadata generation, document conversion, thumbnail generation, and related workflows.

The current implementation focuses on text and metadata extraction. Extraction is powered by `undms` and runs through an Effect worker pool backed by Bun workers.

## Features

- Multipart document upload API
- Text and metadata extraction grouped by MIME type
- Bun runtime with Nitro `preset: 'bun'`
- Effect worker pool backed by Bun workers
- Docker and Docker Compose support

## Supported Formats

The extraction endpoint currently accepts these file extensions:

```text
csv, doc, docx, epub, html, odp, ods, odt, pdf, ppt, pptx, rtf, txt, xls, xlsx, xhtml
```

Requests with unsupported extensions return `422 Unprocessable Entity`.

## Getting Started

- Bun `1.3.13`
- Docker, if you want to run the container workflow

Install dependencies:

```sh
bun install
```

Start the Nitro dev server:

```sh
bun run dev
```

Build and run the production output locally:

```sh
bun run build
bun run start
```

Preview the latest build:

```sh
bun run preview
```

## API Reference

### `GET /`

Returns a basic welcome response.

```sh
curl http://localhost:3000/
```

Example response:

```json
{
  "message": "Welcome to unoffice API"
}
```

### `GET /api/v1`

Returns service metadata from `package.json` and the active runtime name.

```sh
curl http://localhost:3000/api/v1
```

Example response:

```json
{
  "description": "A REST API for processing office documents",
  "name": "unoffice",
  "runtime": "bun",
  "version": "0.0.0"
}
```

### `POST /api/v1/extract`

Extracts text and metadata from one or more uploaded documents.

The request must use `multipart/form-data`. Add each file under the `documents` field.

```sh
curl -F "documents=@examples/example.pdf" http://localhost:3000/api/v1/extract
```

Multiple files:

```sh
curl \
  -F "documents=@examples/example.pdf" \
  -F "documents=@examples/example.docx" \
  -F "documents=@examples/example.xlsx" \
  http://localhost:3000/api/v1/extract
```

Successful response:

```json
[
  {
    "mimeType": "application/pdf",
    "documents": [
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
  }
]
```

Validation error response:

```json
{
  "error": true,
  "status": 422,
  "statusText": "Unprocessable Entity",
  "message": "Unsupported document extension: json"
}
```

## Docker

Build and run with Docker Compose:

```sh
bun run docker:up
```

Compose reads `.env` automatically. If `PORT` is set, the container listens on that port and maps the same host port. If `PORT` is not set, it falls back to `3000`.

With the example `.env` value:

```sh
curl http://localhost:8700/api/v1
```

Build and run directly with Docker:

```sh
docker build -t unoffice .
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

| Variable | Default | Description                                                         |
| -------- | ------- | ------------------------------------------------------------------- |
| `PORT`   | `3000`  | HTTP port used by the Nitro server and Docker Compose port mapping. |

## Project Layout

```text
server/routes/              Nitro route handlers
server/routes/api/v1/       Versioned API routes
server/services/undms.ts    Extraction service and Effect worker pool
server/workers/extract.ts   Bun worker entrypoint
server/utils/               File extension and MIME helpers
```

During `bun run build`, Nitro builds the server output and a build hook bundles worker entrypoints into:

```text
.output/server/workers/*.mjs
```

## Verification

Run the same local checks used by CI and pre-commit:

```sh
bun run fmt
bun run lint
bun run build
```

There is no dedicated test script at the moment. `bun run lint` is the closest type-aware check.

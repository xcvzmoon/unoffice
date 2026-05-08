# unoffice

[![ci](https://img.shields.io/github/actions/workflow/status/xcvzmoon/unoffice/ci.yaml?branch=main&color=black)](https://github.com/xcvzmoon/unoffice/actions/workflows/ci.yaml)

A REST API for processing office documents

## Docker

Build and run locally with Docker Compose:

```sh
bun run docker:up
```

Compose reads `.env` automatically. If `PORT` is set there, the container listens on
that port and maps the same host port. If `PORT` is not set, it falls back to `3000`.

With the example value:

```sh
curl http://localhost:8700/api
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

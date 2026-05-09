FROM oven/bun:1.3.13-slim AS build

WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

COPY nitro.config.ts tsconfig.json ./
COPY index.html index.html
COPY server server

RUN bun run build

FROM oven/bun:1.3.13-slim

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile --production --ignore-scripts && \
    mkdir /app/tmp && \
    chown -R bun:bun /app

COPY --from=build --chown=bun:bun /app/.output .output

USER bun

EXPOSE 3000

CMD [ "bun", ".output/server/index.mjs" ]

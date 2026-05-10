# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.13-slim AS build

WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

COPY nitro.config.ts tsconfig.json ./
COPY index.html index.html
COPY server server

RUN bun run build

FROM oven/bun:1.3.13-slim

ARG UNOSERVER_VERSION=3.3.2
ARG DEBIAN_FRONTEND=noninteractive

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV PATH="/app/virtenv/bin:${PATH}"
ENV LIBREOFFICE_EXECUTABLE_PATH=/usr/bin/soffice

COPY package.json bun.lock bunfig.toml ./
RUN --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    --mount=type=cache,target=/var/cache/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    apt-get update && \
    apt-get install --yes --no-install-recommends \
        default-jre-headless \
        fonts-crosextra-caladea \
        fonts-crosextra-carlito \
        fonts-dejavu \
        fonts-freefont-ttf \
        fonts-ipafont-gothic \
        fonts-liberation \
        fonts-liberation2 \
        fonts-noto-core \
        fonts-noto-extra \
        fonts-thai-tlwg \
        fonts-wqy-zenhei \
        libreoffice-calc \
        libreoffice-draw \
        libreoffice-impress \
        libreoffice-java-common \
        libreoffice-writer \
        python3-full \
        python3-pip \
        python3-uno \
        uno-libs-private \
        virtualenv && \
    virtualenv --python=/usr/bin/python3 --system-site-packages virtenv && \
    virtenv/bin/pip install --no-cache-dir "unoserver==${UNOSERVER_VERSION}" && \
    bun install --frozen-lockfile --production --ignore-scripts && \
    mkdir /app/tmp && \
    chown -R bun:bun /app

COPY --from=build --chown=bun:bun /app/.output .output

USER bun

EXPOSE 3000

CMD [ "bun", ".output/server/index.mjs" ]

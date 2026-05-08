FROM oven/bun:1.3.13-slim AS build

WORKDIR /app

COPY package.json bun.lock nitro.config.ts tsconfig.json ./
COPY server server

RUN bun install --frozen-lockfile
RUN bun run build

FROM oven/bun:1.3.13-slim

ARG UNOSERVER_VERSION=3.6

WORKDIR /app

RUN apt-get update && apt-get install --yes --no-install-recommends \
    curl \
    gnupg \
    ca-certificates && \
    curl -fsSL https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor -o /usr/share/keyrings/adoptium-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/adoptium-archive-keyring.gpg] https://packages.adoptium.net/artifactory/deb trixie main" > /etc/apt/sources.list.d/adoptium.list && \
    rm -rf /var/lib/apt/lists/*

RUN --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    --mount=type=cache,target=/var/cache/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    apt-get update && \
    apt-get install --yes --no-install-recommends \
    python3-full python3-pip python3-uno uno-libs-private virtualenv \
    libreoffice-java-common \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    libreoffice-draw \
    temurin-21-jdk \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-freefont-ttf fonts-dejavu \
    fonts-liberation fonts-noto-core fonts-noto-extra fonts-crosextra-carlito fonts-crosextra-caladea fonts-liberation2 && \
    virtualenv --python=/usr/bin/python3 --system-site-packages virtenv && \
    virtenv/bin/pip install "unoserver==${UNOSERVER_VERSION}"

RUN mkdir /app/tmp && \
    chown -R 1000:1000 /app/tmp

ENV PATH="/app/virtenv/bin:${PATH}"
ENV HOST=0.0.0.0
ENV PORT=3000
ENV UNOSERVER_DIRECT_ONLY=false
ENV UNOSERVER_FS_ENABLE=false
ENV UNOSERVER_FS_INPUT_ROOT=/data/in
ENV UNOSERVER_FS_OUTPUT_ROOT=/data/out
ENV UNOSERVER_PROCESS_ENABLED=false
ENV UNOSERVER_PROCESS_RETENTION_MS=3600000
ENV UNOSERVER_PROCESS_MAX_COMPLETED=1000
ENV LIBREOFFICE_EXECUTABLE_PATH=/usr/bin/soffice

COPY --from=build --chown=1000:1000 /app/.output .output

USER 1000:1000

CMD [ "bun", ".output/server/index.mjs" ]

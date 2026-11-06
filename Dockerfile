# Stage 1: build the static site with a fixed Node.js image,
# so the result is the same on every laptop and in CI.
# The @sha256 digest pins one exact image; the tag alone moves with every release.
# Dependabot proposes a new digest when the Node.js 24 Alpine image is updated.
FROM node:24-alpine@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85 AS build
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node app/ ./
ARG PR_NUMBER=local
ARG COMMIT_SHA=dev
RUN node build.mjs

# Stage 2: an empty image that holds only the built files.
# `docker build --target export --output ...` copies them to your disk.
FROM scratch AS export
COPY --from=build /app/dist/ /
FROM --platform=$BUILDPLATFORM golang:1.22 as builder

WORKDIR /src
ENV CGO_ENABLED=0

COPY go.* .

ARG TARGETOS TARGETARCH

RUN --mount=type=bind,target=. \
GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o /build/blazehttp cmd/blazehttp/main.go


FROM --platform=$BUILDPLATFORM alpine:latest as binary

RUN apk add tzdata && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone \
    && apk del tzdata

WORKDIR /app

COPY --from=builder /build/blazehttp /app/blazehttp

CMD [ "/app/blazehttp" ]

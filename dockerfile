FROM denoland/deno:latest as base

WORKDIR /app

COPY . ./

CMD ["run", "-A" "main.ts"]

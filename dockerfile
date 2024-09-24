FROM denoland/deno:latest as base

WORKDIR /app

COPY . ./

CMD ["deno", "run", "-A" "main.ts"]

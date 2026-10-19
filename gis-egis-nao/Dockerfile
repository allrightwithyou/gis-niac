FROM node:24-alpine

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

RUN yarn install --immutable

COPY . .

ARG NEXT_PUBLIC_NGW_BASE_URL
ENV NEXT_PUBLIC_NGW_BASE_URL=$NEXT_PUBLIC_NGW_BASE_URL

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--use-system-ca

RUN yarn build

RUN cp -r .next/static .next/standalone/.next/static
RUN cp -r public .next/standalone/public

ENV NODE_ENV=production
ENV PORT=3011
ENV HOSTNAME=0.0.0.0

EXPOSE 3011

CMD ["node", ".next/standalone/server.js"]
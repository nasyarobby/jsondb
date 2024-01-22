FROM node:16.19.0-alpine as builder

WORKDIR /server

# Install dependencies, taking benefits from Docker caching capabilities
# If no change to the dependencies, Docker will use the cached layer
COPY ./package.json yarn.lock tsconfig.json* ./
ADD ./compile.sh ./
# RUN yarn config set registry https://registry.paas.pajak.go.id/repository/npm-private/ -g
# RUN yarn config set "strict-ssl" false -g
RUN yarn install --production=false

# Copy the rest of the files, and compile
COPY . .
RUN yarn run compile

FROM node:16.19.0-buster-slim

WORKDIR /tmp
RUN apt-get update && apt-get -y upgrade && apt-get -y dist-upgrade \
    && apt-get install -y alien libaio1 wget
RUN wget https://yum.oracle.com/repo/OracleLinux/OL7/oracle/instantclient/x86_64/getPackage/oracle-instantclient19.3-basiclite-19.3.0.0.0-1.x86_64.rpm
RUN alien -i --scripts oracle-instantclient*.rpm
RUN rm -f oracle-instantclient19.3*.rpm \
    && apt-get -y autoremove && apt-get -y clean \
    && rm -rf /var/lib/apt/lists/*
RUN yarn global add pm2
RUN yarn global add @ditjenpajakri/elasticsearch-logging
# Here is also the same, before copying the built result, we copy the package.json
# Copying built files heredo, will invalidate the cache, and will force to re-install
# this layer will always the same (cached) if no changes to deps
WORKDIR /server
COPY package.json yarn.lock ./

RUN yarn install --production=true --ignore-engines

# Now copy the built files
COPY --from=builder /server/build ./build
COPY ecosystem.config.cjs start.sh ./

ENV LOG_LEVEL=info
ENV NODE_ENV=production


CMD [ "pm2-runtime", "ecosystem.config.cjs"]

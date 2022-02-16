FROM mhart/alpine-node:12
MAINTAINER info@vizzuality.com

ENV NAME gfw-forms-api

RUN apk update && apk upgrade && \
    apk add --no-cache --update bash git openssh python build-base

RUN yarn global add grunt-cli bunyan

RUN mkdir -p /opt/$NAME
COPY package.json /opt/$NAME/package.json
COPY yarn.lock /opt/$NAME/yarn.lock
RUN cd /opt/$NAME && yarn

COPY entrypoint.sh /opt/$NAME/entrypoint.sh
COPY config /opt/$NAME/config

WORKDIR /opt/$NAME

COPY ./app /opt/$NAME/app

# Tell Docker we are going to use this ports
EXPOSE 4400

CMD ["node", "app/index.js"]
FROM ubuntu:trusty
MAINTAINER George Lewis <schvin@schvin.net>

# nvm prep
ENV PATH /home/s-app/.nvm/v0.10.29/bin:/home/s-app/.nvm/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ENV HOME /home/s-app
ENV NVM_DIR /home/s-app/.nvm
ENV NVM_NODEJS_ORG_MIRROR http://nodejs.org/dist

# npm prep
ENV clean no

# update
RUN apt-get update
RUN apt-get -y upgrade
RUN apt-get -y install git curl make

# account setup
RUN addgroup --system --gid 1000 s-app
RUN adduser --system --shell /bin/bash --uid 1000 --gid 1000 --disabled-password s-app
RUN mkdir /s
RUN chown s-app:s-app /s
USER s-app
RUN touch ~/.profile

# nvm install
RUN curl -L https://raw.github.com/creationix/nvm/master/install.sh | sh
RUN bash -l -c "nvm install 0.10"

# npm
RUN curl -L http://npmjs.org/install.sh | bash -l

# mapbox tm2
EXPOSE 3000
WORKDIR /s
RUN git clone https://github.com/mapbox/tm2.git
WORKDIR /s/tm2
RUN npm install
ENTRYPOINT npm start

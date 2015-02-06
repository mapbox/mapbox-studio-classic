#!/bin/sh

gem install bundle

bundle install --path .bundle
bundle exec jekyll build

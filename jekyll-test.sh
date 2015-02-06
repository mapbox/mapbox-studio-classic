#!/bin/sh

bundle install --path .bundle
bundle exec jekyll build --config=_config.test.yml --destination=_site-test


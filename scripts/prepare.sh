#!/usr/bin/env bash

set -e
set -x

yarn dotenv
yarn openapi

yarn types

yarn tsoa
yarn build

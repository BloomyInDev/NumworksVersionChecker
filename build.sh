#!/bin/bash
docker buildx build -t bloomyindev/numworksversionchecker:v1 --platform linux/amd64,linux/aarch64,linux/arm64,linux/arm/v7 --push .
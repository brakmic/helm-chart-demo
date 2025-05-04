#!/bin/bash

# Creates a secrets.env file with the contents of ~/.kube/config
printf 'KUBE_CONFIG_DATA=%s\n' "$(base64 ~/.kube/config | tr -d '\n')" > ~/.secrets.env

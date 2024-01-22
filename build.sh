#!/bin/sh

# set REGISTRY ke alamat docker registry
# jika tidak diset akan otomatis ke 10.244.65.16:16379
# export REGISTRY=localhost:5000

PARENT_DIR=$(basename "${PWD%/*}")
CURRENT_DIR="${PWD##*/}"
IMAGE_NAME="$PARENT_DIR/$CURRENT_DIR"
if [ -z "$1" ]; then
    {
        TAG="$(git log -1 --pretty=\%h)"
    } || {
        exit 99
    }
else
    TAG=$1
fi

if [ -z "${REGISTRY}" ]; then
    REGISTRY="registry.paas.pajak.go.id:5000"
fi

if [ -z "${DOCKER_DEV}" ]; then
    echo -e "REGISTRY \e[33m$REGISTRY\e[0m
    IMAGE \e[33m$IMAGE_NAME\e[0m
    TAG \e[33m$TAG\e[0m"

    echo -e "Tagging image as \e[33m$REGISTRY/$IMAGE_NAME/$TAG\e[0m"

    docker build -t ${REGISTRY}/${IMAGE_NAME}:${TAG} -t ${REGISTRY}/${IMAGE_NAME}:latest -f Dockerfile .
    docker push ${REGISTRY}/${IMAGE_NAME}
    
    if [ -z "$1" ]; then
        echo -e "Only push latest."
    else
        echo -e "Push tag $1"
        docker push ${REGISTRY}/${IMAGE_NAME}:${TAG}
    fi
else
    echo "Dev inside Docker !"
    docker stop dev &>/dev/null
    docker build -t ${IMAGE_NAME}:local-dev -f Dockerfile.oracle.dev .
    docker run --rm -d --volume ${PWD}/src/:/server/src --network=host --name dev ${IMAGE_NAME}:local-dev
    echo "
=============================================
    Docker container is running as \e[33mdev\e[0m
============================================="
    echo "To stop container run \e[33mdocker stop dev\e[0m"
    echo "For logging run \e[33mdocker logs -f dev\e[0m"
    echo ""
    echo "Happy dev!"
fi

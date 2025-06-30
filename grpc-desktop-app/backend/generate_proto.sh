#!/bin/bash

# Install required tools if missing
python3 -m pip install grpcio grpcio-tools --quiet

# Generate gRPC code
python3 -m grpc_tools.protoc \
  -I. \
  --python_out=. \
  --grpc_python_out=. \
  langgraph.proto

echo "✅ gRPC Python stubs generated."

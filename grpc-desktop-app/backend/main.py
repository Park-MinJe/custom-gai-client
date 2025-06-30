import grpc
from concurrent import futures
import time

# Import generated gRPC classes
import langgraph_pb2
import langgraph_pb2_grpc

# Define the service implementation
class LangGraphService(langgraph_pb2_grpc.LangGraphServiceServicer):
    def RunGraph(self, request, context):
        print(f"[Python gRPC Server] Received: {request.user_input}")
        response = f"Processed: {request.user_input.upper()}"
        return langgraph_pb2.GraphResponse(result=response)

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=2))
    langgraph_pb2_grpc.add_LangGraphServiceServicer_to_server(LangGraphService(), server)
    server.add_insecure_port('[::]:50051')
    print("[Python gRPC Server] Starting on port 50051...")
    server.start()
    try:
        while True:
            time.sleep(86400)  # sleep forever
    except KeyboardInterrupt:
        print("[Python gRPC Server] Shutting down.")
        server.stop(0)

if __name__ == '__main__':
    serve()

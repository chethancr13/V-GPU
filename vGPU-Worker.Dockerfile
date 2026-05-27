FROM python:3.10-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir numpy pandas scikit-learn
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

WORKDIR /workspace
VOLUME /workspace/results
VOLUME /workspace/dataset

CMD ["sleep", "infinity"]

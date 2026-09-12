FROM python:3.10-slim

# Removed build-essential — all pip packages (numpy, pandas, scikit-learn, torch CPU)
# have pre-built wheels for python:3.10-slim and don't require compilation.
# This saves ~250MB in the final image.

# Single pip install layer for better Docker cache behavior
RUN pip install --no-cache-dir \
    numpy \
    pandas \
    scikit-learn \
    torch torchvision --index-url https://download.pytorch.org/whl/cpu

WORKDIR /workspace
VOLUME /workspace/results
VOLUME /workspace/dataset

CMD ["sleep", "infinity"]

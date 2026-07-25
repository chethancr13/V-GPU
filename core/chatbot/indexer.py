import os
import hashlib
import time
from typing import List, Dict, Any, Optional
from core.chatbot.chunker import ProjectChunker
from core.chatbot.vector_store import ProjectVectorStore

# Directories to ignore
IGNORED_DIRS = {
    ".git", ".venv", "venv", "node_modules", "dist", "build", "__pycache__",
    ".idea", ".vscode", "coverage", ".next", ".tauri", "src-tauri/target"
}

# Supported file extensions
ALLOWED_EXTENSIONS = {
    ".py", ".md", ".txt", ".csv", ".json", ".toml", ".yaml", ".yml",
    ".sql", ".sh", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", "dockerfile"
}

class ProjectIndexer:
    def __init__(self, root_dir: str = ".", vector_store: Optional[ProjectVectorStore] = None):
        self.root_dir = os.path.abspath(root_dir)
        self.vector_store = vector_store or ProjectVectorStore()

    @staticmethod
    def compute_file_hash(filepath: str) -> str:
        hasher = hashlib.md5()
        try:
            with open(filepath, "rb") as f:
                while chunk := f.read(8192):
                    hasher.update(chunk)
            return hasher.hexdigest()
        except Exception:
            return ""

    def scan_and_index(self, force_reindex: bool = False, api_key: Optional[str] = None) -> Dict[str, Any]:
        start_time = time.time()
        scanned_files = 0
        indexed_files = 0
        total_chunks = 0
        
        for root, dirs, files in os.walk(self.root_dir):
            # Exclude ignored directories in-place
            dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith('.')]
            
            for file_name in files:
                ext = os.path.splitext(file_name)[1].lower()
                is_dockerfile = file_name.lower() in ("dockerfile", "vgpu-worker.dockerfile")
                
                if ext not in ALLOWED_EXTENSIONS and not is_dockerfile:
                    continue
                    
                full_path = os.path.join(root, file_name)
                rel_path = os.path.relpath(full_path, self.root_dir)
                
                # Skip large data files or binaries > 2MB
                try:
                    if os.path.getsize(full_path) > 2 * 1024 * 1024:
                        continue
                except Exception:
                    continue

                scanned_files += 1
                current_hash = self.compute_file_hash(full_path)
                
                if force_reindex or self.vector_store.is_file_modified(rel_path, current_hash):
                    try:
                        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                            content = f.read()
                            
                        chunks = ProjectChunker.chunk_file(rel_path, content)
                        if chunks:
                            self.vector_store.save_file_chunks(rel_path, current_hash, chunks, api_key=api_key)
                            indexed_files += 1
                            total_chunks += len(chunks)
                    except Exception as e:
                        print(f" [Indexer] Warning: Error indexing {rel_path}: {e}")

        stats = self.vector_store.get_index_stats()
        duration = round(time.time() - start_time, 2)
        
        return {
            "status": "success",
            "scanned_files": scanned_files,
            "indexed_files": indexed_files,
            "total_files": stats["total_files"],
            "total_chunks": stats["total_chunks"],
            "duration_seconds": duration
        }

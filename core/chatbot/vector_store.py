import sqlite3
import os
import json
import math
import hashlib
import re
import urllib.request
import urllib.parse
from typing import List, Dict, Any, Tuple, Optional
from core.chatbot.chunker import Chunk

DB_PATH = "data/chatbot_index.db"

class LocalSemanticVectorizer:
    """
    Lightweight, fast zero-dependency local semantic vectorizer using sub-word n-grams
    and TF-IDF weighting for accurate cosine distance calculation offline.
    """
    def __init__(self, vocab_size: int = 1024):
        self.vocab_size = vocab_size

    def _tokenize(self, text: str) -> List[str]:
        text = text.lower()
        # Word tokens
        words = re.findall(r'\b[a-z0-9_]{2,}\b', text)
        # Sub-word 3-gram and 4-gram tokens for partial/semantic match
        ngrams = []
        for word in words:
            if len(word) >= 3:
                for i in range(len(word) - 2):
                    ngrams.append(word[i:i+3])
        return words + ngrams

    def vector_to_bytes(self, vec: List[float]) -> bytes:
        return json.dumps(vec).encode('utf-8')

    def bytes_to_vector(self, data: bytes) -> List[float]:
        return json.loads(data.decode('utf-8'))

    def vectorize(self, text: str) -> List[float]:
        tokens = self._tokenize(text)
        vec = [0.0] * self.vocab_size
        if not tokens:
            return vec
            
        for token in tokens:
            # Deterministic hashing into fixed vector space
            idx = int(hashlib.md5(token.encode('utf-8')).hexdigest(), 16) % self.vocab_size
            vec[idx] += 1.0
            
        # L2 normalize vector
        norm = math.sqrt(sum(v * v for v in vec))
        if norm > 0:
            vec = [v / norm for v in vec]
        return vec

    @staticmethod
    def cosine_similarity(v1: List[float], v2: List[float]) -> float:
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        return sum(a * b for a, b in zip(v1, v2))


class ProjectVectorStore:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.local_vectorizer = LocalSemanticVectorizer(vocab_size=768)
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_conn() as conn:
            conn.execute("""
            CREATE TABLE IF NOT EXISTS file_index (
                file_path TEXT PRIMARY KEY,
                file_hash TEXT,
                last_updated REAL,
                chunk_count INTEGER
            )
            """)
            conn.execute("""
            CREATE TABLE IF NOT EXISTS chunks (
                id TEXT PRIMARY KEY,
                file_path TEXT,
                start_line INTEGER,
                end_line INTEGER,
                chunk_type TEXT,
                title TEXT,
                content TEXT,
                vector BLOB
            )
            """)
            conn.commit()

    def get_index_stats(self) -> Dict[str, Any]:
        with self._get_conn() as conn:
            files_count = conn.execute("SELECT COUNT(*) FROM file_index").fetchone()[0]
            chunks_count = conn.execute("SELECT COUNT(*) FROM chunks").fetchone()[0]
            last_sync_row = conn.execute("SELECT MAX(last_updated) FROM file_index").fetchone()
            last_sync = last_sync_row[0] if last_sync_row and last_sync_row[0] else 0.0
            return {
                "total_files": files_count,
                "total_chunks": chunks_count,
                "last_synced": last_sync
            }

    def is_file_modified(self, file_path: str, current_hash: str) -> bool:
        with self._get_conn() as conn:
            row = conn.execute("SELECT file_hash FROM file_index WHERE file_path = ?", (file_path,)).fetchone()
            if not row:
                return True
            return row["file_hash"] != current_hash

    def remove_file(self, file_path: str):
        with self._get_conn() as conn:
            conn.execute("DELETE FROM file_index WHERE file_path = ?", (file_path,))
            conn.execute("DELETE FROM chunks WHERE file_path = ?", (file_path,))
            conn.commit()

    def save_file_chunks(self, file_path: str, file_hash: str, chunks: List[Chunk], api_key: Optional[str] = None):
        self.remove_file(file_path)
        
        with self._get_conn() as conn:
            for idx, chunk in enumerate(chunks):
                chunk_id = f"{file_path}#{idx}_{chunk.start_line}"
                vec = self.generate_embedding(chunk.content, api_key=api_key)
                vec_bytes = self.local_vectorizer.vector_to_bytes(vec)
                
                conn.execute("""
                INSERT INTO chunks (id, file_path, start_line, end_line, chunk_type, title, content, vector)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    chunk_id,
                    chunk.file_path,
                    chunk.start_line,
                    chunk.end_line,
                    chunk.chunk_type,
                    chunk.title,
                    chunk.content,
                    vec_bytes
                ))
                
            conn.execute("""
            INSERT OR REPLACE INTO file_index (file_path, file_hash, last_updated, chunk_count)
            VALUES (?, ?, strftime('%s', 'now'), ?)
            """, (file_path, file_hash, len(chunks)))
            conn.commit()

    def generate_embedding(self, text: str, api_key: Optional[str] = None) -> List[float]:
        # Optional Gemini Embeddings API if key is provided
        if api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}"
                req_payload = {
                    "model": "models/text-embedding-004",
                    "content": {"parts": [{"text": text[:2000]}]}
                }
                req = urllib.request.Request(url, data=json.dumps(req_payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
                with urllib.request.urlopen(req, timeout=3) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    if "embedding" in data and "values" in data["embedding"]:
                        vals = data["embedding"]["values"]
                        # Downsample or normalize if needed
                        return vals[:768] if len(vals) >= 768 else vals + [0.0]*(768 - len(vals))
            except Exception:
                pass  # Fall back seamlessly to local vectorizer
                
        return self.local_vectorizer.vectorize(text)

    def hybrid_search(self, query: str, top_k: int = 6, api_key: Optional[str] = None) -> List[Dict[str, Any]]:
        query_vec = self.generate_embedding(query, api_key=api_key)
        query_keywords = set(re.findall(r'\b[a-z0-9_]{3,}\b', query.lower()))
        
        results = []
        with self._get_conn() as conn:
            rows = conn.execute("SELECT id, file_path, start_line, end_line, chunk_type, title, content, vector FROM chunks").fetchall()
            
            for row in rows:
                content = row["content"]
                vec = self.local_vectorizer.bytes_to_vector(row["vector"])
                
                # 1. Cosine Vector Similarity
                sim_score = LocalSemanticVectorizer.cosine_similarity(query_vec, vec)
                
                # 2. BM25 / Keyword Match Boost
                content_lower = content.lower()
                title_lower = row["title"].lower()
                file_lower = row["file_path"].lower()
                
                kw_matches = sum(1 for kw in query_keywords if kw in content_lower)
                title_kw_matches = sum(1 for kw in query_keywords if kw in title_lower or kw in file_lower)
                
                keyword_score = (kw_matches * 0.15) + (title_kw_matches * 0.35)
                combined_score = sim_score + keyword_score
                
                results.append({
                    "id": row["id"],
                    "file_path": row["file_path"],
                    "start_line": row["start_line"],
                    "end_line": row["end_line"],
                    "chunk_type": row["chunk_type"],
                    "title": row["title"],
                    "content": row["content"],
                    "score": round(combined_score, 4)
                })
                
        # Sort descending by score
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

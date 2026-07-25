import ast
import re
from typing import List, Dict, Any

class Chunk:
    def __init__(self, file_path: str, start_line: int, end_line: int, chunk_type: str, title: str, content: str):
        self.file_path = file_path
        self.start_line = start_line
        self.end_line = end_line
        self.chunk_type = chunk_type  # 'python_class', 'python_func', 'python_module', 'markdown_section', 'text_block'
        self.title = title
        self.content = content

    def to_dict(self) -> Dict[str, Any]:
        return {
            "file_path": self.file_path,
            "start_line": self.start_line,
            "end_line": self.end_line,
            "chunk_type": self.chunk_type,
            "title": self.title,
            "content": self.content
        }

    def get_citation(self) -> str:
        if self.start_line and self.end_line:
            return f"[{self.file_path}:L{self.start_line}-{self.end_line}]"
        return f"[{self.file_path}]"

class ProjectChunker:
    """Structure-aware chunker for code, docs, and project configs."""
    
    @staticmethod
    def chunk_file(file_path: str, content: str) -> List[Chunk]:
        if not content or not content.strip():
            return []
            
        lower_path = file_path.lower()
        if lower_path.endswith('.py'):
            return ProjectChunker._chunk_python(file_path, content)
        elif lower_path.endswith('.md'):
            return ProjectChunker._chunk_markdown(file_path, content)
        else:
            return ProjectChunker._chunk_text(file_path, content)

    @staticmethod
    def _chunk_python(file_path: str, content: str) -> List[Chunk]:
        chunks = []
        lines = content.splitlines()
        total_lines = len(lines)
        
        try:
            tree = ast.parse(content)
            
            # Module header chunk (docstrings, imports, top-level assignments up to first class/def)
            first_node_line = total_lines
            for node in tree.body:
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    first_node_line = node.lineno
                    break
            
            if first_node_line > 1:
                header_text = "\n".join(lines[:first_node_line-1]).strip()
                if header_text:
                    chunks.append(Chunk(
                        file_path=file_path,
                        start_line=1,
                        end_line=first_node_line - 1,
                        chunk_type="python_module",
                        title=f"Module Header ({file_path})",
                        content=f"File: {file_path} (Lines 1-{first_node_line-1})\n\n{header_text}"
                    ))
            
            for node in tree.body:
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    start = node.lineno
                    end = getattr(node, 'end_lineno', start + len(node.body))
                    func_code = "\n".join(lines[start-1:end])
                    chunks.append(Chunk(
                        file_path=file_path,
                        start_line=start,
                        end_line=end,
                        chunk_type="python_func",
                        title=f"def {node.name}()",
                        content=f"File: {file_path} (Lines {start}-{end})\nFunction: {node.name}\n\n{func_code}"
                    ))
                elif isinstance(node, ast.ClassDef):
                    start = node.lineno
                    end = getattr(node, 'end_lineno', start + len(node.body))
                    class_code = "\n".join(lines[start-1:end])
                    chunks.append(Chunk(
                        file_path=file_path,
                        start_line=start,
                        end_line=end,
                        chunk_type="python_class",
                        title=f"class {node.name}",
                        content=f"File: {file_path} (Lines {start}-{end})\nClass: {node.name}\n\n{class_code}"
                    ))
        except Exception:
            # Fallback to line block splitting if AST parsing fails
            return ProjectChunker._chunk_text(file_path, content, max_lines=40)
            
        if not chunks:
            return ProjectChunker._chunk_text(file_path, content, max_lines=50)
            
        return chunks

    @staticmethod
    def _chunk_markdown(file_path: str, content: str) -> List[Chunk]:
        chunks = []
        lines = content.splitlines()
        
        current_title = f"Document Overview ({file_path})"
        current_lines = []
        start_line = 1
        
        for idx, line in enumerate(lines, start=1):
            if line.startswith('#'):
                if current_lines:
                    text_block = "\n".join(current_lines).strip()
                    if text_block:
                        chunks.append(Chunk(
                            file_path=file_path,
                            start_line=start_line,
                            end_line=idx - 1,
                            chunk_type="markdown_section",
                            title=current_title,
                            content=f"File: {file_path} (Lines {start_line}-{idx-1})\nSection: {current_title}\n\n{text_block}"
                        ))
                current_title = line.lstrip('#').strip() or f"Section at L{idx}"
                current_lines = [line]
                start_line = idx
            else:
                current_lines.append(line)
                
        if current_lines:
            text_block = "\n".join(current_lines).strip()
            if text_block:
                chunks.append(Chunk(
                    file_path=file_path,
                    start_line=start_line,
                    end_line=len(lines),
                    chunk_type="markdown_section",
                    title=current_title,
                    content=f"File: {file_path} (Lines {start_line}-{len(lines)})\nSection: {current_title}\n\n{text_block}"
                ))
                
        return chunks if chunks else ProjectChunker._chunk_text(file_path, content)

    @staticmethod
    def _chunk_text(file_path: str, content: str, max_lines: int = 45, overlap: int = 10) -> List[Chunk]:
        chunks = []
        lines = content.splitlines()
        total_lines = len(lines)
        
        if total_lines == 0:
            return []
            
        step = max(1, max_lines - overlap)
        for i in range(0, total_lines, step):
            block_lines = lines[i:i+max_lines]
            start_line = i + 1
            end_line = min(i + max_lines, total_lines)
            block_text = "\n".join(block_lines).strip()
            
            if block_text:
                chunks.append(Chunk(
                    file_path=file_path,
                    start_line=start_line,
                    end_line=end_line,
                    chunk_type="text_block",
                    title=f"Block L{start_line}-L{end_line}",
                    content=f"File: {file_path} (Lines {start_line}-{end_line})\n\n{block_text}"
                ))
                
        return chunks

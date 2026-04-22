import io
import re
from fastapi import APIRouter, HTTPException, UploadFile, File

router = APIRouter()

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_MIME = {
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}





@router.post("/upload")
async def upload_cv_file(file: UploadFile = File(...)):
    """
    Accept a PDF, TXT, or DOCX file upload and extract text from it.
    Returns the extracted text so the frontend can display and further parse it.
    """
    # Validate file size
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File too large. Maximum size is 5 MB.")

    # Validate content type
    content_type = file.content_type or ""
    filename = file.filename or ""

    if filename.lower().endswith(".pdf") or "pdf" in content_type:
        text = _extract_pdf_text(content)
    elif filename.lower().endswith(".txt") or "text/plain" in content_type:
        text = content.decode("utf-8", errors="ignore")
    elif filename.lower().endswith((".doc", ".docx")) or "word" in content_type:
        # Basic text extraction from DOCX (XML inside zip)
        text = _extract_docx_text(content)
    else:
        raise HTTPException(
            415,
            "Unsupported file type. Please upload a PDF, TXT, or DOCX file."
        )

    text = text.strip()
    if not text:
        raise HTTPException(422, "Could not extract text from the uploaded file.")

    if len(text) > 32_000:
        text = text[:32_000]

    return {"success": True, "text": text, "filename": filename, "chars": len(text)}


def _extract_pdf_text(content: bytes) -> str:
    """Extract text from PDF bytes using PyPDF2."""
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(io.BytesIO(content))
        pages = []
        for page in reader.pages:
            pages.append(page.extract_text() or "")
        return "\n".join(pages)
    except ImportError:
        raise HTTPException(
            500,
            "PDF parsing not available. Run: pip install PyPDF2"
        )
    except Exception as e:
        raise HTTPException(422, f"Could not read PDF: {str(e)}")


def _extract_docx_text(content: bytes) -> str:
    """Extract text from DOCX by reading the XML inside the zip."""
    try:
        import zipfile
        with zipfile.ZipFile(io.BytesIO(content)) as z:
            with z.open("word/document.xml") as f:
                xml = f.read().decode("utf-8", errors="ignore")
        # Strip XML tags and normalize whitespace
        text = re.sub(r"<[^>]+>", " ", xml)
        text = re.sub(r"\s+", " ", text)
        return text.strip()
    except Exception as e:
        raise HTTPException(422, f"Could not read DOCX: {str(e)}")

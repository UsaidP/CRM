#!/usr/bin/env python3
"""
High-Performance Local PDF Text & Vision OCR Extractor for Real Estate Brochures
Extracts embedded text using pdftotext / fitz, and falls back to Apple Vision Neural OCR
for scanned / image-only brochures with zero third-party cloud dependencies.
"""
import sys
import os
import json

def extract_text(pdf_path):
    pages_data = []
    total_text = []

    # Method 1: PyMuPDF embedded text
    try:
        import fitz
        doc = fitz.open(pdf_path)
        for idx, page in enumerate(doc):
            txt = page.get_text()
            if txt and len(txt.strip()) > 20:
                pages_data.append({
                    "page_number": idx + 1,
                    "text": txt.strip()
                })
                total_text.append(f"--- PAGE {idx + 1} ---\n{txt.strip()}")
    except Exception as e:
        pass

    # If PyMuPDF found substantial text across pages, return it
    full_str = "\n\n".join(total_text)
    if len(full_str.strip()) > 150:
        return {"pages": pages_data, "full_text": full_str, "method": "embedded_text"}

    # Method 2: Apple Vision Framework OCR (macOS Neural OCR)
    try:
        import fitz
        import objc
        from Foundation import NSBundle, NSData

        vision_bundle = NSBundle.bundleWithPath_('/System/Library/Frameworks/Vision.framework')
        if vision_bundle and vision_bundle.load():
            VNRecognizeTextRequest = objc.lookUpClass('VNRecognizeTextRequest')
            VNImageRequestHandler = objc.lookUpClass('VNImageRequestHandler')

            doc = fitz.open(pdf_path)
            ocr_pages = []
            ocr_text = []

            for idx in range(len(doc)):
                page = doc[idx]
                pix = page.get_pixmap(dpi=150)
                png_bytes = pix.tobytes('png')
                ns_data = NSData.dataWithBytes_length_(png_bytes, len(png_bytes))

                req = VNRecognizeTextRequest.alloc().init()
                req.setRecognitionLevel_(1) # 1 = accurate neural recognition

                handler = VNImageRequestHandler.alloc().initWithData_options_(ns_data, {})
                handler.performRequests_error_([req], None)

                results = req.results()
                lines = [obs.topCandidates_(1)[0].string() for obs in results if obs.topCandidates_(1)]
                page_text = "\n".join(lines).strip()
                if page_text:
                    ocr_pages.append({
                        "page_number": idx + 1,
                        "text": page_text
                    })
                    ocr_text.append(f"--- PAGE {idx + 1} ---\n{page_text}")

            ocr_full_str = "\n\n".join(ocr_text)
            if len(ocr_full_str.strip()) > 50:
                return {"pages": ocr_pages, "full_text": ocr_full_str, "method": "apple_vision_ocr"}
    except Exception as e:
        pass

    return {"pages": pages_data, "full_text": full_str, "method": "none"}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No PDF path provided"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(json.dumps({"error": f"File not found: {pdf_path}"}))
        sys.exit(1)

    res = extract_text(pdf_path)
    print(json.dumps(res))

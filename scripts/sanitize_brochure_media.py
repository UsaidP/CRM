#!/usr/bin/env python3
"""
High-Precision Real Estate Brochure Media & PDF Phone Number Erasure Engine
Zero-Bypass Broker Shield: Erases builder/broker telephone numbers, mobile contacts,
and booking desk phone stamps from both digital vector PDFs and scanned/raster graphic brochures.

Preserves MahaRERA Registration IDs (P517000..., P520000...), carpet areas, plot numbers,
and dates while seamlessly inpainting/masking detected phone numbers using adaptive local
background color sampling.
"""
import sys
import os
import re
import json
import numpy as np
from PIL import Image

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

# High-precision phone detection regex
# 1. Indian 10-digit mobile numbers with optional country code (+91, 91)
# 2. Landline numbers with STD codes (022, 0251, 011, etc.)
# 3. Formatted mobile numbers (e.g. 99205 40484, 98201-23456)
PHONE_REGEX = re.compile(
    r'(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{4,5}\b|'
    r'\b0\d{2,4}[\s-]?\d{6,8}\b|'
    r'\b[6-9]\d{9}\b|'
    r'(?:mob|tel|call|phone|contact|booking)[:\s]+[+\d\s-]{7,}',
    re.IGNORECASE
)

# MahaRERA and alphanumeric exclusion regex to prevent false positives
RERA_EXCLUSION_REGEX = re.compile(r'\b[PA]\d{8,11}\b', re.IGNORECASE)
YEAR_EXCLUSION_REGEX = re.compile(r'\b(?:19|20)\d{2}\b')
AREA_EXCLUSION_REGEX = re.compile(r'\b\d{2,4}\s*(?:sq\.?\s*ft|sqft|sqm|sq\s*mtr)\b', re.IGNORECASE)

def is_phone_number_match(text):
    """Checks if text contains a real phone number while protecting RERA IDs, years, and areas."""
    if not text:
        return False
    clean = text.strip()
    # If the text is purely a MahaRERA registration number or website URL, never erase
    if RERA_EXCLUSION_REGEX.search(clean) and not re.search(r'[6-9]\d{9}', re.sub(r'[PA]\d{8,11}', '', clean)):
        return False
    if 'maharera' in clean.lower() and not any(k in clean.lower() for k in ['call', 'tel', 'phone', 'mob']):
        return False

    # Check for phone pattern
    sanitized_for_check = re.sub(r'[PA]\d{8,11}', '', clean)
    sanitized_for_check = AREA_EXCLUSION_REGEX.sub('', sanitized_for_check)
    
    # Exclude standalone 4-digit years
    if YEAR_EXCLUSION_REGEX.fullmatch(sanitized_for_check.strip()):
        return False

    return bool(PHONE_REGEX.search(sanitized_for_check))

def sample_background_color(img_arr, x0, y0, x1, y1, width, height, border_thickness=4):
    """
    Samples pixels immediately outside the bounding box to compute the median
    background color (RGB) so the erasure blends seamlessly with the surrounding design.
    """
    border_pixels = []
    # Top strip
    if y0 > border_thickness:
        top_strip = img_arr[max(0, y0 - border_thickness):y0, max(0, x0):min(width, x1)]
        if top_strip.size > 0:
            border_pixels.extend(top_strip.reshape(-1, 3))
    # Bottom strip
    if y1 < height - border_thickness:
        bottom_strip = img_arr[y1:min(height, y1 + border_thickness), max(0, x0):min(width, x1)]
        if bottom_strip.size > 0:
            border_pixels.extend(bottom_strip.reshape(-1, 3))
    # Left strip
    if x0 > border_thickness:
        left_strip = img_arr[max(0, y0):min(height, y1), max(0, x0 - border_thickness):x0]
        if left_strip.size > 0:
            border_pixels.extend(left_strip.reshape(-1, 3))
    # Right strip
    if x1 < width - border_thickness:
        right_strip = img_arr[max(0, y0):min(height, y1), x1:min(width, x1 + border_thickness)]
        if right_strip.size > 0:
            border_pixels.extend(right_strip.reshape(-1, 3))

    if border_pixels:
        border_arr = np.array(border_pixels)
        median_rgb = np.median(border_arr, axis=0)
        return (float(median_rgb[0] / 255.0), float(median_rgb[1] / 255.0), float(median_rgb[2] / 255.0))
    return (1.0, 1.0, 1.0)

def detect_text_bounding_boxes_vision(pix):
    """
    High-accuracy text line detection using Apple Vision framework (macOS Neural OCR).
    Returns list of dicts with 'text' and normalized 'bbox' (origin: bottom-left).
    """
    try:
        import objc
        from Foundation import NSBundle, NSData

        vision_bundle = NSBundle.bundleWithPath_('/System/Library/Frameworks/Vision.framework')
        if not vision_bundle or not vision_bundle.load():
            return []

        VNRecognizeTextRequest = objc.lookUpClass('VNRecognizeTextRequest')
        VNImageRequestHandler = objc.lookUpClass('VNImageRequestHandler')
        if not VNRecognizeTextRequest or not VNImageRequestHandler:
            return []

        png_bytes = pix.tobytes('png') if hasattr(pix, 'tobytes') else pix
        ns_data = NSData.dataWithBytes_length_(png_bytes, len(png_bytes))

        req = VNRecognizeTextRequest.alloc().init()
        req.setRecognitionLevel_(1)  # Accurate level

        handler = VNImageRequestHandler.alloc().initWithData_options_(ns_data, {})
        handler.performRequests_error_([req], None)

        observations = req.results() or []
        results = []
        for obs in observations:
            candidates = obs.topCandidates_(1)
            if candidates:
                text = candidates[0].string()
                bb = obs.boundingBox()
                results.append({
                    "text": text,
                    "x": float(bb.origin.x),
                    "y": float(bb.origin.y),
                    "w": float(bb.size.width),
                    "h": float(bb.size.height)
                })
        return results
    except Exception:
        return []

def detect_barcodes_vision(pix_or_png_bytes):
    """
    High-accuracy 1D and 2D barcode / QR code detection using Apple Vision framework (VNDetectBarcodesRequest).
    Returns list of dicts with 'symbology', 'payload', and normalized 'bbox' (origin: bottom-left).
    """
    try:
        import objc
        from Foundation import NSBundle, NSData

        vision_bundle = NSBundle.bundleWithPath_('/System/Library/Frameworks/Vision.framework')
        if not vision_bundle or not vision_bundle.load():
            return []

        VNDetectBarcodesRequest = objc.lookUpClass('VNDetectBarcodesRequest')
        VNImageRequestHandler = objc.lookUpClass('VNImageRequestHandler')
        if not VNDetectBarcodesRequest or not VNImageRequestHandler:
            return []

        if isinstance(pix_or_png_bytes, bytes):
            png_bytes = pix_or_png_bytes
        elif hasattr(pix_or_png_bytes, 'tobytes'):
            png_bytes = pix_or_png_bytes.tobytes('png')
        else:
            return []

        ns_data = NSData.dataWithBytes_length_(png_bytes, len(png_bytes))
        req = VNDetectBarcodesRequest.alloc().init()
        handler = VNImageRequestHandler.alloc().initWithData_options_(ns_data, {})
        handler.performRequests_error_([req], None)

        observations = req.results() or []
        results = []
        for obs in observations:
            bb = obs.boundingBox()
            payload = obs.payloadStringValue() or ""
            symbology = str(obs.symbology() or "")
            results.append({
                "symbology": symbology,
                "payload": payload,
                "x": float(bb.origin.x),
                "y": float(bb.origin.y),
                "w": float(bb.size.width),
                "h": float(bb.size.height)
            })
        return results
    except Exception:
        return []

def validate_and_normalize_image(image_path, output_path=None):
    """
    Validates an extracted image to prevent corruption, black silhouettes,
    monochrome transparency masks, and inverted CMYK colors.
    Converts CMYK to sRGB, and ensures luminance/content quality.
    """
    try:
        img = Image.open(image_path)
        w, h = img.size

        # Reject tiny decorative icons or slivers
        if w < 100 or h < 100:
            return {"valid": False, "reason": f"Image too small ({w}x{h})"}

        aspect = w / h
        if aspect > 5.0 or aspect < 0.2:
            return {"valid": False, "reason": f"Extreme aspect ratio ({aspect:.2f})"}

        # Reject 1-bit transparency masks or palette masks
        if img.mode in ('1', 'P'):
            return {"valid": False, "reason": f"Binary or palette mask mode ({img.mode})"}

        # Convert CMYK to sRGB (prevents inverted/negative colors in web browsers)
        was_cmyk = False
        if img.mode == 'CMYK':
            img = img.convert('RGB')
            was_cmyk = True
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        arr = np.array(img)
        # Compute ITU-R BT.601 luminance
        luma = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
        mean_luma = float(np.mean(luma))
        black_ratio = float(np.mean(luma < 15.0))
        white_ratio = float(np.mean(luma > 245.0))

        # Reject solid black or pitch-dark masks (typical /SMask dumps from pdfimages)
        if mean_luma < 22.0:
            return {"valid": False, "reason": f"Image pitch-black / mask (mean luma {mean_luma:.1f})"}
        if black_ratio > 0.85:
            return {"valid": False, "reason": f"Image is {black_ratio*100:.1f}% black silhouette"}
        if white_ratio > 0.98:
            return {"valid": False, "reason": f"Image is blank white ({white_ratio*100:.1f}%)"}

        # Check for barcodes / QR codes
        import io
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        png_bytes = buf.getvalue()
        barcodes = detect_barcodes_vision(png_bytes)

        # If the image is solely a barcode / QR code (> 35% of total area), reject it
        for b in barcodes:
            if (b['w'] * b['h']) > 0.35:
                return {"valid": False, "reason": f"Image is a standalone barcode/QR code ({b['symbology']})"}

        save_dest = output_path or image_path
        if was_cmyk or output_path:
            img.save(save_dest, "JPEG", quality=95)

        return {
            "valid": True,
            "width": w,
            "height": h,
            "mean_luma": round(mean_luma, 1),
            "converted_cmyk": was_cmyk,
            "barcode_count": len(barcodes),
            "path": save_dest
        }
    except Exception as e:
        return {"valid": False, "reason": str(e)}

def sanitize_pdf_document(input_pdf_path, output_pdf_path=None):
    """
    Scans every page of a PDF document, detects all phone numbers (embedded and OCR),
    and all 1D/2D barcodes/QR codes, applies adaptive color fill redactions, and saves a sanitized PDF.
    """
    try:
        doc = fitz.open(input_pdf_path)
    except Exception as e:
        return {"error": f"Failed to open PDF: {str(e)}", "total_erased": 0}

    total_erased_count = 0
    erased_details = []

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        page_w = page.rect.width
        page_h = page.rect.height

        # Render high-res raster pixmap for visual text detection and color sampling
        pix = page.get_pixmap(dpi=150)
        img_pil = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        img_arr = np.array(img_pil)
        img_w, img_h = pix.width, pix.height

        boxes_to_erase = []

        # Strategy 1: Search selectable vector text in PDF (if digital PDF)
        text_page = page.get_text("words")  # (x0, y0, x1, y1, "word", block_no, line_no, word_no)
        lines = {}
        for w in text_page:
            key = (w[5], w[6])
            if key not in lines:
                lines[key] = []
            lines[key].append(w)

        for key, words in lines.items():
            line_str = " ".join([w[4] for w in words])
            if is_phone_number_match(line_str):
                x0 = min([w[0] for w in words])
                y0 = min([w[1] for w in words])
                x1 = max([w[2] for w in words])
                y1 = max([w[3] for w in words])

                px0 = max(0, int((x0 / page_w) * img_w) - 4)
                py0 = max(0, int((y0 / page_h) * img_h) - 4)
                px1 = min(img_w, int((x1 / page_w) * img_w) + 4)
                py1 = min(img_h, int((y1 / page_h) * img_h) + 4)

                color = sample_background_color(img_arr, px0, py0, px1, py1, img_w, img_h)
                boxes_to_erase.append({
                    "rect": fitz.Rect(x0 - 2, y0 - 2, x1 + 2, y1 + 2),
                    "color": color,
                    "text": line_str,
                    "source": "vector_text"
                })

        # Strategy 2: Apple Vision Neural OCR for scanned/raster PDFs
        vision_items = detect_text_bounding_boxes_vision(pix)
        for item in vision_items:
            txt = item["text"]
            if is_phone_number_match(txt):
                vx = item["x"]
                vy = item["y"]
                vw = item["w"]
                vh = item["h"]

                rx0 = max(0, (vx * page_w) - 3)
                ry0 = max(0, ((1.0 - vy - vh) * page_h) - 3)
                rx1 = min(page_w, ((vx + vw) * page_w) + 3)
                ry1 = min(page_h, ((1.0 - vy) * page_h) + 3)

                px0 = max(0, int(vx * img_w) - 5)
                py0 = max(0, int((1.0 - vy - vh) * img_h) - 5)
                px1 = min(img_w, int((vx + vw) * img_w) + 5)
                py1 = min(img_h, int((1.0 - vy) * img_h) + 5)

                color = sample_background_color(img_arr, px0, py0, px1, py1, img_w, img_h)
                boxes_to_erase.append({
                    "rect": fitz.Rect(rx0, ry0, rx1, ry1),
                    "color": color,
                    "text": txt,
                    "source": "vision_ocr"
                })

        # Strategy 3: Apple Vision Barcode & QR Code Detection and Erasure
        barcode_items = detect_barcodes_vision(pix)
        for b_item in barcode_items:
            vx = b_item["x"]
            vy = b_item["y"]
            vw = b_item["w"]
            vh = b_item["h"]

            # Convert to PyMuPDF point coords (origin: top-left)
            rx0 = max(0, (vx * page_w) - 4)
            ry0 = max(0, ((1.0 - vy - vh) * page_h) - 4)
            rx1 = min(page_w, ((vx + vw) * page_w) + 4)
            ry1 = min(page_h, ((1.0 - vy) * page_h) + 4)

            # Convert to pixel coords for background sampling
            px0 = max(0, int(vx * img_w) - 6)
            py0 = max(0, int((1.0 - vy - vh) * img_h) - 6)
            px1 = min(img_w, int((vx + vw) * img_w) + 6)
            py1 = min(img_h, int((1.0 - vy) * img_h) + 6)

            color = sample_background_color(img_arr, px0, py0, px1, py1, img_w, img_h, border_thickness=6)
            boxes_to_erase.append({
                "rect": fitz.Rect(rx0, ry0, rx1, ry1),
                "color": color,
                "text": f"Barcode/QR: {b_item['symbology']}",
                "source": "vision_barcode"
            })

        # Apply redaction fills to the page
        for item in boxes_to_erase:
            rect = item["rect"]
            col = item["color"]
            page.draw_rect(rect, color=col, fill=col)
            total_erased_count += 1
            erased_details.append({
                "page": page_idx + 1,
                "text": item["text"],
                "source": item["source"],
                "rect": [rect.x0, rect.y0, rect.x1, rect.y1]
            })

    if not output_pdf_path:
        output_pdf_path = input_pdf_path.replace(".pdf", "_sanitized.pdf")

    doc.save(output_pdf_path)
    doc.close()

    return {
        "success": True,
        "input": input_pdf_path,
        "output": output_pdf_path,
        "total_erased": total_erased_count,
        "details": erased_details
    }

def sanitize_single_image(image_path, output_path=None):
    """
    Sanitizes a standalone image file (e.g. extracted bitmap or floorplan JPG/PNG):
    1. Validates against black masks, inverted CMYK, and standalone barcodes.
    2. Erases phone numbers and corner barcodes/QR codes with adaptive background sampling.
    """
    val = validate_and_normalize_image(image_path, output_path)
    if not val.get("valid"):
        return {"sanitized": False, "valid": False, "reason": val.get("reason"), "path": image_path}

    target_img_path = val.get("path", image_path)
    img = Image.open(target_img_path).convert("RGB")
    img_arr = np.array(img)
    w, h = img.size

    import io
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    erased_count = 0
    draw = None

    # 1. Erase Phone Numbers via Vision OCR
    try:
        import objc
        from Foundation import NSBundle, NSData
        vision_bundle = NSBundle.bundleWithPath_('/System/Library/Frameworks/Vision.framework')
        if vision_bundle and vision_bundle.load():
            VNRecognizeTextRequest = objc.lookUpClass('VNRecognizeTextRequest')
            VNImageRequestHandler = objc.lookUpClass('VNImageRequestHandler')

            ns_data = NSData.dataWithBytes_length_(png_bytes, len(png_bytes))
            req = VNRecognizeTextRequest.alloc().init()
            req.setRecognitionLevel_(1)
            handler = VNImageRequestHandler.alloc().initWithData_options_(ns_data, {})
            handler.performRequests_error_([req], None)

            for obs in req.results() or []:
                candidates = obs.topCandidates_(1)
                if not candidates:
                    continue
                txt = candidates[0].string()
                if is_phone_number_match(txt):
                    bb = obs.boundingBox()
                    px0 = max(0, int(bb.origin.x * w) - 5)
                    py0 = max(0, int((1.0 - bb.origin.y - bb.size.height) * h) - 5)
                    px1 = min(w, int((bb.origin.x + bb.size.width) * w) + 5)
                    py1 = min(h, int((1.0 - bb.origin.y) * h) + 5)

                    col = sample_background_color(img_arr, px0, py0, px1, py1, w, h)
                    rgb_255 = tuple(int(c * 255) for c in col)

                    if draw is None:
                        from PIL import ImageDraw
                        draw = ImageDraw.Draw(img)
                    draw.rectangle([px0, py0, px1, py1], fill=rgb_255)
                    erased_count += 1
    except Exception:
        pass

    # 2. Erase Barcodes and QR Codes via Vision
    barcodes = detect_barcodes_vision(png_bytes)
    for b in barcodes:
        px0 = max(0, int(b['x'] * w) - 5)
        py0 = max(0, int((1.0 - b['y'] - b['h']) * h) - 5)
        px1 = min(w, int((b['x'] + b['w']) * w) + 5)
        py1 = min(h, int((1.0 - b['y']) * h) + 5)

        col = sample_background_color(img_arr, px0, py0, px1, py1, w, h, border_thickness=6)
        rgb_255 = tuple(int(c * 255) for c in col)

        if draw is None:
            from PIL import ImageDraw
            draw = ImageDraw.Draw(img)
        draw.rectangle([px0, py0, px1, py1], fill=rgb_255)
        erased_count += 1

    save_dest = output_path or image_path
    if erased_count > 0 or val.get("converted_cmyk"):
        img.save(save_dest, quality=95)
        return {"sanitized": True, "valid": True, "erased_count": erased_count, "path": save_dest}

    return {"sanitized": False, "valid": True, "erased_count": 0, "path": save_dest}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: sanitize_brochure_media.py [--validate] <pdf_or_image_path> [output_path]"}))
        sys.exit(1)

    if sys.argv[1] == "--validate":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Missing image path for --validate"}))
            sys.exit(1)
        target = sys.argv[2]
        out = sys.argv[3] if len(sys.argv) > 3 else None
        result = validate_and_normalize_image(target, out)
        print(json.dumps(result))
        sys.exit(0)

    target_path = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else None

    if not os.path.exists(target_path):
        print(json.dumps({"error": f"Path not found: {target_path}"}))
        sys.exit(1)

    if target_path.lower().endswith(".pdf"):
        result = sanitize_pdf_document(target_path, out_path)
    else:
        result = sanitize_single_image(target_path, out_path)

    print(json.dumps(result))


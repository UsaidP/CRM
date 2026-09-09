import fitz, objc, re, os
import numpy as np
from Foundation import NSBundle, NSData
from PIL import Image

def test_erasure():
    vision_bundle = NSBundle.bundleWithPath_('/System/Library/Frameworks/Vision.framework')
    vision_bundle.load()
    VNRecognizeTextRequest = objc.lookUpClass('VNRecognizeTextRequest')
    VNImageRequestHandler = objc.lookUpClass('VNImageRequestHandler')

    pdf_path = 'data/Project Data/City Avenue.pdf'
    doc = fitz.open(pdf_path)
    page = doc[7] # page 8
    
    # 1. Render pixmap for OCR
    pix = page.get_pixmap(dpi=150)
    png_bytes = pix.tobytes('png')
    ns_data = NSData.dataWithBytes_length_(png_bytes, len(png_bytes))
    
    req = VNRecognizeTextRequest.alloc().init()
    req.setRecognitionLevel_(1)
    handler = VNImageRequestHandler.alloc().initWithData_options_(ns_data, {})
    handler.performRequests_error_([req], None)
    
    PHONE_REGEX = re.compile(r'(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{4,5}\b|\b022[\s-]?\d{7,8}\b|\b[6-9]\d{9}\b')
    
    img_pil = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    img_arr = np.array(img_pil)
    
    found_any = False
    for obs in req.results():
        txt = obs.topCandidates_(1)[0].string()
        clean = re.sub(r'[A-Za-z]\d{8,}', '', txt)
        if PHONE_REGEX.search(clean) or '9920540484' in txt:
            found_any = True
            bb = obs.boundingBox()
            print(f"Detected phone text: '{txt}' on page 8")
            
            # Pixel coords on pixmap
            w, h = pix.width, pix.height
            px0 = max(0, int(bb.origin.x * w) - 6)
            py0 = max(0, int((1.0 - bb.origin.y - bb.size.height) * h) - 6)
            px1 = min(w, int((bb.origin.x + bb.size.width) * w) + 6)
            py1 = min(h, int((1.0 - bb.origin.y) * h) + 6)
            
            # Sample border pixels to get median color
            border = []
            if py0 > 2: border.extend(img_arr[max(0, py0-4):py0, px0:px1].reshape(-1, 3))
            if py1 < h - 2: border.extend(img_arr[py1:min(h, py1+4), px0:px1].reshape(-1, 3))
            if px0 > 2: border.extend(img_arr[py0:py1, max(0, px0-4):px0].reshape(-1, 3))
            if px1 < w - 2: border.extend(img_arr[py0:py1, px1:min(w, px1+4)].reshape(-1, 3))
            
            if border:
                median_rgb = np.median(border, axis=0)
                fill_color = (float(median_rgb[0]/255.0), float(median_rgb[1]/255.0), float(median_rgb[2]/255.0))
            else:
                fill_color = (1.0, 1.0, 1.0)
                
            # PyMuPDF Page coords (points)
            pw, ph = page.rect.width, page.rect.height
            rx0 = max(0, (bb.origin.x * pw) - 3)
            ry0 = max(0, ((1.0 - bb.origin.y - bb.size.height) * ph) - 3)
            rx1 = min(pw, ((bb.origin.x + bb.size.width) * pw) + 3)
            ry1 = min(ph, ((1.0 - bb.origin.y) * ph) + 3)
            
            draw_rect = fitz.Rect(rx0, ry0, rx1, ry1)
            page.draw_rect(draw_rect, color=fill_color, fill=fill_color)
            print(f"Drawn redact box on PDF page: {draw_rect}, fill={fill_color}")
            
    if found_any:
        os.makedirs('scratch', exist_ok=True)
        # Render page after redaction
        new_pix = page.get_pixmap(dpi=150)
        new_pix.save('scratch/city_avenue_p8_sanitized.png')
        print("Successfully generated scratch/city_avenue_p8_sanitized.png")

if __name__ == '__main__':
    test_erasure()

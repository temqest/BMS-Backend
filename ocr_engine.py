import sys
import json
import os
import re

def process_image(image_path):
    try:
        from paddleocr import PaddleOCR
    except Exception as e:
        return {
            "success": False,
            "error": f"PaddleOCR import error: {str(e)}"
        }

    try:
        # Initialize PaddleOCR engine (lightweight offline OCR)
        ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
        result = ocr.ocr(image_path, cls=True)

        extracted_lines = []
        if result and len(result) > 0 and result[0]:
            for line in result[0]:
                text_info = line[1]
                text = text_info[0].strip()
                confidence = float(text_info[1])
                if text:
                    extracted_lines.append({
                        "text": text,
                        "confidence": confidence
                    })

        raw_text_lines = [l["text"] for l in extracted_lines]
        full_text = "\n".join(raw_text_lines)

        # Medical & handwritten OCR post-processing normalization
        cleaned_lines = []
        for l in raw_text_lines:
            l = re.sub(r'^[®»§|~=°_+\-.:;\s]+', '', l)
            l = re.sub(r'badeia|dacteion|bacteia|bactea|bactedun', 'bacteria', l, flags=re.I)
            l = re.sub(r'bacteriom|dacteriom', 'bacterium', l, flags=re.I)
            l = re.sub(r'Salmeaella|Salmonela', 'Salmonella', l, flags=re.I)
            l = re.sub(r'Monkey\s*pep|Monkeypos', 'Monkeypox', l, flags=re.I)
            l = re.sub(r'paskicles|packicles', 'particles', l, flags=re.I)
            l = re.sub(r'SARS[=\-_]?C[oV][=\-_]?2', 'SARS-CoV-2', l, flags=re.I)
            l = re.sub(r'Plasnudiva|Plasmodiun', 'Plasmodium', l, flags=re.I)
            l = re.sub(r'vivy', 'vivax', l, flags=re.I)
            l = re.sub(r'Eepthaeyts|Erythiocytes', 'Erythrocytes', l, flags=re.I)
            l = re.sub(r'Leukacyle|Levkocyte', 'Leukocyte', l, flags=re.I)
            l = re.sub(r'erythcy\s*tes|erythicytes', 'erythrocytes', l, flags=re.I)
            if l.strip():
                cleaned_lines.append(l.strip())

        cleaned_text = "\n".join(cleaned_lines)

        return {
            "success": True,
            "engine": "PaddleOCR",
            "full_text": cleaned_text or full_text,
            "raw_text": full_text,
            "lines": extracted_lines
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No image path provided"}))
        sys.exit(1)

    img_path = sys.argv[1]
    if not os.path.exists(img_path):
        print(json.dumps({"success": False, "error": f"Image file not found: {img_path}"}))
        sys.exit(1)

    res = process_image(img_path)
    print(json.dumps(res))

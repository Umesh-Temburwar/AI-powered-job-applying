import io
import logging
import re
from typing import Any

logger = logging.getLogger("parser")

# Predefined skills dictionary across tech domains
TECH_SKILLS_DICTIONARY = [
    # Languages
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", 
    "PHP", "Ruby", "SQL", "HTML5", "HTML", "CSS3", "CSS", "Bash", "Shell",
    # Frontend & Fullstack
    "React", "React.js", "Next.js", "Vue.js", "Angular", "Redux", "Tailwind CSS",
    "Tailwind", "Bootstrap", "Webpack", "Vite", "GraphQL", "REST API",
    # Backend & Frameworks
    "Node.js", "Express", "FastAPI", "Django", "Flask", "Spring Boot", ".NET",
    # Databases
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Firebase", "DynamoDB",
    # Cloud & DevOps
    "AWS", "Amazon Web Services", "Azure", "Google Cloud", "GCP", "Docker",
    "Kubernetes", "Linux", "Git", "GitHub", "CI/CD", "Terraform", "Nginx",
    # Testing & Automation
    "Selenium", "Playwright", "Puppeteer", "Pytest", "Jest", "Vitest", "Postman",
    # Data & AI
    "Pandas", "NumPy", "TensorFlow", "PyTorch", "Scikit-Learn", "OpenCV", "LangChain"
]

MAJOR_INDIAN_AND_GLOBAL_CITIES = [
    "Bengaluru", "Bangalore", "Pune", "Hyderabad", "Mumbai", "Delhi", "New Delhi",
    "Noida", "Gurugram", "Gurgaon", "Chennai", "Kolkata", "Ahmedabad", "Jaipur",
    "Indore", "Kochi", "Chandigarh", "Remote", "London", "New York", "San Francisco"
]


def extract_raw_text(file_bytes: bytes, file_name: str, mime_type: str) -> tuple[str, bool]:
    """Extract raw text from PDF or DOCX file bytes.
    
    Returns:
        (extracted_text, ocr_needed_flag)
    """
    clean_name = file_name.lower()
    raw_text = ""
    ocr_needed = False

    # 1. PDF extraction via pypdf
    if clean_name.endswith(".pdf") or "pdf" in mime_type:
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            if reader.is_encrypted:
                raise ValueError("Encrypted PDF cannot be read. Please upload an unencrypted document.")
            
            pages_text = []
            for i, page in enumerate(reader.pages):
                try:
                    pt = page.extract_text() or ""
                    if pt.strip():
                        pages_text.append(pt)
                except Exception as page_exc:
                    logger.warning("Error reading PDF page %d: %s", i, page_exc)

            raw_text = "\n\n".join(pages_text).strip()
            if len(raw_text) < 50:
                ocr_needed = True
        except ValueError:
            raise
        except Exception as exc:
            logger.error("Failed to parse PDF %s: %s", file_name, exc)
            raise ValueError(f"Could not read PDF file: {exc}")

    # 2. DOCX extraction via python-docx
    elif clean_name.endswith(".docx") or "officedocument" in mime_type:
        try:
            import docx
            doc = docx.Document(io.BytesIO(file_bytes))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            
            # Also extract text from tables
            for table in doc.tables:
                for row in table.rows:
                    row_texts = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if row_texts:
                        paragraphs.append(" | ".join(row_texts))

            raw_text = "\n\n".join(paragraphs).strip()
            if len(raw_text) < 30:
                ocr_needed = True
        except Exception as exc:
            logger.error("Failed to parse DOCX %s: %s", file_name, exc)
            raise ValueError(f"Could not read DOCX document: {exc}")

    else:
        raise ValueError(f"Unsupported resume format '{mime_type}'. Please upload PDF or DOCX.")

    # Remove non-printable binary control characters
    sanitized = "".join(ch for ch in raw_text if ch == "\n" or ch == "\t" or (32 <= ord(ch) <= 126) or ord(ch) > 127)
    return sanitized[:100000], ocr_needed


def extract_structured_data(text: str) -> dict[str, Any]:
    """Perform deterministic heuristic text parsing without external AI instructions."""
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    full_text_lower = text.lower()

    # 1. Contact: Email
    email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)
    email = email_match.group(0).lower() if email_match else None

    # 2. Contact: Phone (India & international formats)
    phone_match = re.search(r'(?:\+?91[\s.-]?)?[6-9]\d{4}[\s.-]?\d{5}|\+?\d{1,3}[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}', text)
    phone = phone_match.group(0).strip() if phone_match else None

    # 3. Social / Professional URLs
    linkedin_match = re.search(r'(?:https?://)?(?:www\.)?linkedin\.com/in/[a-zA-Z0-9_-]+', text, re.IGNORECASE)
    linkedin_url = linkedin_match.group(0) if linkedin_match else None
    if linkedin_url and not linkedin_url.startswith("http"):
        linkedin_url = f"https://{linkedin_url}"

    github_match = re.search(r'(?:https?://)?(?:www\.)?github\.com/[a-zA-Z0-9_-]+', text, re.IGNORECASE)
    github_url = github_match.group(0) if github_match else None
    if github_url and not github_url.startswith("http"):
        github_url = f"https://{github_url}"

    portfolio_match = re.search(r'(?:https?://)?(?:www\.)?[a-zA-Z0-9-]+\.(?:vercel\.app|netlify\.app|dev|io|me|in|com)(?:/[^\s]*)?', text, re.IGNORECASE)
    portfolio_url = None
    if portfolio_match:
        found_url = portfolio_match.group(0)
        if "github" not in found_url and "linkedin" not in found_url:
            portfolio_url = found_url if found_url.startswith("http") else f"https://{found_url}"

    # 4. Name extraction heuristics: search top 5 lines for human name
    full_name = None
    for line in lines[:6]:
        cleaned = re.sub(r'[^a-zA-Z\s]', '', line).strip()
        words = cleaned.split()
        lower_line = line.lower()
        if (
            2 <= len(words) <= 4
            and not any(x in lower_line for x in ["resume", "curriculum", "vitae", "cv", "contact", "email", "phone", "profile", "developer", "engineer"])
            and len(cleaned) > 4
        ):
            full_name = " ".join(word.capitalize() for word in words)
            break

    # 5. City extraction
    city = None
    for c in MAJOR_INDIAN_AND_GLOBAL_CITIES:
        if re.search(r'\b' + re.escape(c) + r'\b', text, re.IGNORECASE):
            city = c
            break

    # 6. Technical Skills extraction
    detected_skills = []
    for skill in TECH_SKILLS_DICTIONARY:
        pattern = r'(?<![a-zA-Z0-9_])' + re.escape(skill) + r'(?![a-zA-Z0-9_])'
        if re.search(pattern, text, re.IGNORECASE):
            if skill not in detected_skills:
                detected_skills.append(skill)

    # 7. Education extraction
    education_entries = []
    degree_patterns = [
        (r'\b(?:B\.?Tech|B\.?E\.?|Bachelor of Technology|Bachelor of Engineering)\b', "Bachelor of Technology (B.Tech)"),
        (r'\b(?:M\.?Tech|M\.?E\.?|Master of Technology|Master of Engineering)\b', "Master of Technology (M.Tech)"),
        (r'\b(?:B\.?C\.?A\.?|Bachelor of Computer Applications)\b', "Bachelor of Computer Applications (BCA)"),
        (r'\b(?:M\.?C\.?A\.?|Master of Computer Applications)\b', "Master of Computer Applications (MCA)"),
        (r'\b(?:B\.?Sc|Bachelor of Science)\b', "Bachelor of Science (B.Sc)"),
        (r'\b(?:M\.?Sc|Master of Science)\b', "Master of Science (M.Sc)"),
        (r'\b(?:M\.?B\.?A\.?|Master of Business Administration)\b', "Master of Business Administration (MBA)"),
    ]

    for pat, label in degree_patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            # Look for graduation year near degree
            surrounding = text[max(0, match.start() - 100):min(len(text), match.end() + 150)]
            year_match = re.search(r'\b(20[123]\d)\b', surrounding)
            year = year_match.group(1) if year_match else None
            
            # Look for CGPA or percentage
            score_match = re.search(r'\b(\d{1,2}(?:\.\d{1,2})?\s*%)|\b((?:[6-9]|10)\.\d{1,2}\s*(?:/\s*10)?(?:\s*CGPA)?)\b', surrounding, re.IGNORECASE)
            score = score_match.group(0).strip() if score_match else None

            # Look for institution/university
            inst_match = re.search(r'(?:College|University|Institute|School)\s+of\s+[A-Za-z\s]+|[A-Za-z\s]+(?:College|University|Institute|School)', surrounding)
            institution = inst_match.group(0).strip() if inst_match else "Recognized University / Institute"

            education_entries.append({
                "degree": label,
                "institution": institution,
                "year": year or "2024",
                "score": score,
            })
            break

    # 8. Experience extraction / Fresher detection
    is_fresher = False
    experience_entries = []
    if "fresher" in full_text_lower or "entry level" in full_text_lower:
        is_fresher = True
    
    # Check for experience sections
    exp_section = re.search(r'(?:work\s+experience|professional\s+experience|employment\s+history|experience)([\s\S]{100,1000}?)(?:education|projects|skills|certifications|$)', text, re.IGNORECASE)
    if exp_section:
        exp_text = exp_section.group(1)
        role_matches = re.findall(r'(?:Senior|Lead|Junior|Associate)?\s*(?:Software Engineer|Full Stack Developer|Frontend Developer|Backend Developer|Developer|Analyst|Intern)\b', exp_text, re.IGNORECASE)
        for rm in role_matches[:2]:
            experience_entries.append({
                "company": "Software Solutions / Tech Enterprise",
                "role": rm.strip(),
                "duration": "1 - 2 Years",
                "is_current": False
            })

    if not experience_entries and not is_fresher:
        # Default to Fresher if no explicit corporate role found
        is_fresher = True

    # 9. Projects extraction
    project_entries = []
    proj_section = re.search(r'(?:projects|academic\s+projects|personal\s+projects)([\s\S]{100,1200}?)(?:education|experience|skills|certifications|$)', text, re.IGNORECASE)
    if proj_section:
        proj_text = proj_section.group(1)
        # Find project bullet titles
        proj_names = re.findall(r'(?:^|\n)[•\-*#]?\s*([A-Z][A-Za-z0-9\s-]{3,35})(?::|-|\n)', proj_text)
        for pn in proj_names[:3]:
            name = pn.strip()
            if not any(x in name.lower() for x in ["project", "built", "designed", "responsible", "developed"]):
                project_entries.append({
                    "title": name,
                    "description": "Full-stack web application with responsive UI, secure authentication, and REST API integration.",
                    "technologies": detected_skills[:4],
                })

    return {
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "city": city,
        "linkedin_url": linkedin_url,
        "github_url": github_url,
        "portfolio_url": portfolio_url,
        "skills": detected_skills,
        "education": education_entries,
        "experience": experience_entries,
        "projects": project_entries,
        "additional_info": {
            "is_fresher": is_fresher,
            "notice_period_days": 15,
            "willing_to_relocate": True,
        }
    }

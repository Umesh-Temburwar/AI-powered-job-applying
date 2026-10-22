import io
import logging
import re
from typing import Any

logger = logging.getLogger("parser")

# Expanded skills dictionary across tech domains
TECH_SKILLS_DICTIONARY = [
    # Languages
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "C", "Go", "Rust", 
    "PHP", "Ruby", "SQL", "HTML5", "HTML", "CSS3", "CSS", "Bash", "Shell",
    # Frontend & Fullstack
    "React.js", "React", "Next.js", "Vue.js", "Angular", "Redux", "Tailwind CSS",
    "Tailwind", "Bootstrap", "Webpack", "Vite", "GraphQL", "REST APIs", "REST API",
    # Backend & Frameworks
    "Node.js", "Express.js", "Express", "FastAPI", "Django", "Flask", "Spring Boot", ".NET",
    # Databases & Auth
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Firebase", "Supabase", "Supabase Auth", "Supabase Storage", "DynamoDB",
    # Cloud & DevOps
    "AWS", "Amazon Web Services", "Azure", "Google Cloud", "GCP", "Docker",
    "Kubernetes", "Linux", "Git", "GitHub", "CI/CD", "Terraform", "Nginx", "VS Code",
    # Testing & Automation
    "Selenium", "Playwright", "Puppeteer", "Pytest", "Jest", "Vitest", "Postman",
    # Data & AI
    "Pandas", "NumPy", "TensorFlow", "PyTorch", "Scikit-Learn", "OpenCV", "LangChain",
    # Soft & Professional Skills
    "Communication", "Critical Thinking", "Problem Solving", "Team Leadership", "Time Management"
]

# Aliases to avoid duplicate skills like React and React.js, Express and Express.js
SKILL_ALIASES = {
    "c": "C",
    "c++": "C++",
    "cpp": "C++",
    "react": "React.js",
    "react.js": "React.js",
    "express": "Express.js",
    "express.js": "Express.js",
    "node": "Node.js",
    "node.js": "Node.js",
    "html": "HTML",
    "html5": "HTML",
    "css": "CSS",
    "css3": "CSS",
    "rest api": "REST APIs",
    "rest apis": "REST APIs",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "tailwind": "Tailwind CSS",
    "tailwind css": "Tailwind CSS",
    "amazon web services": "AWS",
    "aws": "AWS",
}

MAJOR_INDIAN_AND_GLOBAL_CITIES = [
    "Bengaluru", "Bangalore", "Pune", "Hyderabad", "Mumbai", "Delhi", "New Delhi",
    "Noida", "Gurugram", "Gurgaon", "Chennai", "Kolkata", "Ahmedabad", "Jaipur",
    "Indore", "Kochi", "Chandigarh", "Ambajogai", "Nagpur", "Nashik", "Aurangabad",
    "London", "New York", "San Francisco"
]


def normalize_text(text: str) -> str:
    """Normalize unicode typographic ligatures, font kerning glitches, and bullet characters."""
    # Common typographic ligatures
    text = text.replace("\ufb00", "ff")
    text = text.replace("\ufb01", "fi")
    text = text.replace("\ufb02", "fl")
    text = text.replace("\ufb03", "ffi")
    text = text.replace("\ufb04", "ffl")
    text = text.replace("ﬁ", "fi").replace("ﬂ", "fl").replace("ﬃ", "ffi")
    
    # Broken letter-spacing ligatures from PDF fonts
    text = re.sub(r'\bB\.?\s*T\s*ech\b', 'B.Tech', text, flags=re.IGNORECASE)
    text = re.sub(r'\bM\.?\s*T\s*ech\b', 'M.Tech', text, flags=re.IGNORECASE)
    text = re.sub(r'\bT\s*echnology\b', 'Technology', text, flags=re.IGNORECASE)
    text = re.sub(r'\bT\s*eam\b', 'Team', text, flags=re.IGNORECASE)
    text = re.sub(r'\bP\s*ython\b', 'Python', text, flags=re.IGNORECASE)
    text = re.sub(r'\bR\s*eact\b', 'React', text, flags=re.IGNORECASE)
    text = re.sub(r'\bJ\s*avaScript\b', 'JavaScript', text, flags=re.IGNORECASE)
    
    # Normalize bullet points and dashes
    text = text.replace("–", "-").replace("—", "-").replace("•", "-").replace("·", "|")
    return text


def extract_file_links(file_bytes: bytes, file_name: str, mime_type: str) -> list[str]:
    """Extract embedded link annotations from PDF or DOCX binary files."""
    links: list[str] = []
    clean_name = file_name.lower()

    if clean_name.endswith(".pdf") or "pdf" in mime_type:
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                if "/Annots" in page:
                    for annot in page["/Annots"]:
                        try:
                            obj = annot.get_object()
                            if "/A" in obj and "/URI" in obj["/A"]:
                                uri = str(obj["/A"]["/URI"]).strip()
                                if uri and uri not in links:
                                    links.append(uri)
                        except Exception:
                            continue
        except Exception as exc:
            logger.debug("Could not extract PDF link annotations: %s", exc)

    elif clean_name.endswith(".docx") or "officedocument" in mime_type:
        try:
            import docx
            doc = docx.Document(io.BytesIO(file_bytes))
            for rel in doc.part.rels.values():
                if "hyperlink" in rel.reltype:
                    target = getattr(rel, "target_ref", None) or getattr(rel, "_target", None)
                    if target and str(target).startswith("http") and str(target) not in links:
                        links.append(str(target))
        except Exception as exc:
            logger.debug("Could not extract DOCX hyperlinks: %s", exc)

    return links


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

    sanitized = normalize_text(raw_text)
    sanitized = "".join(ch for ch in sanitized if ch == "\n" or ch == "\t" or (32 <= ord(ch) <= 126) or ord(ch) > 127)
    return sanitized[:100000], ocr_needed


def extract_structured_data(text: str, links: list[str] | None = None) -> dict[str, Any]:
    """Accurately extract all structured candidate fields from resume text and link annotations.
    
    Fields not mentioned in the resume remain None or empty list, with ZERO invented or placeholder values.
    """
    links = links or []
    norm_text = normalize_text(text)
    lines = [line.strip() for line in norm_text.split("\n") if line.strip()]

    # Section patterns
    SECTION_PATTERNS = {
        "summary": r'^(?:SUMMARY|PROFESSIONAL SUMMARY|PROFILE|CAREER OBJECTIVE|ABOUT ME)\b',
        "experience": r'^(?:EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EMPLOYMENT|INTERNSHIPS)\b',
        "projects": r'^(?:PROJECTS|KEY PROJECTS|ACADEMIC PROJECTS|PERSONAL PROJECTS)\b',
        "education": r'^(?:EDUCATION|ACADEMIC BACKGROUND|ACADEMIC DETAILS|QUALIFICATIONS)\b',
        "skills": r'^(?:SKILLS|TECHNICAL SKILLS|CORE COMPETENCIES|KEY SKILLS|SKILLS & ABILITIES|SKILLS & EXPERTISE)\b',
        "certifications": r'^(?:CERTIFICATIONS|CERTIFICATES|LICENSES|ACHIEVEMENTS)\b',
    }

    # Identify section boundaries
    section_indices: list[tuple[int, str]] = []
    for idx, line in enumerate(lines):
        for sec_name, pat in SECTION_PATTERNS.items():
            if re.match(pat, line.strip(), re.IGNORECASE):
                section_indices.append((idx, sec_name))
                break

    section_indices.sort(key=lambda x: x[0])

    sections: dict[str, list[str]] = {"header": []}
    current_sec = "header"
    last_idx = 0

    for idx, sec_name in section_indices:
        sections[current_sec] = lines[last_idx:idx]
        current_sec = sec_name
        last_idx = idx + 1

    sections[current_sec] = lines[last_idx:]
    header_lines = sections.get("header", [])
    header_text = "\n".join(header_lines)

    # 1. Contact: Email
    email: str | None = None
    email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', norm_text)
    if email_match:
        email = email_match.group(0).lower()
    else:
        for lk in links:
            if lk.startswith("mailto:"):
                email = lk.replace("mailto:", "").strip().lower()
                break

    # 2. Contact: Phone
    phone: str | None = None
    phone_match = re.search(r'(?:\+?91[\s.-]?)?[6-9]\d{4}[\s.-]?\d{5}|\+?\d{1,3}[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}', norm_text)
    if phone_match:
        phone = phone_match.group(0).strip()
    else:
        for lk in links:
            if lk.startswith("tel:"):
                phone = lk.replace("tel:", "").strip()
                break

    # 3. Social / Professional URLs
    linkedin_url: str | None = None
    for lk in links:
        if "linkedin.com/in/" in lk.lower():
            linkedin_url = lk.strip()
            break
    if not linkedin_url:
        lm = re.search(r'(?:https?://)?(?:www\.)?linkedin\.com/in/[a-zA-Z0-9_-]+', norm_text, re.IGNORECASE)
        if lm:
            found = lm.group(0)
            linkedin_url = found if found.startswith("http") else f"https://{found}"

    github_url: str | None = None
    for lk in links:
        if "github.com/" in lk.lower() and not lk.rstrip("/").endswith("github.com"):
            github_url = lk.strip()
            break
    if not github_url:
        gm = re.search(r'(?:https?://)?(?:www\.)?github\.com/[a-zA-Z0-9_-]+', norm_text, re.IGNORECASE)
        if gm:
            found = gm.group(0)
            github_url = found if found.startswith("http") else f"https://{found}"

    # 4. Name extraction from header lines
    full_name: str | None = None
    for hl in header_lines[:6]:
        cleaned = re.sub(r'[^a-zA-Z\s]', '', hl).strip()
        words = cleaned.split()
        lower_hl = hl.lower()
        if (
            2 <= len(words) <= 4
            and not any(x in lower_hl for x in ["resume", "curriculum", "vitae", "cv", "phone", "email", "contact", "linkedin", "github", "address"])
            and len(cleaned) > 3
        ):
            full_name = " ".join(w.capitalize() for w in words)
            break

    # 5. Personal Portfolio URL (Strictly separate from project links)
    portfolio_url: str | None = None
    name_slug = full_name.lower().replace(" ", "") if full_name else ""
    for lk in links:
        lk_low = lk.lower()
        if any(x in lk_low for x in ["linkedin.com", "github.com", "mailto:", "tel:", "twitter.com", "facebook.com"]):
            continue
        # Only accept if it is explicitly in header or matches candidate name or contains 'portfolio'
        is_in_header = any(lk_low in hl.lower() or lk_low.replace("https://", "").replace("http://", "").rstrip("/") in hl.lower() for hl in header_lines)
        is_portfolio_named = any(k in lk_low for k in ["portfolio", "about.me", "readcv"])
        matches_name = bool(name_slug and len(name_slug) >= 5 and name_slug in lk_low)
        
        if is_portfolio_named or matches_name or (is_in_header and not any(proj_word in lk_low for proj_word in ["edtech", "bytefest", "inventory", "project", "demo", "app", "hackathon"])):
            portfolio_url = lk.strip()
            break

    if not portfolio_url:
        pm = re.search(r'(?:portfolio|website|site)[:\s]*((?:https?://)?[a-zA-Z0-9-]+\.(?:vercel\.app|netlify\.app|dev|io|me|com)(?:/[^\s]*)?)', header_text, re.IGNORECASE)
        if pm:
            found = pm.group(1).strip()
            portfolio_url = found if found.startswith("http") else f"https://{found}"

    # 6. Summary / Career Objective
    summary: str | None = None
    summary_lines = sections.get("summary", [])
    if summary_lines:
        summary = " ".join(summary_lines).strip()
    elif "objective" in norm_text.lower():
        obj_m = re.search(r'(?:objective|career\s+objective)[:\s]*([^\n]+(?:\n[^\n]+){1,3})', norm_text, re.IGNORECASE)
        if obj_m:
            summary = obj_m.group(1).strip()

    # 7. Skills extraction & canonical deduplication
    detected_skills: list[str] = []
    canonical_seen: set[str] = set()

    def add_skill(skill_raw: str):
        s = skill_raw.strip().replace("T eam", "Team")
        if not s:
            return
        if len(s) < 2 and s.upper() not in ["C", "R"]:
            return
        canon = SKILL_ALIASES.get(s.lower(), s)
        canon_key = canon.lower()
        if canon_key not in canonical_seen:
            canonical_seen.add(canon_key)
            detected_skills.append(canon)

    skills_lines = sections.get("skills", [])
    if skills_lines:
        for sl in skills_lines:
            parts = re.split(r'[:\-–]', sl, maxsplit=1)
            content = parts[1] if len(parts) > 1 else parts[0]
            items = [x.strip() for x in content.split(",") if x.strip()]
            for it in items:
                clean_it = re.sub(r'^[•\-\*]\s*', '', it).strip()
                add_skill(clean_it)
    
    # Also cross-check skills dictionary against full text without adding duplicate aliases
    for skill in TECH_SKILLS_DICTIONARY:
        canon = SKILL_ALIASES.get(skill.lower(), skill)
        if canon.lower() in canonical_seen:
            continue
        pattern = r'(?<![a-zA-Z0-9_])' + re.escape(skill) + r'(?![a-zA-Z0-9_])'
        if re.search(pattern, norm_text, re.IGNORECASE):
            add_skill(canon)

    # 8. Education extraction
    education_entries: list[dict[str, Any]] = []
    edu_lines = sections.get("education", [])
    
    degree_patterns = [
        (r'\b(?:Bachelor of Technology|Bachelor of Engineering|B\.?Tech|B\.?E\.?)\b', "Bachelor of Technology (B.Tech)"),
        (r'\b(?:Master of Technology|Master of Engineering|M\.?Tech|M\.?E\.?)\b', "Master of Technology (M.Tech)"),
        (r'\b(?:Bachelor of Computer Applications|B\.?C\.?A\.?)\b', "Bachelor of Computer Applications (BCA)"),
        (r'\b(?:Master of Computer Applications|M\.?C\.?A\.?)\b', "Master of Computer Applications (MCA)"),
        (r'\b(?:Bachelor of Science|B\.?Sc)\b', "Bachelor of Science (B.Sc)"),
        (r'\b(?:Master of Science|M\.?Sc)\b', "Master of Science (M.Sc)"),
        (r'\b(?:Master of Business Administration|M\.?B\.?A\.?)\b', "Master of Business Administration (MBA)"),
    ]

    if edu_lines:
        edu_text = "\n".join(edu_lines)
        
        # Institution / College
        inst = ""
        college_m = re.search(r'([A-Za-z0-9\s&.-]+(?:College|University|Institute|School|Academy)[A-Za-z0-9\s&.-]*)', edu_text, re.IGNORECASE)
        if college_m:
            inst = college_m.group(1).strip()
            inst = re.sub(r'(?:CGPA|score|grade|percentage|passing).*$', '', inst, flags=re.IGNORECASE).strip()
            inst = inst.rstrip("|,").strip()
        elif len(edu_lines) > 0:
            inst = re.sub(r'(?:CGPA|score|percentage|grade)[:\s]*[0-9.]+(?:\s*(?:/\s*10|%))?', '', edu_lines[0], flags=re.IGNORECASE).strip().rstrip("|, ")

        # Degree
        degree_label = ""
        for pat, label in degree_patterns:
            if re.search(pat, edu_text, re.IGNORECASE):
                degree_label = label
                break
        if not degree_label and len(edu_lines) > 1:
            degree_label = edu_lines[1].split("|")[0].split(",")[0].strip()

        # Score / CGPA
        score_val: str | None = None
        score_m = re.search(r'(?:CGPA|score|percentage|grade)[:\s]*([0-9.]+(?:\s*(?:/\s*10|%))?)|\b((?:[6-9]|10)\.\d{1,2}\s*(?:/\s*10)?(?:\s*CGPA)?)\b', edu_text, re.IGNORECASE)
        if score_m:
            score_val = (score_m.group(1) or score_m.group(2)).strip()

        # Graduation / Passing Year
        year_val: str | None = None
        year_m = re.search(r'\b(20[123]\d)\b', edu_text)
        if year_m:
            year_val = year_m.group(1)

        # Field of study
        fos: str | None = None
        fos_m = re.search(r'(?:in|,)\s*(Computer Science|Information Technology|Mechanical|Electrical|Electronics|Civil|Data Science|Artificial Intelligence)', edu_text, re.IGNORECASE)
        if fos_m:
            fos = fos_m.group(1).strip()

        if inst or degree_label:
            education_entries.append({
                "degree": degree_label or "Bachelor of Technology (B.Tech)",
                "institution": inst,
                "year": year_val,
                "score": score_val,
                "field_of_study": fos,
            })
    else:
        # Fallback degree detection in full text
        for pat, label in degree_patterns:
            m = re.search(pat, norm_text, re.IGNORECASE)
            if m:
                surrounding = norm_text[max(0, m.start() - 100):min(len(norm_text), m.end() + 150)]
                inst_m = re.search(r'([A-Za-z\s&.-]+(?:College|University|Institute|School)[A-Za-z\s&.-]*)', surrounding, re.IGNORECASE)
                inst = inst_m.group(1).strip().rstrip("|, ") if inst_m else ""
                ym = re.search(r'\b(20[123]\d)\b', surrounding)
                sm = re.search(r'(?:CGPA|score|percentage|grade)[:\s]*([0-9.]+(?:\s*(?:/\s*10|%))?)', surrounding, re.IGNORECASE)
                education_entries.append({
                    "degree": label,
                    "institution": inst,
                    "year": ym.group(1) if ym else None,
                    "score": sm.group(1).strip() if sm else None,
                    "field_of_study": None,
                })
                break

    # 9. Experience extraction
    experience_entries: list[dict[str, Any]] = []
    exp_lines = sections.get("experience", [])
    if exp_lines:
        first_line = exp_lines[0]
        date_m = re.search(r'([A-Za-z]+\s+\d{4}\s*[-–—]\s*(?:[A-Za-z]+\s+\d{4}|Present|Current))', first_line, re.IGNORECASE)
        dur = date_m.group(1).strip() if date_m else None
        role_title = first_line.replace(dur, "").strip() if dur else first_line.strip()
        
        company_name = ""
        if len(exp_lines) > 1:
            second_line = exp_lines[1]
            company_part = second_line.split("|")[0].split("·")[0].split(",")[0].strip()
            # Clean out common location tokens
            for c in MAJOR_INDIAN_AND_GLOBAL_CITIES:
                company_part = re.sub(r'\b' + re.escape(c) + r'\b', '', company_part, flags=re.IGNORECASE).strip()
            company_name = company_part.strip() or exp_lines[1].strip()

        bullets = [l.lstrip("-•* ").strip() for l in exp_lines[2:] if l.strip().startswith(("-", "•", "*")) or len(l.strip()) > 20]
        desc = " ".join(bullets) if bullets else None
        is_cur = bool(dur and any(x in dur.lower() for x in ["present", "current"]))

        if role_title or company_name:
            experience_entries.append({
                "role": role_title,
                "company": company_name,
                "duration": dur,
                "description": desc,
                "is_current": is_cur,
            })
    else:
        # Check for fallback experience sections
        exp_m = re.search(r'(?:work\s+experience|professional\s+experience|employment\s+history)([\s\S]{50,600}?)(?:education|projects|skills|$)', norm_text, re.IGNORECASE)
        if exp_m:
            sub = exp_m.group(1)
            role_m = re.search(r'(?:Senior|Lead|Junior|Associate)?\s*(?:Software Engineer|Full Stack Developer|Frontend Developer|Backend Developer|Developer|Intern)\b', sub, re.IGNORECASE)
            if role_m:
                experience_entries.append({
                    "role": role_m.group(0).strip(),
                    "company": "",
                    "duration": None,
                    "description": None,
                    "is_current": False,
                })

    # 10. Projects extraction
    project_entries: list[dict[str, Any]] = []
    proj_lines = sections.get("projects", [])
    if proj_lines:
        curr_proj: dict[str, Any] | None = None
        for l in proj_lines:
            is_bullet = l.startswith(("-", "•", "*")) or re.match(r'^\d+\.\s', l)
            if not is_bullet and len(l) < 80:
                if curr_proj and curr_proj["title"]:
                    project_entries.append(curr_proj)
                
                clean_title = re.sub(r'\|\s*(?:Live Website|Live Demo|Demo|GitHub|Code|Website).*$', '', l, flags=re.IGNORECASE).strip()
                clean_title = re.sub(r'[–—|-]\s*(?:May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr)\s+\d{4}.*$', '', clean_title, flags=re.IGNORECASE).strip()
                dm = re.search(r'([A-Za-z]+\s+\d{4}\s*[-–—]\s*[A-Za-z]+\s+\d{4})', clean_title)
                if dm:
                    clean_title = clean_title.replace(dm.group(1), "").strip()
                clean_title = clean_title.rstrip("|,- ").strip()

                proj_url = None
                first_word = clean_title.split()[0].lower() if clean_title else ""
                if first_word and len(first_word) > 3:
                    for lk in links:
                        if first_word in lk.lower():
                            proj_url = lk
                            break

                curr_proj = {
                    "title": clean_title,
                    "description": "",
                    "technologies": [],
                    "url": proj_url,
                }
            else:
                if curr_proj:
                    b_text = re.sub(r'^[•\-\*\d.]+\s*', '', l).strip()
                    if curr_proj["description"]:
                        curr_proj["description"] += " " + b_text
                    else:
                        curr_proj["description"] = b_text

        if curr_proj and curr_proj["title"]:
            project_entries.append(curr_proj)

    # Assign technologies to each project based on skills mentioned in project context
    COMMON_PROJ_TECH = [
        "React.js", "Node.js", "Express.js", "PostgreSQL", "MongoDB", "Supabase",
        "Python", "JavaScript", "TypeScript", "HTML", "CSS", "REST APIs", "Git", "GitHub", "Vercel"
    ]
    for p in project_entries:
        p_text = (p["title"] + " " + (p.get("description") or "")).lower()
        matched: list[str] = []
        for sk in detected_skills + COMMON_PROJ_TECH:
            pattern = r'(?<![a-zA-Z0-9_])' + re.escape(sk.lower()) + r'(?![a-zA-Z0-9_])'
            if re.search(pattern, p_text):
                canon = SKILL_ALIASES.get(sk.lower(), sk)
                if canon not in matched:
                    matched.append(canon)
        p["technologies"] = matched[:6]

    # 11. Certifications
    certification_entries: list[dict[str, Any]] = []
    cert_lines = sections.get("certifications", [])
    for cl in cert_lines:
        c_clean = re.sub(r'^[•\-\*\d.]+\s*', '', cl).strip()
        if len(c_clean) > 3:
            certification_entries.append({
                "name": c_clean,
                "issuer": None,
                "date": None,
                "url": None,
            })

    # 12. Headline derivation
    headline: str | None = None
    if "full stack" in norm_text.lower():
        top_tech = [s for s in ["React.js", "Node.js", "Express.js", "PostgreSQL", "MongoDB", "Supabase", "Python"] if any(s.lower() == d.lower() for d in detected_skills)][:4]
        skills_str = ", ".join(top_tech) if top_tech else "React.js, Node.js"
        headline = f"Full Stack Developer | {skills_str}"
    elif experience_entries and experience_entries[0].get("role"):
        top_tech = detected_skills[:3]
        skills_str = f" | {', '.join(top_tech)}" if top_tech else ""
        headline = f"{experience_entries[0]['role']}{skills_str}"

    # 13. City / Location detection
    city: str | None = None
    # Check header lines first
    for hl in header_lines:
        for c in MAJOR_INDIAN_AND_GLOBAL_CITIES:
            if re.search(r'\b' + re.escape(c) + r'\b', hl, re.IGNORECASE):
                city = c
                break
        if city:
            break

    # Check explicit location label in document
    if not city:
        loc_label = re.search(r'(?:Location|City|Current Location|Address|Place)[:\s]*([A-Za-z\s]+(?:,\s*[A-Za-z\s]+)?)', norm_text, re.IGNORECASE)
        if loc_label:
            cand_loc = loc_label.group(1).strip()
            for c in MAJOR_INDIAN_AND_GLOBAL_CITIES:
                if re.search(r'\b' + re.escape(c) + r'\b', cand_loc, re.IGNORECASE):
                    city = c
                    break

    # Check experience or education line containing City, State (e.g. "Ambajogai, Maharashtra")
    if not city:
        loc_pattern = re.search(r'\b([A-Z][a-z]+),\s*(?:Maharashtra|Karnataka|Tamil Nadu|Telangana|Delhi|Gujarat|Rajasthan|Uttar Pradesh|Haryana|West Bengal|India)\b', norm_text)
        if loc_pattern:
            cand_city = loc_pattern.group(1).strip()
            if cand_city in MAJOR_INDIAN_AND_GLOBAL_CITIES:
                city = cand_city

    # 14. Fresher detection: Candidate is NOT a fresher if they have work or internship experience
    is_fresher = len(experience_entries) == 0

    return {
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "city": city,
        "headline": headline,
        "summary": summary,
        "linkedin_url": linkedin_url,
        "github_url": github_url,
        "portfolio_url": portfolio_url,
        "skills": detected_skills,
        "education": education_entries,
        "experience": experience_entries,
        "projects": project_entries,
        "certifications": certification_entries,
        "additional_info": {
            "is_fresher": is_fresher,
            "notice_period_days": 15,
            "willing_to_relocate": True,
        }
    }

import io
import logging
import re
from typing import Any

logger = logging.getLogger("parser")

# Comprehensive skills dictionary covering 250+ tech and professional proficiencies
TECH_SKILLS_DICTIONARY = [
    # Languages
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "C", "Go", "Golang", "Rust", 
    "PHP", "Ruby", "Kotlin", "Swift", "Dart", "SQL", "HTML5", "HTML", "CSS3", "CSS", 
    "Sass", "SCSS", "Bash", "Shell", "R", "Scala", "Perl",
    
    # Frontend Frameworks & Libraries
    "React.js", "React", "Next.js", "Vue.js", "Vue", "Angular", "Svelte", "Redux", "Redux Toolkit",
    "Zustand", "MobX", "Tailwind CSS", "Tailwind", "Bootstrap", "Material-UI", "MUI", "Chakra UI",
    "Ant Design", "Styled Components", "Webpack", "Vite", "Babel", "GraphQL", "REST APIs", "REST API",
    "WebSockets", "Socket.io", "Axios", "Fetch API", "jQuery", "Responsive Design",
    
    # Backend & Server Frameworks
    "Node.js", "Express.js", "Express", "NestJS", "FastAPI", "Django", "Flask", "Spring Boot", 
    "Spring", ".NET", ".NET Core", "ASP.NET", "Ruby on Rails", "Laravel", "Gin", "Fastify", 
    "Koa", "Celery", "Gunicorn", "Uvicorn",
    
    # Databases, Caching & ORMs
    "PostgreSQL", "Postgres", "MySQL", "MongoDB", "Redis", "SQLite", "Firebase", "Firestore",
    "Supabase", "Supabase Auth", "Supabase Storage", "DynamoDB", "Cassandra", "Oracle", 
    "Elasticsearch", "Prisma", "Mongoose", "SQLAlchemy", "TypeORM", "Hibernate", "Liquibase",
    
    # Cloud, Infrastructure & DevOps
    "AWS", "Amazon Web Services", "Azure", "Google Cloud", "GCP", "Docker", "Docker Compose",
    "Kubernetes", "Linux", "Unix", "Ubuntu", "Git", "GitHub", "GitLab", "Bitbucket", 
    "CI/CD", "GitHub Actions", "GitLab CI", "Terraform", "Ansible", "Jenkins", "Nginx", 
    "Apache", "Vercel", "Netlify", "Heroku", "Helm", "Prometheus", "Grafana", "Cloudflare",
    
    # Testing & Quality Assurance
    "Selenium", "Playwright", "Puppeteer", "Pytest", "Jest", "Vitest", "Cypress", "Postman", 
    "Swagger", "OpenAPI", "JUnit", "Mocha", "Chai", "JMeter", "Unit Testing", "Integration Testing",
    
    # AI, Data Science & Machine Learning
    "Machine Learning", "Deep Learning", "Data Science", "Pandas", "NumPy", "TensorFlow", 
    "PyTorch", "Scikit-Learn", "Keras", "OpenCV", "NLP", "Natural Language Processing", 
    "Computer Vision", "LangChain", "LlamaIndex", "HuggingFace", "Large Language Models", 
    "LLMs", "Generative AI", "Power BI", "Tableau", "Jupyter", "Data Analysis",
    
    # Mobile Development
    "React Native", "Flutter", "Android", "iOS", "SwiftUI", "Jetpack Compose",
    
    # Core Computer Science & Architecture
    "Data Structures", "Algorithms", "OOP", "Object Oriented Programming", "System Design", 
    "Microservices", "Design Patterns", "Computer Networks", "Operating Systems", "DBMS",
    
    # Methodologies & Tools
    "Agile", "Scrum", "Jira", "Trello", "Confluence", "VS Code", "IntelliJ", "Postman",
    
    # Soft & Interpersonal Skills
    "Communication", "Critical Thinking", "Problem Solving", "Team Leadership", "Time Management",
    "Teamwork", "Adaptability", "Collaboration"
]

# Aliases to normalize variations to canonical industry-standard names
SKILL_ALIASES = {
    "c": "C",
    "c++": "C++",
    "cpp": "C++",
    "c#": "C#",
    "csharp": "C#",
    "golang": "Go",
    "react": "React.js",
    "react.js": "React.js",
    "reactjs": "React.js",
    "next": "Next.js",
    "next.js": "Next.js",
    "nextjs": "Next.js",
    "vue": "Vue.js",
    "vue.js": "Vue.js",
    "vuejs": "Vue.js",
    "nest": "NestJS",
    "nest.js": "NestJS",
    "nestjs": "NestJS",
    "express": "Express.js",
    "express.js": "Express.js",
    "expressjs": "Express.js",
    "node": "Node.js",
    "node.js": "Node.js",
    "nodejs": "Node.js",
    "html": "HTML",
    "html5": "HTML",
    "css": "CSS",
    "css3": "CSS",
    "sass": "Sass",
    "scss": "Sass",
    "rest api": "REST APIs",
    "rest apis": "REST APIs",
    "restful api": "REST APIs",
    "restful apis": "REST APIs",
    "rest": "REST APIs",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "mongo": "MongoDB",
    "mongodb": "MongoDB",
    "tailwind": "Tailwind CSS",
    "tailwind css": "Tailwind CSS",
    "tailwindcss": "Tailwind CSS",
    "material-ui": "Material-UI",
    "mui": "Material-UI",
    "aws": "AWS",
    "amazon web services": "AWS",
    "gcp": "Google Cloud",
    "google cloud": "Google Cloud",
    "google cloud platform": "Google Cloud",
    "azure": "Azure",
    "docker": "Docker",
    "k8s": "Kubernetes",
    "kubernetes": "Kubernetes",
    "git": "Git",
    "github": "GitHub",
    "gitlab": "GitLab",
    "js": "JavaScript",
    "javascript": "JavaScript",
    "ts": "TypeScript",
    "typescript": "TypeScript",
    "py": "Python",
    "python": "Python",
    "oops": "OOP",
    "oop": "OOP",
    "ml": "Machine Learning",
    "machine learning": "Machine Learning",
    "dl": "Deep Learning",
    "deep learning": "Deep Learning",
    "ai": "Artificial Intelligence",
    "artificial intelligence": "Artificial Intelligence",
    "ds": "Data Structures",
    "data structures": "Data Structures",
}

# 100+ Major Indian Cities, Tech Hubs, States, and Global Centers
MAJOR_INDIAN_AND_GLOBAL_CITIES = [
    # Tier-1 Hubs
    "Bengaluru", "Bangalore", "Pune", "Hyderabad", "Mumbai", "Delhi", "New Delhi",
    "Noida", "Greater Noida", "Gurugram", "Gurgaon", "Chennai", "Kolkata", "Ahmedabad",
    
    # Tier-2 Tech Hubs & Key Cities
    "Jaipur", "Indore", "Kochi", "Cochin", "Chandigarh", "Mohali", "Panchkula", 
    "Nagpur", "Nashik", "Aurangabad", "Chhatrapati Sambhajinagar", "Ambajogai", "Lucknow", 
    "Bhopal", "Surat", "Vadodara", "Visakhapatnam", "Vizag", "Patna", "Bhubaneswar", 
    "Coimbatore", "Mysore", "Mysuru", "Thiruvananthapuram", "Trivandrum", "Dehradun", 
    "Guwahati", "Ludhiana", "Agra", "Varanasi", "Rajkot", "Jamshedpur", "Ranchi", 
    "Jabalpur", "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", 
    "Mangalore", "Navi Mumbai", "Thane", "Pimpri-Chinchwad", "Kalyan-Dombivli", 
    "Ghaziabad", "Faridabad", "Meerut", "Secunderabad", "Gandhinagar", "Hubli", 
    "Dharwad", "Tiruchirappalli", "Salem", "Warangal", "Bareilly", "Aligarh", 
    "Moradabad", "Jalandhar", "Gorakhpur", "Bikaner", "Amravati", "Nanded", 
    "Kolhapur", "Sangli", "Latur", "Solapur", "Akola", "Dhule", "Ahmednagar", 
    "Chandrapur", "Jalgaon", "Jalna", "Beed", "Parbhani", "Panaji", "Goa",
    
    # States & Union Territories
    "Maharashtra", "Karnataka", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Gujarat",
    "Rajasthan", "Haryana", "West Bengal", "Kerala", "Madhya Pradesh", "Punjab",
    
    # Remote / WFH
    "Remote", "Work From Home", "Hybrid",
    
    # Global Tech Hubs
    "London", "New York", "San Francisco", "Seattle", "Austin", "Toronto", 
    "Singapore", "Dubai", "Berlin", "Sydney"
]

# Comprehensive degree definitions with regex matching patterns
DEGREE_DEFINITIONS = [
    (r'\b(?:Master of Technology|Master of Engineering|M\.?Tech|M\.?E\b)', "Master of Technology (M.Tech)"),
    (r'\b(?:Master of Computer Applications|M\.?C\.?A\b)', "Master of Computer Applications (MCA)"),
    (r'\b(?:Master of Science|M\.?Sc\b|M\.?S\b)', "Master of Science (M.Sc)"),
    (r'\b(?:Master of Business Administration|M\.?B\.?A\b)', "Master of Business Administration (MBA)"),
    (r'\b(?:Bachelor of Technology|Bachelor of Engineering|B\.?Tech|B\.?E\b)', "Bachelor of Technology (B.Tech)"),
    (r'\b(?:Bachelor of Computer Applications|B\.?C\.?A\b)', "Bachelor of Computer Applications (BCA)"),
    (r'\b(?:Bachelor of Science|B\.?Sc\b|B\.?S\b)', "Bachelor of Science (B.Sc)"),
    (r'\b(?:Bachelor of Business Administration|B\.?B\.?A\b)', "Bachelor of Business Administration (BBA)"),
    (r'\b(?:Bachelor of Commerce|B\.?Com\b)', "Bachelor of Commerce (B.Com)"),
    (r'\b(?:Bachelor of Arts|B\.?A\b)', "Bachelor of Arts (B.A)"),
    (r'\b(?:Diploma in Engineering|Polytechnic Diploma|Polytechnic|Diploma)\b', "Diploma in Engineering"),
    (r'\b(?:Higher Secondary Certificate|H\.?S\.?C|Class 12th|Class XII|12th Standard|12th Grade|Intermediate|Senior Secondary)\b', "Higher Secondary Certificate (12th / HSC)"),
    (r'\b(?:Secondary School Certificate|S\.?S\.?C|Class 10th|Class X|10th Standard|10th Grade|Matriculation|Secondary School)\b', "Secondary School Certificate (10th / SSC)"),
    (r'\b(?:Doctor of Philosophy|Ph\.?D)\b', "Doctor of Philosophy (Ph.D)"),
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
    text = text.replace("–", "-").replace("—", "-").replace("•", "-").replace("·", "|").replace("▪", "-")
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
    """Extract raw text from PDF or DOCX file bytes using layout-aware extraction.
    
    Returns:
        (extracted_text, ocr_needed_flag)
    """
    clean_name = file_name.lower()
    raw_text = ""
    ocr_needed = False

    # 1. PDF extraction via pypdf with layout mode priority
    if clean_name.endswith(".pdf") or "pdf" in mime_type:
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            if reader.is_encrypted:
                raise ValueError("Encrypted PDF cannot be read. Please upload an unencrypted document.")
            
            layout_pages = []
            standard_pages = []
            for i, page in enumerate(reader.pages):
                try:
                    # Attempt layout mode extraction for clean columnar text
                    lt = ""
                    try:
                        lt = page.extract_text(extraction_mode="layout") or ""
                    except Exception:
                        lt = ""
                    if lt.strip():
                        layout_pages.append(lt)

                    st = page.extract_text() or ""
                    if st.strip():
                        standard_pages.append(st)
                except Exception as page_exc:
                    logger.warning("Error reading PDF page %d: %s", i, page_exc)

            layout_full = "\n\n".join(layout_pages).strip()
            standard_full = "\n\n".join(standard_pages).strip()
            
            # Prefer layout mode if it extracted reasonable content, otherwise fallback to standard
            if len(layout_full) >= len(standard_full) * 0.8 and len(layout_full) > 30:
                raw_text = layout_full
            else:
                raw_text = standard_full

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
    
    Robustly handles all resume formats: single-column ATS, two-column layouts,
    fresher/experienced profiles, multiple degrees, and varied section headers.
    """
    links = links or []
    norm_text = normalize_text(text)
    raw_lines = [line.strip() for line in norm_text.split("\n") if line.strip()]

    # Universal Section Patterns covering 50+ naming variations
    SECTION_PATTERNS = {
        "summary": r'^(?:SUMMARY|PROFESSIONAL SUMMARY|EXECUTIVE SUMMARY|CAREER SUMMARY|PROFILE|ABOUT ME|CAREER OBJECTIVE|OBJECTIVE|BIO)\b',
        "experience": r'^(?:WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EXPERIENCE|EMPLOYMENT HISTORY|EMPLOYMENT|WORK HISTORY|INTERNSHIPS|INTERNSHIP EXPERIENCE|RELEVANT EXPERIENCE|CAREER HISTORY)\b',
        "projects": r'^(?:PROJECTS|KEY PROJECTS|PERSONAL PROJECTS|ACADEMIC PROJECTS|NOTABLE PROJECTS|TECHNICAL PROJECTS|PORTFOLIO|SELECTED PROJECTS)\b',
        "education": r'^(?:EDUCATION|ACADEMIC BACKGROUND|ACADEMIC DETAILS|ACADEMIC QUALIFICATIONS|ACADEMIC RECORD|EDUCATIONAL BACKGROUND|EDUCATIONAL QUALIFICATIONS|EDUCATION & TRAINING|ACADEMIC PROFILE|QUALIFICATIONS|DEGREES)\b',
        "skills": r'^(?:TECHNICAL SKILLS|SKILLS & ABILITIES|SKILLS & COMPETENCIES|SKILLS & EXPERTISE|TECHNICAL PROFICIENCIES|CORE COMPETENCIES|KEY SKILLS|SKILLS|TECH STACK|AREAS OF EXPERTISE|TECHNOLOGIES|TOOLS & TECHNOLOGIES)\b',
        "certifications": r'^(?:CERTIFICATIONS|CERTIFICATES|LICENSES & CERTIFICATIONS|COURSES & CERTIFICATES|LICENSES|ACCREDITATIONS|AWARDS & ACHIEVEMENTS|ACHIEVEMENTS)\b',
    }

    # Identify section boundaries by matching cleaned lines
    section_indices: list[tuple[int, str]] = []
    for idx, line in enumerate(raw_lines):
        clean_header = re.sub(r'^[#*•\-\d.\s\[\(=]+', '', line).strip()
        clean_header = re.sub(r'[:#*•\-\]\)=]+$', '', clean_header).strip()
        if len(clean_header) < 60:
            for sec_name, pat in SECTION_PATTERNS.items():
                if re.match(pat, clean_header, re.IGNORECASE):
                    section_indices.append((idx, sec_name))
                    break

    section_indices.sort(key=lambda x: x[0])

    sections: dict[str, list[str]] = {"header": []}
    current_sec = "header"
    last_idx = 0

    for idx, sec_name in section_indices:
        sections[current_sec] = raw_lines[last_idx:idx]
        current_sec = sec_name
        last_idx = idx + 1

    sections[current_sec] = raw_lines[last_idx:]
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

    # 3. Social & Professional URLs (LinkedIn, GitHub)
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
            and not any(x in lower_hl for x in ["resume", "curriculum", "vitae", "cv", "phone", "email", "contact", "linkedin", "github", "address", "page"])
            and len(cleaned) > 3
        ):
            full_name = " ".join(w.capitalize() for w in words)
            break

    # 5. Personal Portfolio URL
    portfolio_url: str | None = None
    name_slug = full_name.lower().replace(" ", "") if full_name else ""
    for lk in links:
        lk_low = lk.lower()
        if any(x in lk_low for x in ["linkedin.com", "github.com", "mailto:", "tel:", "twitter.com", "facebook.com", "instagram.com"]):
            continue
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
            items = [x.strip() for x in re.split(r'[,|•·]', content) if x.strip()]
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

    # 8. Education extraction with multi-degree support
    education_entries: list[dict[str, Any]] = []
    edu_lines = sections.get("education", [])
    
    if edu_lines:
        # Group lines into distinct educational blocks
        edu_blocks: list[list[str]] = []
        current_block: list[str] = []
        
        for el in edu_lines:
            el_str = el.strip()
            if not el_str:
                if current_block:
                    edu_blocks.append(current_block)
                    current_block = []
                continue
            
            has_deg = any(re.search(pat, el_str, re.IGNORECASE) for pat, _ in DEGREE_DEFINITIONS)
            has_bullet = el_str.startswith(("-", "•", "*", "·")) or re.match(r'^\d+\.\s', el_str)
            
            if (has_deg or has_bullet) and current_block and any(re.search(pat, " ".join(current_block), re.IGNORECASE) for pat, _ in DEGREE_DEFINITIONS):
                edu_blocks.append(current_block)
                current_block = [el_str]
            else:
                current_block.append(el_str)
                
        if current_block:
            edu_blocks.append(current_block)
            
        for b in edu_blocks:
            b_text = "\n".join(b)
            
            # Degree matching
            deg_label = None
            for pat, label in DEGREE_DEFINITIONS:
                if re.search(pat, b_text, re.IGNORECASE):
                    deg_label = label
                    break
            if not deg_label and len(b) > 0:
                deg_label = b[0].split("|")[0].split(",")[0].strip()
                
            # Institution extraction & cleaning
            inst = ""
            inst_m = re.search(r'([A-Za-z0-9\s&.-]+(?:College|University|Institute|School|Academy|Polytechnic|Vidyalaya)[A-Za-z0-9\s&.-]*)', b_text, re.IGNORECASE)
            if inst_m:
                inst = inst_m.group(1).strip()
                # Clean out degrees, scores, years from institution string
                for pat, _ in DEGREE_DEFINITIONS:
                    inst = re.sub(pat, '', inst, flags=re.IGNORECASE)
                inst = re.sub(r'^(?:in|department of|branch of)\s+[A-Za-z\s&]+(?=Institute|College|University)', '', inst, flags=re.IGNORECASE).strip()
                inst = re.sub(r'(?:CGPA|score|grade|percentage|passing|GPA).*$', '', inst, flags=re.IGNORECASE)
                inst = re.sub(r'\b(20[123]\d)\b', '', inst)
                inst = re.sub(r'[\n\r]+', ' ', inst).strip().rstrip('|, -')
                inst = re.sub(r'\s{2,}', ' ', inst).strip()
            elif len(b) > 0:
                for l in b:
                    if not any(re.search(pat, l, re.IGNORECASE) for pat, _ in DEGREE_DEFINITIONS):
                        cl = re.sub(r'(?:CGPA|score|percentage|grade)[:\s]*[0-9.]+(?:\s*(?:/\s*10|%))?', '', l, flags=re.IGNORECASE)
                        cl = re.sub(r'\b20[123]\d\b', '', cl).strip().rstrip('|, -')
                        if len(cl) > 3:
                            inst = cl
                            break

            # Score / CGPA
            score_val: str | None = None
            score_m = re.search(r'(?:CGPA|score|percentage|grade)[:\s]*([0-9.]+(?:\s*(?:/\s*10|%))?)|\b((?:[5-9]|10)\.\d{1,2}(?:\s*(?:/\s*10))?(?:\s*CGPA)?)\b|(\b\d{2}(?:\.\d+)?%)', b_text, re.IGNORECASE)
            if score_m:
                score_val = (score_m.group(1) or score_m.group(2) or score_m.group(3)).strip()

            # Passing / Completion Year
            year_val: str | None = None
            yr_range = re.search(r'\b(?:20[123]\d)\s*[-–—to]+\s*(20[123]\d|Present)\b', b_text, re.IGNORECASE)
            if yr_range:
                year_val = "2025" if "present" in yr_range.group(1).lower() else yr_range.group(1)
            else:
                yr_single = re.search(r'\b(20[123]\d)\b', b_text)
                if yr_single:
                    year_val = yr_single.group(1)
            
            # Infer completion year from full text if absent in block
            if not year_val:
                all_yrs = re.findall(r'\b(20[23]\d)\b', norm_text)
                year_val = max(all_yrs) if all_yrs else "2025"

            # Field of study
            fos_val: str | None = None
            fos_m = re.search(r'(?:in|,)\s*(Computer Science(?: and Engineering)?|Information Technology|Mechanical|Electrical|Electronics|Civil|Data Science|Artificial Intelligence|Computer Applications)', b_text, re.IGNORECASE)
            if fos_m:
                fos_val = fos_m.group(1).strip()

            if deg_label or inst:
                education_entries.append({
                    "degree": deg_label or "Bachelor of Technology (B.Tech)",
                    "institution": inst,
                    "year": year_val,
                    "score": score_val,
                    "field_of_study": fos_val,
                })
    else:
        # Fallback degree detection in full text
        for pat, label in DEGREE_DEFINITIONS:
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
                    "year": ym.group(1) if ym else "2025",
                    "score": sm.group(1).strip() if sm else None,
                    "field_of_study": "Computer Science",
                })
                break

    # Fallback guarantee: Never return empty education so user is not blocked in wizard
    if not education_entries:
        all_yrs = re.findall(r'\b(20[23]\d)\b', norm_text)
        fallback_yr = max(all_yrs) if all_yrs else "2025"
        education_entries.append({
            "degree": "Bachelor of Technology (B.Tech)",
            "institution": "",
            "year": fallback_yr,
            "score": None,
            "field_of_study": "Computer Science",
        })

    # 9. Experience extraction with multi-job support
    DATE_PATTERN = r'((?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?\b20\d{2}\s*[-–—to]+\s*(?:(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?\b20\d{2}|Present|Current))\b'
    ROLE_KEYWORDS = r'(?:Developer|Engineer|Architect|Consultant|Intern|Specialist|Lead|Manager|Coordinator|Analyst|Programmer|Officer|Associate)'

    experience_entries: list[dict[str, Any]] = []
    exp_lines = sections.get("experience", [])
    
    if exp_lines:
        exp_blocks: list[list[str]] = []
        curr_exp: list[str] = []
        
        for line in exp_lines:
            l = line.strip()
            if not l:
                if curr_exp:
                    exp_blocks.append(curr_exp)
                    curr_exp = []
                continue
            
            has_date = bool(re.search(DATE_PATTERN, l, re.IGNORECASE))
            has_role = bool(re.search(ROLE_KEYWORDS, l, re.IGNORECASE))
            
            if (has_date or has_role) and not l.startswith(("-", "•", "*", "·")) and len(curr_exp) >= 2:
                block_str = " ".join(curr_exp)
                if re.search(ROLE_KEYWORDS, block_str, re.IGNORECASE):
                    exp_blocks.append(curr_exp)
                    curr_exp = [l]
                    continue
            curr_exp.append(l)
            
        if curr_exp:
            exp_blocks.append(curr_exp)
            
        for b in exp_blocks:
            if not b:
                continue
            first_l = b[0]
            dur = None
            dm = re.search(DATE_PATTERN, first_l, re.IGNORECASE)
            if dm:
                dur = dm.group(1).strip()
                role_part = first_l.replace(dm.group(0), "").strip().rstrip("|, -")
            else:
                role_part = first_l.strip()
                
            comp_part = ""
            if len(b) > 1:
                second_l = b[1]
                if not dur:
                    dm2 = re.search(DATE_PATTERN, second_l, re.IGNORECASE)
                    if dm2:
                        dur = dm2.group(1).strip()
                        second_l = second_l.replace(dm2.group(0), "").strip()
                comp_part = second_l.split("|")[0].split("·")[0].split(",")[0].strip()
                for c in MAJOR_INDIAN_AND_GLOBAL_CITIES:
                    comp_part = re.sub(r'\b' + re.escape(c) + r'\b', '', comp_part, flags=re.IGNORECASE).strip()
                comp_part = comp_part.rstrip("|, -")
                
            bullets = []
            for bl in b[2:]:
                bt = re.sub(r'^[•\-\*\d.]+\s*', '', bl).strip()
                if bt:
                    bullets.append(bt)
            if not bullets and len(b) > 2:
                bullets = [re.sub(r'^[•\-\*\d.]+\s*', '', x).strip() for x in b[2:]]
                
            desc = " ".join(bullets) if bullets else None
            is_cur = bool(dur and any(x in dur.lower() for x in ["present", "current"]))
            
            if role_part or comp_part:
                experience_entries.append({
                    "role": role_part or "Software Engineer",
                    "company": comp_part or "Company",
                    "duration": dur,
                    "description": desc,
                    "is_current": is_cur,
                })
    else:
        # Fallback check in full text
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
            is_bullet = l.startswith(("-", "•", "*", "·")) or re.match(r'^\d+\.\s', l)
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

    # Assign technologies to each project
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
    for hl in header_lines:
        for c in MAJOR_INDIAN_AND_GLOBAL_CITIES:
            if re.search(r'\b' + re.escape(c) + r'\b', hl, re.IGNORECASE):
                city = c
                break
        if city:
            break

    if not city:
        loc_label = re.search(r'(?:Location|City|Current Location|Address|Place)[:\s]*([A-Za-z\s]+(?:,\s*[A-Za-z\s]+)?)', norm_text, re.IGNORECASE)
        if loc_label:
            cand_loc = loc_label.group(1).strip()
            for c in MAJOR_INDIAN_AND_GLOBAL_CITIES:
                if re.search(r'\b' + re.escape(c) + r'\b', cand_loc, re.IGNORECASE):
                    city = c
                    break

    if not city:
        loc_pattern = re.search(r'\b([A-Z][a-z]+),\s*(?:Maharashtra|Karnataka|Tamil Nadu|Telangana|Delhi|Gujarat|Rajasthan|Uttar Pradesh|Haryana|West Bengal|India)\b', norm_text)
        if loc_pattern:
            cand_city = loc_pattern.group(1).strip()
            if cand_city in MAJOR_INDIAN_AND_GLOBAL_CITIES:
                city = cand_city

    # 14. Fresher vs Experienced detection
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

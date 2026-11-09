"""
Multi-User Dynamic Candidate Profiling & Resume Form-Filling Tests
================================================================================
Verifies that form-filling Q&A answers are strictly dynamic and personalized
to each candidate's verified resume/profile data, guaranteeing that different
users do NOT share or hallucinate another user's college, CGPA, projects, or notice period.
"""

import pytest
from platforms.resume_intelligence import ResumeKnowledgeGraph
from platforms.form_field_resolver import (
    FormFieldType,
    FormFieldClassifier,
    NumericExperienceResolver,
    ProjectEssayResolver,
    BooleanIntentResolver
)
from platforms.universal_form_filler import UniversalFormFiller
from backend.services.bot_training.profile_trainer import CandidateProfileTrainer


@pytest.fixture
def candidate_alice():
    """Candidate Alice: High-experience Robotics & Python Engineer from IIT Delhi."""
    return {
        "personal": {
            "name": "Alice Sharma",
            "firstname": "Alice",
            "lastname": "Sharma",
            "email": "alice.sharma@example.com",
            "phone": "+91 9811122233",
            "current_location": "Delhi, India",
            "preferred_locations": ["Delhi", "Noida", "Gurugram"],
            "notice_period": "30 Days",
            "total_experience_years": 3.0,
            "expected_ctc": "14 Lakhs",
            "current_ctc": "10 Lakhs"
        },
        "key_skills": ["Python", "ROS", "C++", "Computer Vision", "Docker", "Linux", "Git"],
        "education": [
            {
                "degree": "Master of Technology (M.Tech)",
                "field_of_study": "Robotics and Automation",
                "institution": "Indian Institute of Technology (IIT) Delhi",
                "location": "New Delhi",
                "passing_year": "2023",
                "cgpa": "8.85",
                "score": "8.85 CGPA",
                "coursework": "Kinematics, Autonomous Navigation, Deep Learning, Embedded Systems"
            }
        ],
        "projects": [
            {
                "title": "Autonomous Warehouse Navigation Drone",
                "role": "Lead Robotics Engineer",
                "tech_stack": ["Python", "ROS", "C++", "Docker"],
                "description": "Engineered autonomous obstacle-avoidance drone navigation system in ROS.",
                "highlights": ["Reduced navigation latency by 40%", "Integrated LiDAR sensor fusion"],
                "metrics": "Successfully deployed in 3 fulfillment centers."
            }
        ]
    }


@pytest.fixture
def candidate_priya():
    """Candidate Priya: Full-Stack MERN / Next.js Engineer from Pune University."""
    return {
        "personal": {
            "name": "Priya Kulkarni",
            "firstname": "Priya",
            "lastname": "Kulkarni",
            "email": "priya.kulkarni@example.com",
            "phone": "+91 9722334455",
            "current_location": "Pune, Maharashtra",
            "preferred_locations": ["Pune", "Bangalore", "Remote"],
            "notice_period": "15 Days",
            "total_experience_years": 2.0,
            "expected_ctc": "8 Lakhs",
            "current_ctc": "5.5 Lakhs"
        },
        "key_skills": ["JavaScript", "TypeScript", "React.js", "Next.js", "Node.js", "MongoDB", "Tailwind CSS"],
        "education": [
            {
                "degree": "Master of Computer Applications (MCA)",
                "field_of_study": "Computer Science",
                "institution": "Savitribai Phule Pune University",
                "location": "Pune, Maharashtra",
                "passing_year": "2024",
                "cgpa": "7.9",
                "score": "7.9 CGPA",
                "coursework": "Advanced Web Technologies, Cloud Computing, Database Engineering"
            }
        ],
        "projects": [
            {
                "title": "Healthcare Teleconsultation Portal",
                "role": "Full Stack Developer",
                "tech_stack": ["React.js", "Next.js", "Node.js", "MongoDB"],
                "description": "Full-stack medical appointment and video teleconsultation platform.",
                "highlights": ["Real-time appointment scheduling", "WebRTC video consultations"],
                "metrics": "Onboarded 500+ certified doctors and 20k patients."
            }
        ]
    }


def test_alice_dynamic_profile_grounding(candidate_alice):
    """Verify that Alice's answers strictly reflect Alice's IIT Delhi education, Robotics, and 30-day notice."""
    graph = ResumeKnowledgeGraph(candidate_alice)

    # Identity
    assert graph.name == "Alice Sharma"
    assert graph.first_name == "Alice"
    assert graph.last_name == "Sharma"
    assert graph.email == "alice.sharma@example.com"
    assert graph.phone == "+91 9811122233"
    assert graph.current_location == "Delhi, India"
    assert graph.notice_period == "30 Days"
    assert graph.expected_ctc == "14 Lakhs"

    # Education
    edu = graph.get_education_details()
    assert "IIT" in edu["college"] or "Indian Institute of Technology" in edu["college"]
    assert "M.Tech" in edu["degree"]
    assert edu["cgpa"] == "8.85"

    # Essay Question: Why Hire You
    why_ans = ProjectEssayResolver.resolve("Why should we hire you for this role?", graph)
    assert "Robotics" in why_ans or "Python" in why_ans
    assert "Autonomous Warehouse Navigation Drone" in why_ans
    assert "30 Days" in why_ans
    assert "Umesh" not in why_ans
    assert "MBES" not in why_ans
    assert "6.06" not in why_ans

    # Numeric Experience
    cgpa_ans = NumericExperienceResolver.resolve("What is your cumulative college CGPA?", graph)
    assert cgpa_ans == "8.85"


def test_priya_dynamic_profile_grounding(candidate_priya):
    """Verify that Priya's answers strictly reflect Pune University, Next.js, and 15-day notice."""
    graph = ResumeKnowledgeGraph(candidate_priya)

    # Identity
    assert graph.name == "Priya Kulkarni"
    assert graph.first_name == "Priya"
    assert graph.last_name == "Kulkarni"
    assert graph.notice_period == "15 Days"
    assert graph.expected_ctc == "8 Lakhs"

    # Education
    edu = graph.get_education_details()
    assert "Pune University" in edu["college"]
    assert "MCA" in edu["degree"]
    assert edu["cgpa"] == "7.9"

    # Project Narrative
    proj_narrative = graph.get_project_narrative("Describe a web project you built")
    assert "Healthcare Teleconsultation Portal" in proj_narrative
    assert "MongoDB" in proj_narrative

    # Essay Question: Database architecture
    db_ans = ProjectEssayResolver.resolve("How do you design database schemas?", graph)
    assert "Healthcare Teleconsultation Portal" in db_ans
    assert "MongoDB" in db_ans or "database" in db_ans


def test_candidate_profile_trainer_generates_isolated_answers(candidate_alice, candidate_priya):
    """Verify CandidateProfileTrainer synthesizes isolated, distinct Q&A banks for each candidate."""
    trainer_alice = CandidateProfileTrainer(candidate_alice)
    qa_alice = trainer_alice.generate_candidate_qa_pairs()
    alice_dict = {q["question_text"]: q["answer"] for q in qa_alice}

    trainer_priya = CandidateProfileTrainer(candidate_priya)
    qa_priya = trainer_priya.generate_candidate_qa_pairs()
    priya_dict = {q["question_text"]: q["answer"] for q in qa_priya}

    # College Degree
    q_college = "What is your graduation college and degree?"
    assert "IIT" in alice_dict[q_college] and "Delhi" in alice_dict[q_college]
    assert "Pune University" in priya_dict[q_college]

    # CGPA
    q_cgpa = "What was your cumulative CGPA or percentage in college?"
    assert alice_dict[q_cgpa] == "8.85 CGPA"
    assert priya_dict[q_cgpa] == "7.9 CGPA"

    # Expected CTC
    q_ctc = "What is your expected fixed CTC per annum?"
    assert alice_dict[q_ctc] == "14 Lakhs"
    assert priya_dict[q_ctc] == "8 Lakhs"

    # Notice Period
    q_notice = "What is your official notice period?"
    assert alice_dict[q_notice] == "30 Days"
    assert priya_dict[q_notice] == "15 Days"

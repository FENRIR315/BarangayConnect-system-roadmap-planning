from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# --- Helper functions ---
def add_title_slide(title, subtitle):
    slide = prs.slides.add_slide(prs.slide_layouts[0])
    slide.shapes.title.text = title
    slide.placeholders[1].text = subtitle
    for shape in slide.shapes:
        if shape.has_text_frame:
            for paragraph in shape.text_frame.paragraphs:
                paragraph.alignment = PP_ALIGN.CENTER
                for run in paragraph.runs:
                    run.font.color.rgb = RGBColor(30, 41, 59)

def add_bullet_slide(title, bullets, is_two_col=False):
    slide = prs.slides.add_slide(prs.slide_layouts[1])
    slide.shapes.title.text = title
    txBox = slide.shapes.add_textbox(Inches(1), Inches(1.5), Inches(11), Inches(5))
    tf = txBox.text_frame
    tf.word_wrap = True
    
    if is_two_col:
        col1 = tf
        col2 = slide.shapes.add_textbox(Inches(7), Inches(1.5), Inches(5), Inches(5)).text_frame
        col2.word_wrap = True
        
        mid = len(bullets) // 2
        left_bullets = bullets[:mid]
        right_bullets = bullets[mid:]
        
        for i, bullet in enumerate(left_bullets):
            p = col1.paragraphs[0] if i == 0 else col1.add_paragraph()
            p.text = bullet
            p.level = 0
            p.font.size = Pt(18)
            p.space_after = Pt(12)
        
        for i, bullet in enumerate(right_bullets):
            p = col2.paragraphs[0] if i == 0 else col2.add_paragraph()
            p.text = bullet
            p.level = 0
            p.font.size = Pt(18)
            p.space_after = Pt(12)
    else:
        for i, bullet in enumerate(bullets):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.text = bullet
            p.level = 0
            p.font.size = Pt(18)
            p.space_after = Pt(12)

# --- Content Slides ---
add_title_slide("BarangayConnect", "A Digital Barangay Management System\nTransforming Community Governance")

add_bullet_slide("The Problem", [
    "Manual, paper-based processes",
    "Slow document processing and tracking",
    "Lack of centralized resident records",
    "Difficulty in monitoring complaints & incidents",
    "Limited transparency for residents"
])

add_bullet_slide("The Solution", [
    "BarangayConnect: A full-stack web platform",
    "Digitizes day-to-day barangay operations",
    "Built for white-label, client-presentable use",
    "Secure, scalable, and accessible via web"
])

add_bullet_slide("Admin Portal Features", [
    "Real-time Dashboard & Analytics",
    "Resident & Household Management",
    "Document Request Workflow (Approve → Generate → Release)",
    "Complaints & Incidents Tracking",
    "Appointments & Payments Monitoring",
    "Announcements & Notifications",
    "Audit Logs & Official Records",
    "Excel & PDF Export for all modules"
], is_two_col=True)

add_bullet_slide("Resident Portal Features", [
    "Self-service Profile Management",
    "Online Document Requests",
    "Appointment Booking",
    "Filing Complaints with Photo Evidence",
    "Real-time Notifications",
    "Access to Barangay Announcements"
])

add_bullet_slide("Security & Access Control", [
    "Role-Based Access Control (RBAC)",
    "Roles: Captain, Secretary, Treasurer, Kagawad, Staff, Resident",
    "Row Level Security (RLS) on all database tables",
    "Audit Logging for admin activities",
    "Secure Storage for Documents & Photos"
])

add_bullet_slide("Tech Stack", [
    "Framework: Next.js 16 (App Router, Turbopack)",
    "Language: TypeScript",
    "Styling: Tailwind CSS v4",
    "Database & Auth: Supabase (PostgreSQL)",
    "UI Components: Radix UI & Lucide React",
    "Charts: Recharts",
    "PDF Generation: React-PDF & jsPDF",
    "Excel Export: SheetJS"
])

add_bullet_slide("System Architecture", [
    "Frontend: Modern, responsive web interface",
    "Backend: Next.js API Routes & Server Actions",
    "Database: Supabase PostgreSQL with RLS",
    "Auth: Supabase Auth (Email/Password)",
    "Storage: Supabase Storage for attachments"
])

add_title_slide("BarangayConnect", "Thank You\nFor Your Attention")

prs.save("BarangayConnect_Presentation.pptx")
print("Presentation saved: BarangayConnect_Presentation.pptx")

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.dml.color import RGBColor

# ---------------------------------------------------------------- constants
SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

NAVY   = RGBColor(0x0F, 0x2A, 0x4C)   # deep navy
NAVY2  = RGBColor(0x16, 0x3A, 0x63)   # lighter navy
GOLD   = RGBColor(0xF2, 0xB4, 0x18)   # gold accent
CREAM  = RGBColor(0xF7, 0xF6, 0xF1)   # light background
DARK   = RGBColor(0x24, 0x32, 0x44)   # body text (slate-800)
MUTED  = RGBColor(0x5B, 0x6B, 0x80)   # subtitle (slate-500)
WHITE  = RGBColor(0xFF, 0xFF, 0xFF)

prs = Presentation()
prs.slide_width = SLIDE_W
prs.slide_height = SLIDE_H

BLANK = prs.slide_layouts[6]

# ---------------------------------------------------------------- helpers
def add_rect(slide, x, y, w, h, fill, line=None, shape=MSO_SHAPE.RECTANGLE):
    sp = slide.shapes.add_shape(shape, x, y, w, h)
    sp.fill.solid()
    sp.fill.fore_color.rgb = fill
    if line is None:
        sp.line.fill.background()
    else:
        sp.line.color.rgb = line
        sp.line.width = Pt(1)
    sp.shadow.inherit = False
    return sp

def add_text(slide, x, y, w, h, text, size=18, color=DARK, bold=False,
             align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.MIDDLE, font="Calibri",
             line_spacing=None, spacing_after=None):
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.alignment = align
    if line_spacing:
        p.line_spacing = line_spacing
    if spacing_after is not None:
        p.space_after = Pt(spacing_after)
    r = p.add_run()
    r.text = text
    r.font.size = Pt(size)
    r.font.color.rgb = color
    r.font.bold = bold
    r.font.name = font
    return box

def add_bullets(slide, x, y, w, h, bullets, size=18, color=DARK,
                bullet_color=GOLD, spacing=14, anchor=MSO_ANCHOR.TOP):
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    for i, (text, is_bold) in enumerate(bullets):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(spacing)
        p.line_spacing = 1.05
        p.level = 0
        # gold bullet glyph
        run = p.add_run()
        run.text = "\u25B6 "
        run.font.size = Pt(size - 4)
        run.font.color.rgb = bullet_color
        run.font.name = "Calibri"
        # text run
        run = p.add_run()
        run.text = text
        run.font.size = Pt(size)
        run.font.color.rgb = color
        run.font.bold = is_bold
        run.font.name = "Calibri"
    return box

def content_slide(title, subtitle=None, number=None):
    """Standard content slide: navy header band + cream body."""
    slide = prs.slides.add_slide(BLANK)
    add_rect(slide, 0, 0, SLIDE_W, Inches(1.35), NAVY)
    add_rect(slide, 0, Inches(1.35), SLIDE_W, Pt(4), GOLD)
    add_text(slide, Inches(0.7), 0, Inches(9.5), Inches(1.35),
             title, size=30, color=WHITE, bold=True, anchor=MSO_ANCHOR.MIDDLE)
    if subtitle:
        add_text(slide, Inches(9.6), 0, Inches(3.1), Inches(1.35),
                 subtitle, size=12, color=RGBColor(0xC9, 0xD6, 0xE8),
                 align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE)
    # corner tag
    add_rect(slide, SLIDE_W - Inches(1.05), 0, Inches(1.05), Inches(0.42), GOLD)
    add_text(slide, SLIDE_W - Inches(1.05), 0, Inches(1.05), Inches(0.42),
             "BC", size=14, color=NAVY, bold=True,
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    # slide number
    if number:
        add_text(slide, SLIDE_W - Inches(1.05), Inches(7.08), Inches(1.05), Inches(0.4),
                 str(number), size=12, color=MUTED,
                 align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    return slide

def card(slide, x, y, w, h, title, text, accent=GOLD):
    add_rect(slide, x, y, w, h, WHITE, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_rect(slide, x, y, Inches(0.09), h, accent)
    add_text(slide, x + Inches(0.3), y + Inches(0.12), w - Inches(0.5), Inches(0.45),
             title, size=15, color=NAVY, bold=True, anchor=MSO_ANCHOR.MIDDLE)
    add_text(slide, x + Inches(0.3), y + Inches(0.52), w - Inches(0.5), h - Inches(0.6),
             text, size=15, color=DARK, anchor=MSO_ANCHOR.TOP, line_spacing=1.1)

def title_slide(title, subtitle, footer=None):
    slide = prs.slides.add_slide(BLANK)
    add_rect(slide, 0, 0, SLIDE_W, SLIDE_H, NAVY)
    add_rect(slide, 0, 0, Inches(0.28), SLIDE_H, GOLD)
    add_rect(slide, SLIDE_W - Inches(0.28), 0, Inches(0.28), SLIDE_H, GOLD)

    # badge
    badge = add_rect(slide, Inches(5.97), Inches(1.1), Inches(1.4), Inches(1.4),
                     NAVY2, shape=MSO_SHAPE.OVAL)
    add_rect(slide, Inches(6.32), Inches(1.45), Inches(0.7), Inches(0.7), GOLD)
    add_text(slide, Inches(5.97), Inches(1.1), Inches(1.4), Inches(1.4),
             "BC", size=22, color=NAVY, bold=True,
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)

    add_text(slide, 0, Inches(2.9), SLIDE_W, Inches(1.0),
             title, size=52, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    add_rect(slide, Inches(5.2), Inches(4.02), Inches(2.93), Pt(3), GOLD)
    if subtitle:
        add_text(slide, Inches(1.4), Inches(4.35), Inches(10.5), Inches(1.2),
                 subtitle, size=20, color=RGBColor(0xD5, 0xE0, 0xEE),
                 align=PP_ALIGN.CENTER, line_spacing=1.2)
    if footer:
        add_text(slide, 0, Inches(6.75), SLIDE_W, Inches(0.5),
                 footer, size=13, color=RGBColor(0x9A, 0xAF, 0xC6),
                 align=PP_ALIGN.CENTER)
    return slide

# ---------------------------------------------------------------- slides
# 1. Title
title_slide(
    "BarangayConnect",
    "A Digital Barangay Management System\nTransforming Community Governance",
    footer="Barangay Operations \u00B7 Resident Services \u00B7 Smart Governance",
)

# 2. The Problem
s = content_slide("The Problem", "Why change is needed", number=2)
add_bullets(s, Inches(0.8), Inches(1.95), Inches(11.7), Inches(5.0), [
    ("Manual, paper-based processes slow down everyday barangay work", True),
    ("Document requests are hard to track and take days to process", False),
    ("Resident records are scattered across notebooks, logs, and files", False),
    ("Complaints and incidents are hard to monitor and resolve on time", False),
    ("Residents have limited visibility into barangay services", False),
    ("Cloud systems create recurring subscription and internet costs", False),
], size=20, spacing=20)

# 3. The Solution
s = content_slide("The Solution", "What BarangayConnect delivers", number=3)
sol_cols = [
    ("One Platform", "Full-stack web system built end-to-end for barangay operations."),
    ("All Operations", "Residents, documents, appointments, complaints, incidents, payments and announcements in one place."),
    ("Owned Locally", "Runs on the barangay computer - no subscription, no monthly cloud fees."),
    ("Secure by Design", "Role-based access, database-level access control and full audit trails."),
]
cw, chh, gap = 914400 * 5.55, 914400 * 2.15, 914400 * 0.6
positions = [
    (Inches(0.8), Inches(2.0)),
    (Inches(0.8) + int(cw + gap), Inches(2.0)),
    (Inches(0.8), Inches(2.0) + int(chh + 914400 * 0.5)),
    (Inches(0.8) + int(cw + gap), Inches(2.0) + int(chh + 914400 * 0.5)),
]
for (t, d), (x, y) in zip(sol_cols, positions):
    card(s, x, y, cw, chh, t, d)

# 4. Admin Portal Features
s = content_slide("Admin Portal Features", "Governance tools for Barangay officials", number=4)
cols = [
    ("Dashboard & Analytics", "Population stats: age group, sex, purok. Recent requests at a glance."),
    ("Residents & Households", "Full CRUD, search, filter, deactivate. Scan & attach documents and photos."),
    ("Document Workflow", "Approve \u2192 Certificate Generation \u2192 Release with print-ready PDFs."),
    ("Complaints & Incidents", "Status workflows with photo/scan evidence and resolution tracking."),
    ("Appointments & Payments", "Confirm, complete, cancel or no-show. Track barangay transactions."),
    ("Announcements & Alerts", "Publish announcements with attachments and notify residents."),
    ("Reports & Exports", "Analytics, revenue summary and Excel export (one sheet per module)."),
    ("Audit & Officials", "Full administrative trail and records for elected officials."),
]
pos = [
    (Inches(0.65), Inches(1.7)), (Inches(6.9), Inches(1.7)),
    (Inches(0.65), Inches(3.35)), (Inches(6.9), Inches(3.35)),
    (Inches(0.65), Inches(5.0)), (Inches(6.9), Inches(5.0)),
    (Inches(0.65), Inches(6.15)), (Inches(6.9), Inches(6.15)),
]
for (t, d), (x, y) in zip(cols, pos):
    card(s, x, y, Inches(5.8), Inches(1.0), t, d)

# 5. Resident Portal
s = content_slide("Resident Portal", "Self-service for every resident", number=5)
res_cols = [
    ("Profile", "Self-service personal information management."),
    ("Documents", "Request & track barangay certificates online."),
    ("Appointments", "Book and manage visits conveniently."),
    ("Complaints", "File complaints with photo evidence."),
    ("Announcements", "Latest barangay news and updates."),
    ("Notifications", "Real-time alerts for every activity."),
]
pos2 = [
    (Inches(0.8), Inches(1.8)), (Inches(4.75), Inches(1.8)), (Inches(8.7), Inches(1.8)),
    (Inches(0.8), Inches(4.6)), (Inches(4.75), Inches(4.6)), (Inches(8.7), Inches(4.6)),
]
for (t, d), (x, y) in zip(res_cols, pos2):
    card(s, x, y, Inches(3.6), Inches(2.1), t, d)

# 6. System Architecture (On-Premises)
s = content_slide("On-Premises Architecture", "Runs on the barangay computer", number=6)
arch_items = [
    ("Web Application", "Next.js on port 3000 - staff use localhost / LAN, residents reach it online."),
    ("Local Database", "PostgreSQL 17 on the barangay computer with an application-level access layer."),
    ("Automatic Backups", "Daily .dump snapshots kept for 14 days, one-click restore."),
    ("Watchdog & Health", "Every-5-min monitoring auto-restarts any failed part. Live status page."),
    ("Public Browsing", "Free Cloudflare tunnel to publish the resident portal - no account or domain needed."),
    ("No Cloud, No Fee", "No subscription, no data leaves the barangay office - data stays fully owned."),
]
pos_arch = [
    (Inches(0.8), Inches(1.7)), (Inches(6.9), Inches(1.7)),
    (Inches(0.8), Inches(3.35)), (Inches(6.9), Inches(3.35)),
    (Inches(0.8), Inches(5.0)), (Inches(6.9), Inches(5.0)),
]
for (t, d), (x, y) in zip(arch_items, pos_arch):
    card(s, x, y, Inches(5.6), Inches(1.35), t, d)

# 7. Security
s = content_slide("Security & Access Control", "Data you can trust", number=7)
sec_items = [
    ("Role-Based Access Control", "Six roles: Captain, Secretary, Treasurer, Kagawad, Staff, Resident."),
    ("Database Access Layer", "Residents can only reach their own rows - other records are unreachable."),
    ("Audit Logging", "Administrative activity trail, maintained server-side only."),
    ("Login Protection", "Five failed attempts lock the account for 15 minutes. Factory passwords refused."),
]
pos3 = [
    (Inches(0.8), Inches(1.7)), (Inches(6.9), Inches(1.7)),
    (Inches(0.8), Inches(3.4)), (Inches(6.9), Inches(3.4)),
]
for (t, d), (x, y) in zip(sec_items, pos3):
    card(s, x, y, Inches(5.6), Inches(1.35), t, d)
# shield visual
add_rect(s, Inches(4.0), Inches(5.0), Inches(5.3), Inches(1.9), NAVY2, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
add_text(s, Inches(4.0), Inches(5.2), Inches(5.3), Inches(0.5),
         "DEFENSE IN DEPTH", size=18, color=GOLD, bold=True,
         align=PP_ALIGN.CENTER)
add_text(s, Inches(4.4), Inches(5.8), Inches(4.5), Inches(0.9),
         "Public QR verification for issued certificates, upload validation,\nand strict per-resident data scoping.",
         size=14, color=WHITE, align=PP_ALIGN.CENTER)

# 8. Tech Stack
s = content_slide("Tech Stack", "Modern, proven technology", number=8)
tech_items = [
    ("Frontend", "Next.js 16 \u00B7 TypeScript \u00B7 Tailwind CSS v4"),
    ("UI & Charts", "Radix UI \u00B7 Lucide Icons \u00B7 Recharts"),
    ("Auth & Sessions", "Custom session auth \u00B7 bcrypt password hashing \u00B7 lockout"),
    ("Database", "Local PostgreSQL 17 (pg) \u00B7 app-level access control"),
    ("PDF & Documents", "React-PDF \u00B7 jsPDF + autotable"),
    ("Excel & Automation", "SheetJS (xlsx) \u00B7 Scheduled backups \u00B7 watchdog"),
]
pos4 = [
    (Inches(0.8), Inches(1.75)), (Inches(6.9), Inches(1.75)),
    (Inches(0.8), Inches(3.45)), (Inches(6.9), Inches(3.45)),
    (Inches(0.8), Inches(5.15)), (Inches(6.9), Inches(5.15)),
]
for (t, d), (x, y) in zip(tech_items, pos4):
    card(s, x, y, Inches(5.6), Inches(1.4), t, d)

# 9. Closing
s = title_slide(
    "BarangayConnect",
    "Building Smarter, More Connected Communities\nThank You for Your Attention",
    footer="BarangayConnect \u00B7 Digital Governance, Made Simple",
)

import os

prs.save("BarangayConnect_Presentation.pptx.tmp")
os.replace("BarangayConnect_Presentation.pptx.tmp", "BarangayConnect_Presentation.pptx")
print("Presentation saved: BarangayConnect_Presentation.pptx")
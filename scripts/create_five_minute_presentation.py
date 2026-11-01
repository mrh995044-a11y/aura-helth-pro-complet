"""Create a five-minute AuraHealth Pro presentation with speaker notes.
Requires python-pptx and the two sample screenshots in assets/presentation.
"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
BG='100B1A'; CARD='21192E'; LINE='44345C'; WHITE='F8F5FF'; MUTED='C7BCD7'; PINK='FA83B5'; VIOLET='AE99FF'; MINT='78DCCB'; GOLD='F5CF82'
def color(value): return RGBColor.from_string(value)
def block(slide, x,y,w,h,fill, rounded=False, border=None):
    sh=slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    sh.fill.solid();sh.fill.fore_color.rgb=color(fill)
    if border: sh.line.color.rgb=color(border)
    else: sh.line.fill.background()
    if rounded: sh.adjustments[0]=.12
    return sh
def txt(slide,x,y,w,h,value,size=18,c=WHITE,bold=False,align=None):
    sh=slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h));tf=sh.text_frame;tf.word_wrap=True
    tf.margin_left=tf.margin_right=Inches(.01);tf.margin_top=tf.margin_bottom=Inches(.01)
    p=tf.paragraphs[0];p.text=value;p.font.name='Aptos';p.font.size=Pt(size);p.font.bold=bold;p.font.color.rgb=color(c)
    if align: p.alignment=align
    return sh
def note(slide,value):
    slide.notes_slide.notes_text_frame.text = value

def base(n,title,kicker):
    s=prs.slides.add_slide(prs.slide_layouts[6]); s.background.fill.solid();s.background.fill.fore_color.rgb=color(BG)
    txt(s,.62,.34,8,.3,'AURAHEALTH PRO  /  FIVE-MINUTE OVERVIEW',10,VIOLET,True)
    txt(s,.62,.88,12,.57,title,30,WHITE,True)
    txt(s,.64,1.55,11.8,.36,kicker,14,MUTED)
    block(s,.62,7.03,12.08,.012,LINE)
    txt(s,.64,7.12,10,.22,'GENERAL WELLNESS  •  NOT A DIAGNOSIS',9,MUTED)
    txt(s,12.08,7.11,.6,.22,str(n).zfill(2),9,MUTED,align=PP_ALIGN.RIGHT)
    return s

def label(s,x,y,value):
    block(s,x,y,1.18,.34,'3A2D4F',True); txt(s,x+.1,y+.07,.98,.2,value,9,WHITE,True)
def feature(s,x,y,w,h,num,title,body,accent):
    block(s,x,y,w,h,CARD,True,LINE);txt(s,x+.22,y+.22,w-.44,.29,num,11,accent,True);txt(s,x+.22,y+.73,w-.44,.45,title,20,WHITE,True);txt(s,x+.22,y+1.34,w-.44,h-1.55,body,15,MUTED)
def phone(s,img,x,y,h=4.75):
    width=h*720/1535
    block(s,x-.1,y-.1,width+.2,h+.2,'32253F',True)
    s.shapes.add_picture(img,Inches(x),Inches(y),height=Inches(h))
    return width
# 1 Cover
s=prs.slides.add_slide(prs.slide_layouts[6]);s.background.fill.solid();s.background.fill.fore_color.rgb=color(BG)
block(s,8.55,0,4.783,7.5,'211631');s.shapes.add_picture('assets/aura-icon.png', Inches(9.27), Inches(1.63), width=Inches(3.3), height=Inches(3.3))
txt(s,.75,.62,7,.35,'AURAHEALTH PRO',14,PINK,True);txt(s,.75,1.67,7.4,1.55,'A calmer way to\nmanage daily health',35,WHITE,True)
txt(s,.79,3.59,6.6,1.0,'A mobile wellness companion for records, reminders and better-prepared visits.',19,MUTED)
label(s,.78,5.33,'5 MINUTES');txt(s,.78,6.8,7,.3,'A product overview  •  2026',11,MUTED)
note(s,'''Timing: 0:00–0:30 (30 seconds).
Hello everyone. Today I’m introducing AuraHealth Pro, a mobile wellness companion designed to make everyday health management feel simpler. The app brings together health readings, medication schedules, appointment preparation, and an AI wellness assistant. The idea is not to replace doctors or medical care. It is to help people keep their own information organized and arrive at conversations with health professionals better prepared. In the next five minutes, I’ll show the main features, how the AI works, and the important limits to keep in mind.''')
# 2 Problem
s=base(2,'One place for everyday health','Small, repeatable steps can make personal information easier to manage.')
feature(s,.63,2.25,3.88,3.75,'01  /  REMEMBER','Medicines','Keep a schedule and receive an alarm-style reminder.',PINK)
feature(s,4.73,2.25,3.88,3.75,'02  /  TRACK','Readings','Record values and review a history over time.',MINT)
feature(s,8.83,2.25,3.88,3.75,'03  /  PREPARE','Visits','Organize questions and make a doctor visit brief.',VIOLET)
note(s,'''Timing: 0:30–1:10 (40 seconds).
Managing health often involves several small tasks: remembering when medicines are due, tracking readings, and collecting information before a doctor’s appointment. Those details can easily end up scattered across notebooks, phone notes, and memory. AuraHealth Pro brings these activities into one place. Its medication section presents a daily schedule, its vitals section maintains a record of readings, and its visits section helps users prepare information for a clinician. These features are designed to support organization and communication, not to make medical decisions for the user.''')
# 3 screenshot vitals
s=base(3,'Readings: keep a useful history','A real screenshot from an earlier app build; the readings shown are sample data.')
phone(s,'assets/presentation/vitals-sample.png',.98,2.05,4.65)
label(s,4.05,2.25,'RECORD');txt(s,4.05,2.83,7.9,.45,'Log values in one place',25,WHITE,True)
txt(s,4.05,3.47,7.7,1.02,'Review entries such as blood pressure, glucose, heart rate and sleep.',18,MUTED)
block(s,4.05,4.85,7.35,1.1,CARD,True,LINE);txt(s,4.3,5.1,6.85,.64,'Review and delete entries you no longer need.',16,MINT,True)
note(s,'''Timing: 1:10–1:55 (45 seconds).
This is an actual screenshot from an earlier version of the app. The entries shown here are sample data, not a real person’s medical record. In the readings section, users can record measurements such as blood pressure, glucose, oxygen saturation, heart rate, weight, sleep, steps, and water. They can return to the history, review the values, and delete an entry if needed. A record is useful for remembering what happened, but the app’s labels are not a diagnosis. A clinician should interpret readings in the context of the individual’s health.''')
# 4 meds
s=base(4,'Medicines: plan and remember','A daily schedule with a short alarm-style notification.')
feature(s,.63,2.28,3.88,3.72,'01  /  ADD','Build a schedule','Enter medicine details and the times you want to remember.',PINK)
feature(s,4.73,2.28,3.88,3.72,'02  /  ENABLE','Test the alert','Allow notifications and use the 10-second sound test.',MINT)
feature(s,8.83,2.28,3.88,3.72,'03  /  RECORD','Track doses','Mark a dose taken or skipped and update the list.',VIOLET)
txt(s,.68,6.35,11.9,.34,'Alerts depend on phone permissions, sound and battery settings. Keep a backup reminder.',12,GOLD)
note(s,'''Timing: 1:55–2:40 (45 seconds).
The medication feature lets a user add a medicine, choose one or more daily times, and see a schedule for today. They can mark a dose as taken or skipped, edit a medicine, or remove it. The latest test build also includes a short alarm-style notification and a ten-second test button, so users can check whether their phone makes a sound. This is not a continuously ringing alarm. Notification permission, alarm access, volume, battery restrictions, and the phone’s operating system may affect delivery. For safety, users should keep another reminder and follow their clinician’s instructions.''')
# 5 Screenshot visits
s=base(5,'Visits: prepare for the conversation','A real screenshot from an earlier app build; directory entries are unverified.')
phone(s,'assets/presentation/visits-sample.png',.98,2.05,4.65)
label(s,4.05,2.25,'PREPARE');txt(s,4.05,2.83,7.8,.45,'Bring the right context',25,WHITE,True)
txt(s,4.05,3.48,7.75,1.16,'Create a Doctor Visit Brief with selected information and questions, then preview and copy it.',18,MUTED)
block(s,4.05,4.97,7.35,.95,CARD,True,LINE);txt(s,4.3,5.23,6.9,.46,'Directory listings must be independently verified.',15,GOLD,True)
note(s,'''Timing: 2:40–3:25 (45 seconds).
The visits area helps users organize their own appointment information. This screenshot is from an earlier build and shows reference directory entries; those entries are not verified, so users should confirm details independently. A separate Doctor Visit Brief feature lets the user choose which sections of their real records to include, add questions, preview the result, and copy it for a clinician. The intention is to make appointments more productive without pretending that sample records are the user’s real chart. The user stays in control of what to include and share.''')
# 6 coach
s=base(6,'AuraCoach: ask a wellness question','An AI-assisted explanation, with user permission and clear limits.')
block(s,.65,2.18,7.35,3.95,CARD,True,LINE)
txt(s,.96,2.56,6.65,.36,'QUESTION OR PHOTO',12,MINT,True);txt(s,.96,3.13,6.65,1.65,'User chooses what to share → hosted service → Gemini response',23,WHITE,True)
txt(s,.98,5.27,6.5,.45,'Verified sign-in  •  usage limits apply',13,MUTED)
block(s,8.28,2.18,4.42,3.95,'302139',True,LINE);txt(s,8.58,2.56,3.8,.34,'SAFETY FIRST',12,GOLD,True)
txt(s,8.58,3.13,3.75,2.3,'AI can misunderstand images or provide incorrect information. It is not a doctor or an emergency service.',17,WHITE)
note(s,'''Timing: 3:25–4:15 (50 seconds).
AuraCoach lets a signed-in user ask a general wellness question or select a photo. After the user gives permission, the app sends the question, image, and any selected health information through a hosted service to Gemini. Gemini returns text, which the app displays as wellness information. Users do not need to enter their own AI key. The service has usage limits, and availability depends on its providers. Most importantly, AI can make mistakes or misread a photo, label, or document. It should never be relied on to diagnose illness, change a medicine dose, or respond to an emergency.''')
# 7 finish
s=base(7,'Privacy, status and next steps','A useful test build—with more work needed before public release.')
feature(s,.63,2.3,3.88,3.73,'01  /  PRIVACY','User choice','Health records stay on the device; selected AI information leaves it with permission.',MINT)
feature(s,4.73,2.3,3.88,3.73,'02  /  TODAY','Test carefully','Sign-in and AI have worked on a phone; reminders still need real-device testing.',PINK)
feature(s,8.83,2.3,3.88,3.73,'03  /  NEXT','Build responsibly','Cross-device Family Care, release security and medical-safety review remain.',VIOLET)
block(s,.68,6.36,2.25,.39,'43305A',True);txt(s,.89,6.43,1.85,.2,'THANK YOU',11,WHITE,True)
note(s,'''Timing: 4:15–5:00 (45 seconds).
To finish, privacy and safety are essential. The current app stores health records locally on the device; they are not yet a secure cloud-synced medical record. AI sharing requires permission, and the user should choose what they are comfortable sending. Sign-in and an AI response have been tested on a phone, while the revised medication reminders still need real-device testing. This is a test-signed build rather than a finished production release. Cross-device Family Care is planned but not yet implemented, and security, privacy, medical-safety, and release reviews are still needed. Thank you.''')
prs.core_properties.title='AuraHealth Pro | Five-minute presentation';prs.core_properties.subject='Overview with app screenshots and timed speaker notes'
prs.save('deliverables/AuraHealth-Pro-5-Minute-Presentation.pptx')

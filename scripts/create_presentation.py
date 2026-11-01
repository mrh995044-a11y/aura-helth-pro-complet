"""Build the editable AuraHealth Pro overview. Requires python-pptx."""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

prs = Presentation(); prs.slide_width=Inches(13.333); prs.slide_height=Inches(7.5)
BG='100C1B'; CARD='211831'; EDGE='35264E'; WHITE='F8F5FF'; MUTED='BDB4D2'; PINK='FB82B4'; VIOLET='A98BFF'; MINT='7BE0CD'; GOLD='F1C97B'
def rgb(s): return RGBColor.from_string(s)
def shape(slide,x,y,w,h,fill,round=False,line=None):
    sh=slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if round else MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h));sh.fill.solid();sh.fill.fore_color.rgb=rgb(fill);sh.line.fill.background() if not line else None
    if line: sh.line.color.rgb=rgb(line)
    if round:
        try: sh.adjustments[0]=0.12
        except Exception: pass
    return sh
def text(slide,x,y,w,h,string,size=18,color=WHITE,bold=False,align=None):
    box=slide.shapes.add_textbox(Inches(x),Inches(y),Inches(w),Inches(h));tf=box.text_frame;tf.word_wrap=True;tf.margin_left=tf.margin_right=Inches(.02);tf.margin_top=tf.margin_bottom=Inches(.01)
    p=tf.paragraphs[0];p.text=string;p.font.name='Aptos';p.font.size=Pt(size);p.font.bold=bold;p.font.color.rgb=rgb(color)
    if align is not None:p.alignment=align
    return box
def base(title,sub,idx):
    slide=prs.slides.add_slide(prs.slide_layouts[6]);slide.background.fill.solid();slide.background.fill.fore_color.rgb=rgb(BG)
    text(slide,.55,.32,6,.3,'AURAHEALTH PRO  /  PRODUCT OVERVIEW',10,VIOLET,True)
    text(slide,.56,.82,12,0.58,title,30,WHITE,True)
    text(slide,.58,1.52,11.8,.45,sub,14,MUTED)
    shape(slide,.58,6.95,12.15,.012,EDGE)
    text(slide,.6,7.04,9,.25,'WELLNESS SUPPORT  •  NOT MEDICAL DIAGNOSIS',9,MUTED)
    text(slide,12.0,7.03,.7,.25,f'{idx:02}',10,MUTED,align=PP_ALIGN.RIGHT)
    return slide
def card(s,x,y,w,h,k,title,body,accent=VIOLET):
    shape(s,x,y,w,h,CARD,True,EDGE);shape(s,x+.22,y+.24,.11,.43,accent,True)
    text(s,x+.46,y+.2,w-.7,.35,k,10,accent,True);text(s,x+.24,y+.72,w-.48,.42,title,19,WHITE,True);text(s,x+.24,y+1.28,w-.48,h-1.42,body,14,MUTED)
# cover
s=prs.slides.add_slide(prs.slide_layouts[6]);s.background.fill.solid();s.background.fill.fore_color.rgb=rgb(BG)
shape(s,8.4,0,4.93,7.5,'1D1430');s.shapes.add_picture('assets/aura-icon.png',Inches(9.2),Inches(1.55),width=Inches(3.2),height=Inches(3.2))
text(s,.75,.72,6,.35,'AURAHEALTH PRO',13,PINK,True)
text(s,.75,1.65,7.4,1.4,'A calmer way to\nmanage your health',35,WHITE,True)
text(s,.78,3.35,6.5,.95,'A mobile wellness companion for readings, medicines, appointments and everyday questions.',18,MUTED)
shape(s,.77,5.25,3.05,.52,'40305C',True);text(s,.94,5.38,2.7,.24,'PRODUCT OVERVIEW  •  2026',10,WHITE,True)
text(s,.78,6.78,7,.3,'General wellness information—not a medical service.',11,MUTED)
# overview
s=base('Everything in one place','A simple daily workflow, built around the user’s own records.',2)
card(s,.6,2.18,3.87,3.8,'01  /  TRACK','Readings','Record and review health readings, with a history you can manage.',MINT)
card(s,4.73,2.18,3.87,3.8,'02  /  REMEMBER','Medicines','Save medication times, mark doses and set reminder alerts.',PINK)
card(s,8.86,2.18,3.87,3.8,'03  /  PREPARE','Visits & coach','Prepare a visit brief or ask AuraCoach general wellness questions.',VIOLET)
# meds
s=base('Make medicines easier to manage','A practical schedule, paired with reminders—not a substitute for medical advice.',3)
card(s,.6,2.18,5.85,3.75,'DAILY ROUTINE','Your medicine list','Add medicine details and times, review today’s schedule, and mark doses taken or skipped.',PINK)
card(s,6.7,2.18,6.03,3.75,'ALARM-STYLE ALERT','A reminder at the time','Enable notifications and test the short sound. Android permissions, battery settings and silent mode can affect delivery.',MINT)
# readings
s=base('Turn records into useful context','A clearer picture of what to discuss—not an automatic diagnosis.',4)
card(s,.6,2.18,3.87,3.75,'01','Log readings','Enter your own values and review or delete individual records.',MINT)
card(s,4.73,2.18,3.87,3.75,'02','Prepare for a visit','Select the information to include in a Doctor Visit Brief.',VIOLET)
card(s,8.86,2.18,3.87,3.75,'03','Share thoughtfully','Preview and copy the brief to share it with your clinician.',PINK)
# ai
s=base('Meet AuraCoach','A general wellness companion, connected automatically for signed-in users.',5)
shape(s,.6,2.18,7.15,3.85,CARD,True,EDGE)
text(s,.9,2.5,6.5,.42,'ASK  •  REFLECT  •  PREPARE',12,MINT,True)
text(s,.9,3.05,6.3,1.7,'Ask a question or select a photo. With permission, the request is sent through the hosted service to Gemini for a response.',19,WHITE)
shape(s,8.02,2.18,4.72,3.85,'2A1E38',True,EDGE)
text(s,8.32,2.53,4.1,.36,'IMPORTANT',12,GOLD,True)
text(s,8.32,3.04,4.1,2.3,'AI can make mistakes. It cannot diagnose or replace a clinician. Images and medical documents may be misread.',17,WHITE)
# privacy
s=base('Privacy and safety by design','The user chooses what to share with AuraCoach.',6)
card(s,.6,2.18,3.87,3.75,'01  /  DEVICE','Local records','Health records are stored on the device; they are not yet a secure cloud-synced medical record.',MINT)
card(s,4.73,2.18,3.87,3.75,'02  /  CONSENT','AI sharing','AI requests leave the device after permission. Selected information and photos go to the AI provider.',VIOLET)
card(s,8.86,2.18,3.87,3.75,'03  /  SECURITY','Protected access','Verified sign-in and a hosted AI key help protect the service. Usage limits apply.',PINK)
# usage
s=base('A simple first-time flow','From sign-in to a useful daily routine.',7)
for i,(title,body) in enumerate([('Sign in','Use a verified account.'),('Add details','Record medicines and readings.'),('Enable alerts','Allow notifications and test the alarm.'),('Ask or prepare','Use AuraCoach or create a visit brief.')]):
    x=.6+i*3.06;shape(s,x,2.3,2.84,3.4,CARD,True,EDGE);text(s,x+.2,2.54,.55,.43,f'0{i+1}',14,MINT,True);text(s,x+.2,3.13,2.4,.5,title,18,WHITE,True);text(s,x+.2,3.82,2.38,1.25,body,14,MUTED)
# roadmap
s=base('Current status & next steps','An evolving test build—not a finished medical product.',8)
shape(s,.6,2.18,6,3.83,CARD,True,EDGE);text(s,.91,2.54,5.2,.38,'AVAILABLE IN THE TEST BUILD',12,MINT,True);text(s,.91,3.1,5.25,2.1,'• Verified sign-in\n• Readings, medicines and visit brief\n• AuraCoach with hosted Gemini\n• Alarm-style medication reminders',17,WHITE)
shape(s,6.85,2.18,5.88,3.83,CARD,True,EDGE);text(s,7.15,2.54,5.1,.38,'BEFORE A PUBLIC RELEASE',12,GOLD,True);text(s,7.15,3.1,5.15,2.45,'• Test reminders on real phones\n• Privacy, security and safety review\n• Production signing and release checks\n• Cross-device Family Care is planned',16,WHITE)
prs.core_properties.title='AuraHealth Pro — Product Overview';prs.core_properties.subject='Features, privacy and release status'
prs.save('deliverables/AuraHealth-Pro-Presentation.pptx')

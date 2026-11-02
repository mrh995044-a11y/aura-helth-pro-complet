"""Build AuraHealth Pro feature and patient benefits presentation (python-pptx)."""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from PIL import Image

prs=Presentation();prs.slide_width=Inches(13.333);prs.slide_height=Inches(7.5)
BG='100C1B'; CARD='21182E'; BORDER='473357'; WHITE='F8F5FF'; MUTED='C7BCD7'; PINK='FA83B5'; PURPLE='B9A6FF'; MINT='78DCCB'; GOLD='F5CF82'
def rgb(s): return RGBColor.from_string(s)
def shape(s,x,y,w,h,fill,rounded=False,line=None):
    sh=s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h)); sh.fill.solid();sh.fill.fore_color.rgb=rgb(fill)
    if line: sh.line.color.rgb=rgb(line)
    else: sh.line.fill.background()
    if rounded: sh.adjustments[0]=.10
    return sh
def text(s,x,y,w,h,msg,size=18,c=WHITE,bold=False,align=None):
    sh=s.shapes.add_textbox(Inches(x),Inches(y), Inches(w), Inches(h));tf=sh.text_frame;tf.word_wrap=True;tf.margin_left=tf.margin_right=Inches(.015);tf.margin_top=tf.margin_bottom=Inches(.01)
    p=tf.paragraphs[0];p.text=msg;p.font.name='Aptos';p.font.size=Pt(size);p.font.bold=bold;p.font.color.rgb=rgb(c)
    if align is not None:p.alignment=align
    return sh
def base(i,title,sub):
    s=prs.slides.add_slide(prs.slide_layouts[6]);s.background.fill.solid();s.background.fill.fore_color.rgb=rgb(BG)
    text(s,.6,.30,9,.27,'AURAHEALTH PRO  /  FEATURES & PATIENT BENEFITS',10,PURPLE,True)
    text(s,.6,.83,12.0,.55,title,30,WHITE,True);text(s,.62,1.51,11.9,.37,sub,14,MUTED)
    shape(s,.6,6.98,12.1,.012,BORDER);text(s,.62,7.09,10,.22,'WELLNESS SUPPORT  •  NOT A MEDICAL DIAGNOSIS',9,MUTED);text(s,12.04,7.08,.6,.22,f'{i:02}',9,MUTED,align=PP_ALIGN.RIGHT)
    return s
def notes(s,t): s.notes_slide.notes_text_frame.text=t
def bullets(s,x,y,w,items):
    for i,(title,body) in enumerate(items):
        yy=y+i*.98;shape(s,x,yy,.08,.49,MINT,True);text(s,x+.27,yy-.01,w-.27,.34,title,18,WHITE,True);text(s,x+.27,yy+.39,w-.27,.50,body,13,MUTED)
def image_fit(s,path,x,y,w,h):
    img=Image.open(path); iw,ih=img.size; rw=min(w,h*iw/ih);rh=rw*ih/iw
    shape(s,x-.1,y-.1,w+.2,h+.2,'30233C',True,BORDER)
    s.shapes.add_picture(path, Inches(x+(w-rw)/2), Inches(y+(h-rh)/2), width=Inches(rw),height=Inches(rh))

def benefit(s,msg):
    shape(s,.65,6.3,12.0,.45,'302540',True);text(s,.86,6.39,11.55,.23,'PATIENT BENEFIT  •  '+msg,11,MINT,True)
def card(s,x,y,w,h,title,body,accent=PURPLE):
    shape(s,x,y,w,h,CARD,True,BORDER);text(s,x+.2,y+.23,w-.4,.35,title,16,accent,True);text(s,x+.2,y+.72,w-.4,h-.9,body,14,WHITE)
def intro():
    s=prs.slides.add_slide(prs.slide_layouts[6]);s.background.fill.solid();s.background.fill.fore_color.rgb=rgb(BG)
    shape(s,8.6,0,4.733,7.5,'211631');image_fit(s,'assets/presentation/current/welcome.png',9.45,.62,2.8,6.1)
    text(s,.75,.65,7,.35,'AURAHEALTH PRO',14,PINK,True);text(s,.75,1.66,7.2,1.5,'A simpler way to\nmanage daily health',35,WHITE,True)
    text(s,.8,3.68,6.7,1,'Features, patient benefits, and how AuraCoach uses AI.',19,MUTED)
    shape(s,.8,5.25,2.8,.5,'40305C',True);text(s,1.02,5.36,2.35,.24,'PRODUCT PRESENTATION',10,WHITE,True)
    text(s,.8,6.75,7,.3,'Test build • app screenshots',11,MUTED)
    notes(s,'Introduce AuraHealth Pro as a wellness companion, not a medical device or replacement for professional care. The deck discusses features, potential benefits, limitations, and the relationship between AI and AuraCoach.')
intro()
s=base(2,'What the app brings together','A practical daily workflow for personal health information.')
card(s,.65,2.22,3.85,3.45,'01  /  TRACK','Record health readings and manage your history.',MINT)
card(s,4.74,2.22,3.85,3.45,'02  /  REMEMBER','Keep medication and bedtime schedules.',PINK)
card(s,8.83,2.22,3.85,3.45,'03  /  PREPARE','Organize visits and ask general wellness questions.',PURPLE)
benefit(s,'Less information scattered across different places.')
notes(s,'Describe the app as bringing several daily health tasks into one interface. Similar combinations may also be found in other products. Do not imply the app makes a person healthier by itself.')
s=base(3,'Sign-in and personal access','Email verification or Google sign-in; normal session restoration after reopening.')
bullets(s,.75,2.32,7.4,[('Verified sign-in','Helps associate the app with the user’s account.'),('Optional device lock','PIN and biometric settings can add an extra barrier on a supported device.'),('Local records','Health information stays on the device unless the user chooses to share it with AI.')])
card(s,8.72,2.35,3.7,3.45,'REALITY CHECK','Session restoration is not guaranteed after sign-out, reinstall, clearing data or account changes.',GOLD)
benefit(s,'Quicker return to personal information with account-based access.')
notes(s,'Clarify that ordinary app reopening should restore a verified matching Firebase session. Device health records are local and are not an encrypted synced medical record. The device lock is optional.')
s=base(4,'Log readings and review history','App screenshot: readings and daily activity.')
image_fit(s,'assets/presentation/current/vitals.png',.82,2.04,2.3,4.15)
bullets(s,3.52,2.28,8.5,[('Enter medical readings','Blood pressure, heart rate, glucose, oxygen and weight.'),('Review the history','See earlier entries and delete a reading when needed.'),('Understand the limits','An unusual value may show a warning; it is not a diagnosis.')])
benefit(s,'A clearer record to discuss with a clinician.')
notes(s,'The screenshot shows an empty readings dashboard. Values and warning bands are not diagnostic.')
s=base(5,'Scan a report photo','A guided workflow with user review before saving.')
card(s,.68,2.35,3.7,2.65,'1  /  CHOOSE','Take a photo or choose a report image.',MINT)
card(s,4.82,2.35,3.7,2.65,'2  /  REVIEW','AI suggests one supported reading; check its value and units.',PINK)
card(s,8.96,2.35,3.7,2.65,'3  /  SAVE','Only save after checking; entry uses the current time.',PURPLE)
text(s,.85,5.33,11.55,.64,'The image is sent to the hosted AI service and Gemini only after permission. AI can misread reports.',14,GOLD)
benefit(s,'May reduce typing while keeping the person in control.')
notes(s,'This feature is not fully automatic extraction of an entire laboratory report. It suggests one recognized measurement from supported formats, and the user must review before saving. Do not assume the suggestion, units or date are correct.')
s=base(6,'Medicines and reminders','App screenshot: medication schedules and reminders.')
image_fit(s,'assets/presentation/current/medicines.png',.85,2.04,2.3,4.15)
bullets(s,5.65,2.30,6.85,[('Make a daily schedule','Add medicine details and select 24-hour times.'),('Record doses','Mark taken or skipped; edit or delete a medicine.'),('Sound and vibration','Enable reminders; device settings can delay or silence them.')])
benefit(s,'Supports an organized routine; keep a backup reminder.')
notes(s,'The screenshot shows an empty medication list. The app cannot guarantee reminder delivery and does not provide a continuous full-screen alarm.')
s=base(7,'Bedtime and live steps','App screenshot: bedtime reminder and activity.')
image_fit(s,'assets/presentation/current/bedtime.png',.82,2.04,2.3,4.15)
card(s,3.45,2.27,4.35,3.72,'BEDTIME REMINDER','Choose a 24-hour bedtime and receive a short notification with sound and vibration, subject to device settings.',PINK)
card(s,8.12,2.27,4.52,3.72,'LIVE STEP COUNTER','With permission and a supported sensor, count steps while the readings screen is active. The counter resets when leaving.',MINT)
benefit(s,'Gentle routine support, without claiming complete activity tracking.')
notes(s,'The step counter is not all-day or background tracking. Its live session value is not automatically a saved clinical record. Bedtime reminders are subject to notification, alarm, battery, and sound settings.')
s=base(8,'Visits and the directory','App screenshot: facility listings are not a complete or live source.')
image_fit(s,'assets/presentation/current/visits.png',.85,2.04,2.3,4.15)
bullets(s,3.52,2.28,8.5,[('Search reference listings','Browse by location and other filters.'),('Keep personal visit notes','Record an appointment, time and notes.'),('Verify details','Phone numbers and services may change; check directly or use the external eChannelling link.')])
benefit(s,'Helps organize visit information in one place.')
notes(s,'The directory does not include every Sri Lankan channeling centre, and contact details may change. The app does not itself guarantee a booking.')
s=base(9,'Doctor Visit Brief','A simple select, preview and copy workflow.')
card(s,.7,2.27,3.85,3.65,'SELECT','Choose which real records and details to include.',MINT)
card(s,4.74,2.27,3.85,3.65,'PREVIEW','Review the summary and add questions for the visit.',PINK)
card(s,8.78,2.27,3.85,3.65,'COPY','Copy the brief when you choose to share it.',PURPLE)
benefit(s,'Arrive with organized information and questions.')
notes(s,'The brief excludes sample readings and medicines. It is not automatically sent anywhere; the user previews and copies it. It is not a clinical medical record.')
s=base(10,'AuraCoach: a wellness conversation','App screenshot: the AuraCoach wellness companion.')
image_fit(s,'assets/presentation/current/coach.png',.82,2.04,2.3,4.15)
bullets(s,3.5,2.30,5.0,[('Ask a general question','Ask about habits, records or questions to raise with a professional.'),('Choose what to share','Selected health context is sent after the user grants permission.'),('Use the hosted connection','A verified account calls the hosted Gemini service; usage limits apply.')])
card(s,8.72,2.35,3.7,3.55,'IMPORTANT','Gemini can be wrong. It is not a doctor, emergency service or substitute for clinical advice.',GOLD)
benefit(s,'A convenient starting point for questions and appointment preparation.')
notes(s,'AuraCoach is the app’s interface and workflow around a hosted Google Gemini model. The user has previously reported a successful AI response, but availability and quotas are not guaranteed.')
s=base(11,'Camera guides and image questions','User-controlled photo capture and visual guides.')
card(s,.68,2.27,5.85,3.72,'CHOOSE A GUIDE','Select meal, medicine, report or skin concern, then take and review a photo before sending.',MINT)
card(s,6.81,2.27,5.85,3.72,'UNDERSTAND THE LIMIT','The coloured frames are decorative guides, not object recognition or true AR tracking.',GOLD)
benefit(s,'Offers a visual way to ask general questions—with consent.')
notes(s,'Photos are sent only after explicit confirmation. A skin image cannot reliably identify an infection or pathogen. The app is not a diagnostic tool and the AI may make errors even with safety instructions.')
s=base(12,'AI and AuraCoach: what is the difference?','AuraCoach uses AI; they are not competing technologies.')
card(s,.68,2.25,5.85,3.75,'AI / GEMINI','The general-purpose technology: a model that can process language and images and generate responses.',PURPLE)
card(s,6.81,2.25,5.85,3.75,'AURACOACH','The health-focused app experience: question screen, optional context, photo flow, consent and safety messages around Gemini.',MINT)
benefit(s,'A familiar health-focused interface for asking general questions.')
notes(s,'AI is the broad technology category. Gemini is a general-purpose model provider. AuraCoach is the product feature that provides a specific interface and wellness context using Gemini through the hosted server. It is not a separately trained medical model.')
s=base(13,'How it may differ from other apps','A qualitative comparison—not a claim that these features are unique.')
card(s,.68,2.25,3.85,3.75,'SINGLE-PURPOSE TOOLS','Some tools focus on only one job, such as medication reminders or tracking readings.',MINT)
card(s,4.74,2.25,3.85,3.75,'GENERAL AI CHAT','A general chatbot answers questions but may not provide this app’s opt-in local health workflow.',PINK)
card(s,8.80,2.25,3.85,3.75,'AURAHEALTH PRO','Combines a local journal, reminders, visit preparation and an AI interface in one test build.',PURPLE)
text(s,.73,6.12,11.9,.3,'Other products may offer similar or more advanced features. No named competitor comparison has been verified.',11,GOLD)
notes(s,'This is a positioning explanation, not a claim that AuraHealth Pro is the only app with these capabilities or is better than a named competitor. Specific products require separate verified comparison.')
s=base(14,'Privacy and safety','Understand what stays local and what leaves the device.')
image_fit(s,'assets/presentation/current/profile.png',.82,2.04,2.3,4.15)
bullets(s,3.5,2.28,8.7,[('Local health records','Stored on the device; not yet a secure cloud-synced medical record.'),('AI sharing is opt-in','Selected context and photos go through the hosted service to Gemini.'),('The app is not an emergency service','If someone has serious symptoms, seek urgent medical help immediately.')])
benefit(s,'Informed choices about sharing and a clearer understanding of limitations.')
notes(s,'Explain that local app data is not a production-grade secure medical record and that AI provider privacy terms and usage rules apply. Do not rely on the app to detect a heart attack or infection.')
s=base(15,'Current status and future work','A test-signed app with features to validate on real phones.')
card(s,.7,2.3,5.85,3.65,'CURRENT','Sign-in and an AuraCoach response have been reported working on a phone. New camera and alarm flows require device testing.',MINT)
card(s,6.78,2.3,5.85,3.65,'NOT YET COMPLETE','Background all-day steps, cross-device Family Care, a complete verified directory and production release reviews remain.',GOLD)
benefit(s,'Start with a useful foundation while being honest about what remains.')
notes(s,'Conclude that the project remains test-signed. Never promise zero bugs or claim the missing capabilities are complete. Family Care across devices is planned but not implemented.')
prs.core_properties.title='AuraHealth Pro — Features, Patient Benefits and AI';prs.core_properties.subject='App overview, screenshots, safety and comparisons'
prs.save('deliverables/AuraHealth-Pro-Features-and-Benefits.pptx')

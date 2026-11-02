"""Translate the feature deck and add slide fades and title entrance effects.
Requires python-pptx. Screenshots remain unchanged and in the original language.
"""
from pptx import Presentation
from pptx.util import Pt
from pptx.oxml import parse_xml
from pptx.oxml.ns import nsdecls, qn

source='deliverables/AuraHealth-Pro-Features-and-Benefits.pptx'
en='deliverables/AuraHealth-Pro-Features-and-Benefits-Animated.pptx'
si='deliverables/AuraHealth-Pro-Features-and-Benefits-Sinhala-Animated.pptx'
# Title, subtitle and text objects in original visual order (excluding the footer).
content=[
('දිනපතා සෞඛ්‍යය\nපහසුවෙන් කළමනාකරණය','විශේෂාංග, රෝගියාට ප්‍රතිලාභ සහ AuraCoach හි AI භාවිතය.', ['යෙදුම් හැඳින්වීම','පරීක්ෂණ සංස්කරණය • පැරණි තිර ඡායාරූප']),
('එකම යෙදුමකින් බොහෝ කාර්යයන්','දෛනික සෞඛ්‍ය තොරතුරු සංවිධානයට සරල ක්‍රමයක්.', ['01  /  සටහන්','සෞඛ්‍ය මිනුම් සටහන් කර ඉතිහාසය බලන්න.','02  /  මතක් කිරීම','ඖෂධ සහ නින්දට යන වේලාවන් සකසන්න.','03  /  සූදානම් වීම','වෛද්‍ය හමුවීම් සහ සෞඛ්‍ය ප්‍රශ්න සූදානම් කරන්න.','රෝගියාට ප්‍රතිලාභ  •  තොරතුරු ස්ථාන කිහිපයක විසිරී යාම අඩු කරයි.']),
('පුරනය වීම සහ පුද්ගලික ප්‍රවේශය','විද්‍යුත් තැපෑල තහවුරු කිරීම හෝ Google පුරනය වීම.', ['තහවුරු කළ පුරනය','යෙදුම පරිශීලක ගිණුමට සම්බන්ධ කරයි.','විකල්ප උපාංග අගුල','සහය දක්වන උපාංගවල PIN හෝ ජෛවමිතික අගුලක්.','උපාංගයේ සටහන්','AI සමඟ බෙදාගැනීම තෝරන තුරු සෞඛ්‍ය සටහන් උපාංගයේ රැඳේ.','සැලකිලිමත් වන්න','වරනය වීමෙන්, යෙදුම නැවත ස්ථාපනයෙන් හෝ දත්ත මැකීමෙන් පසු නැවත පුරනය අවශ්‍ය විය හැක.','රෝගියාට ප්‍රතිලාභ  •  තම තොරතුරු වෙත පහසු ප්‍රවේශය.']),
('මිනුම් සටහන් කර ඉතිහාසය බලන්න','පැරණි යෙදුමක සැබෑ තිර රුවක්; මෙහි අගයන් නිදර්ශන පමණි.', ['සෞඛ්‍ය මිනුම් ඇතුළත් කරන්න','රුධිර පීඩනය, හෘද ස්පන්දනය, ග්ලූකෝස්, ඔක්සිජන් හා බර.','පෙර සටහන් බලන්න','ඉතිහාසය පරීක්ෂා කර අවශ්‍ය සටහන් මකන්න.','සීමාවන් තේරුම් ගන්න','අසාමාන්‍ය අගයකට අනතුරු ඇඟවීමක් ලැබිය හැක; එය රෝග නිර්ණයක් නොවේ.','රෝගියාට ප්‍රතිලාභ  •  වෛද්‍යවරයා සමඟ සාකච්ඡාවට පැහැදිලි සටහනක්.']),
('වාර්තාවක ඡායාරූපයක් පරිලෝකනය','විශේෂාංග රූප සටහනකි; නවතම තිර රුව තවම ලබාදී නැත.', ['1  /  තෝරන්න','වාර්තාව ඡායාරූප ගන්න හෝ රූපයක් තෝරන්න.','2  /  පරීක්ෂා කරන්න','AI එක් මිනුමක් යෝජනා කරයි; අගය හා ඒකකය පරීක්ෂා කරන්න.','3  /  සුරකින්න','පරීක්ෂා කළ පසු පමණක් සුරකින්න; වත්මන් වේලාව සටහන් වේ.','අවසරයෙන් පසුව පමණක් රූපය AI සේවාවට සහ Gemini වෙත යවයි. වැරදි කියවීම් සිදුවිය හැක.','රෝගියාට ප්‍රතිලාභ  •  පරීක්ෂා කිරීමේ පාලනය රඳවාගෙන ටයිප් කිරීම අඩු කළ හැක.']),
('ඖෂධ සහ මතක් කිරීම්','පැරණි තිර රුවක කොටසකි; මෙහි ඖෂධ නිදර්ශන ලෙස සලකුණු කර ඇත.', ['දෛනික කාලසටහන','ඖෂධ විස්තර සහ පැය 24 ආකෘතියේ වේලාවන් එක් කරන්න.','මාත්‍රාව සටහන් කරන්න','ගත් බව හෝ මඟ හැරුණු බව සටහන් කර ඖෂධ සංස්කරණය කරන්න.','ශබ්දය සහ කම්පනය','මතක් කිරීම් සක්‍රිය කරන්න; දුරකථන සැකසුම් බලපෑ හැක.','රෝගියාට ප්‍රතිලාභ  •  දින චර්යාව සංවිධානයට සහාය; අමතර මතක් කිරීමක් තබාගන්න.']),
('නින්දට යාම සහ සජීවී පියවර','විශේෂාංග රූප සටහනකි; නවතම තිර රූ තවම ලබාදී නැත.', ['නින්දට යාමේ මතක් කිරීම','පැය 24 වේලාවක් තෝරන්න. සැකසුම් අනුව කෙටි ශබ්ද සහ කම්පන දැනුම්දීමක් ලැබේ.','සජීවී පියවර ගණන','අවසරය සහ සංවේදකය තිබේ නම් මිනුම් තිරය සක්‍රියව ඇති විට පියවර ගණන් කරයි; පිටවූ විට ගණන යළි ඇරඹේ.','රෝගියාට ප්‍රතිලාභ  •  දින චර්යාවට සහාය; මුළු දවසේ පියවර මැනීමක් නොවේ.']),
('හමුවීම් සහ නාමාවලිය','පැරණි තිර රුවකි; ලැයිස්තුව සම්පූර්ණ හෝ සජීවී දත්ත මූලාශ්‍රයක් නොවේ.', ['ලැයිස්තු සොයන්න','ප්‍රදේශය සහ අනෙකුත් පෙරහන් භාවිත කරන්න.','හමුවීම් සටහන්','හමුවීම, වේලාව සහ සටහන් ඇතුළත් කරන්න.','විස්තර තහවුරු කරන්න','අංක සහ සේවා වෙනස් විය හැක; මධ්‍යස්ථානයෙන් හෝ eChannelling හරහා තහවුරු කරන්න.','රෝගියාට ප්‍රතිලාභ  •  හමුවීම් තොරතුරු එක තැනක තබාගත හැක.']),
('වෛද්‍ය හමුවීම් සාරාංශය','විශේෂාංග රූප සටහනකි; නවතම තිර රුව තවම ලබාදී නැත.', ['තෝරන්න','ඇතුළත් කිරීමට සැබෑ සටහන් සහ විස්තර තෝරන්න.','පෙරදසුන','සාරාංශය පරීක්ෂා කර වෛද්‍යවරයාට අසන ප්‍රශ්න එක් කරන්න.','පිටපත් කරන්න','බෙදාගැනීමට අවශ්‍ය විට සාරාංශය පිටපත් කරන්න.','රෝගියාට ප්‍රතිලාභ  •  සංවිධානය කළ තොරතුරු සහ ප්‍රශ්න රැගෙන යා හැක.']),
('AuraCoach: සුවතා සංවාදයක්','විශේෂාංග රූප සටහනකි; නවතම AuraCoach තිර රුව ලබාදී නැත.', ['සාමාන්‍ය ප්‍රශ්නයක් අසන්න','පුරුදු, සටහන් හෝ වෛද්‍යවරයාට අසන ප්‍රශ්න ගැන අසන්න.','බෙදාගන්නා දේ තෝරන්න','අවසරය ලබාදුන් පසු තෝරාගත් සෞඛ්‍ය තොරතුරු යවයි.','සත්කාරක සම්බන්ධතාව','තහවුරු කළ ගිණුම Gemini සේවාව භාවිත කරයි; භාවිත සීමා ඇත.','වැදගත්','Gemini වැරදි විය හැක. එය වෛද්‍යවරයෙක් හෝ හදිසි සේවාවක් නොවේ.','රෝගියාට ප්‍රතිලාභ  •  ප්‍රශ්න සහ වෛද්‍ය හමුවීම් සූදානමට ආරම්භක සහාය.']),
('කැමරා මාර්ගෝපදේශ සහ රූප ප්‍රශ්න','විශේෂාංග රූප සටහනකි; නවතම කැමරා තිර රුව ලබාදී නැත.', ['මාර්ගෝපදේශයක් තෝරන්න','ආහාර, ඖෂධ, වාර්තා හෝ සමේ ගැටලුව තෝරා ඡායාරූපය පරීක්ෂා කර යවන්න.','සීමාවන් තේරුම් ගන්න','වර්ණ රාමු දෘශ්‍ය මාර්ගෝපදේශ පමණි; වස්තු හඳුනාගැනීමක් හෝ සැබෑ AR ලුහුබැඳීමක් නොවේ.','රෝගියාට ප්‍රතිලාභ  •  අවසරය ඇතිව රූපයක් ගැන සාමාන්‍ය ප්‍රශ්න ඇසිය හැක.']),
('AI සහ AuraCoach අතර වෙනස','AuraCoach AI භාවිත කරයි; මේවා තරගකාරී තාක්ෂණ දෙකක් නොවේ.', ['AI / GEMINI','භාෂාව සහ රූප සකසා පිළිතුරු ජනනය කරන පොදු කාර්ය ආකෘතියකි.','AURACOACH','Gemini වටා සැකසූ සුවතා අත්දැකීම: ප්‍රශ්න, විකල්ප සෞඛ්‍ය තොරතුරු, රූප, අවසරය හා ආරක්ෂක පණිවිඩ.','රෝගියාට ප්‍රතිලාභ  •  සාමාන්‍ය සෞඛ්‍ය ප්‍රශ්න ඇසීමට හුරුපුරුදු අතුරුමුහුණතක්.']),
('වෙනත් යෙදුම්වලින් වෙනස් විය හැකි ආකාරය','ගුණාත්මක සැසඳීමකි; මෙම විශේෂාංග අද්විතීය බවක් ප්‍රකාශ නොකරයි.', ['එක් කාර්යයක මෙවලම්','සමහර යෙදුම් ඖෂධ මතක් කිරීම් හෝ මිනුම් වැනි එක් කාර්යයක් කෙරෙහි අවධානය යොමු කරයි.','සාමාන්‍ය AI සංවාද','සාමාන්‍ය chatbot එකක් ප්‍රශ්නවලට පිළිතුරු දුන්නත් මෙම යෙදුමේ පරිශීලක තේරීම් සහිත සටහන් ක්‍රමය නොතිබිය හැක.','AURAHEALTH PRO','සටහන්, මතක් කිරීම්, හමුවීම් සූදානම සහ AI අතුරුමුහුණත එක් පරීක්ෂණ යෙදුමක.','වෙනත් නිෂ්පාදනවල සමාන හෝ උසස් හැකියාවන් තිබිය හැක. නිශ්චිත තරඟකරුවෙකු සමඟ සැසඳීමක් තහවුරු කර නැත.']),
('පෞද්ගලිකත්වය සහ ආරක්ෂාව','උපාංගයේ රැඳෙන සහ පිටතට යන දේ තේරුම් ගන්න.', ['උපාංගයේ සෞඛ්‍ය සටහන්','දත්ත උපාංගයේ ගබඩා වේ; මෙය තවම ආරක්ෂිත cloud වෛද්‍ය වාර්තාවක් නොවේ.','AI බෙදාගැනීම සඳහා අවසරය','තෝරාගත් තොරතුරු සහ රූප සත්කාරක සේවාව හරහා Gemini වෙත යයි.','මෙය හදිසි සේවාවක් නොවේ','බරපතළ රෝග ලක්ෂණ තිබේ නම් වහාම හදිසි වෛද්‍ය උපකාර ලබාගන්න.','රෝගියාට ප්‍රතිලාභ  •  බෙදාගැනීම සහ සීමාවන් පිළිබඳ දැනුවත් තීරණ.']),
('වත්මන් තත්ත්වය සහ ඉදිරි වැඩ','සැබෑ දුරකථනවල තවදුරටත් පරීක්ෂා කළ යුතු test-signed යෙදුමකි.', ['දැනට','දුරකථනයක පුරනය සහ AuraCoach පිළිතුරක් ක්‍රියා කළ බව වාර්තා විය. නව කැමරා සහ alarm පරීක්ෂා කළ යුතුය.','තවම සම්පූර්ණ නැත','පසුබිම් පියවර ගණන, වෙනත් උපාංගවල Family Care, සම්පූර්ණ නාමාවලිය හා ප්‍රසිද්ධ නිකුතු පරීක්ෂණ ඉතිරිව ඇත.','රෝගියාට ප්‍රතිලාභ  •  ඉතිරි වැඩ පිළිබඳ අවංකව සිටිමින් ප්‍රයෝජනවත් ආරම්භයක්.'])
]
notes_si=[
'මෙය වෛද්‍යවරයෙකු වෙනුවට නොව, දෛනික සුවතා තොරතුරු සංවිධානයට සහාය දෙන යෙදුමකි.',
'සෞඛ්‍ය මිනුම්, ඖෂධ, හමුවීම් සහ සුවතා ප්‍රශ්න එකම අතුරුමුහුණතකින් කළමනාකරණය කළ හැක.',
'තහවුරු කළ ගිණුමකින් පුරනය විය හැක. උපාංගයේ සටහන් ආරක්ෂිත cloud වෛද්‍ය වාර්තාවක් ලෙස නොසලකන්න.',
'මෙය පැරණි සංස්කරණයක සැබෑ තිර රුවකි. පෙන්වන අගයන් නිදර්ශන පමණි; ඒවා රෝගියෙකුගේ මිනුම් නොවේ.',
'වාර්තාවේ ඡායාරූපය අවසරයෙන් AI වෙත යවයි. යෝජනා කරන එක් මිනුම සුරැකීමට පෙර අගය සහ ඒකක පරීක්ෂා කරන්න.',
'නිදර්ශන ඖෂධ පෙන්වන පැරණි තිර රුවකි. දුරකථන සැකසුම් නිසා මතක් කිරීම් ප්‍රමාද විය හැකි බැවින් අමතර මතක් කිරීමක් තබාගන්න.',
'පියවර ගණන තිරය සක්‍රියව පවතින කාලයට පමණි. එය පසුබිමේ මුළු දවස පුරා පියවර ගණන් නොකරයි.',
'නාමාවලිය සම්පූර්ණ හෝ සජීවී නොවේ. දුරකථන අංක සහ සේවා මධ්‍යස්ථානයෙන් සෘජුව තහවුරු කරන්න.',
'වෛද්‍ය හමුවීම් සාරාංශයට ඇතුළත් කළ යුතු සැබෑ සටහන් තෝරා පරීක්ෂා කර පසුව පිටපත් කළ හැක.',
'AuraCoach යනු Gemini භාවිත කරන යෙදුමේ සුවතා සංවාද විශේෂාංගයයි. එය වෛද්‍ය උපදෙස් හෝ හදිසි සේවාව වෙනුවට භාවිත නොකරන්න.',
'කැමරා රාමු අලංකාර මාර්ගෝපදේශ පමණි. ඡායාරූපයකින් රෝග කාරකය හෝ ආසාදනය විශ්වාසවන්තව හඳුනාගත නොහැක.',
'AI යනු සාමාන්‍ය තාක්ෂණයයි. Gemini යනු ආකෘතියකි. AuraCoach යනු එය යොදා සකස් කළ යෙදුමේ පරිශීලක අත්දැකීමයි.',
'මෙම සැසඳීම නිශ්චිත තරඟකරුවෙකු පිළිබඳ සත්‍යාපිත පරීක්ෂණයක් නොවේ; වෙනත් යෙදුම්වල සමාන හැකියාවන් තිබිය හැක.',
'AI සමඟ බෙදාගැනීම අවසරය මත සිදුවේ. බරපතළ ලක්ෂණ තිබේ නම් යෙදුමට නොසිට හදිසි වෛද්‍ය උපකාර ලබාගන්න.',
'මෙය test-signed සංස්කරණයකි. වෙනත් උපාංගවල Family Care සහ සම්පූර්ණ නාමාවලිය තවම ක්‍රියාත්මක කර නැත.'
]

def replace_text(shape, message):
    # Preserve font styling when changing each text box; fit Sinhala glyphs within
    # the existing, compact cards without rewriting the slide layout.
    p=shape.text_frame.paragraphs[0]
    first=p.runs[0] if p.runs else None
    original_size=first.font.size if first else None
    original_bold=first.font.bold if first else None
    original_rgb=None
    if first and first.font.color.type is not None:
        try: original_rgb=first.font.color.rgb
        except (AttributeError, ValueError): pass
    alignment=p.alignment
    shape.text_frame.text=message
    p=shape.text_frame.paragraphs[0];p.alignment=alignment
    for run in p.runs:
        run.font.name='Nirmala UI'
        if original_size: run.font.size=Pt(max(8, original_size.pt * (0.90 if original_size.pt >= 14 else 0.86)))
        if original_bold is not None: run.font.bold=original_bold
        if original_rgb: run.font.color.rgb=original_rgb

# One gentle automatic fade on each slide's main title, plus a fade transition.
# Timing references the actual shape id; the remaining content stays editable.
def animate_slide(slide, target_id):
    root=slide._element
    for el in list(root):
        if el.tag in (qn('p:transition'), qn('p:timing')): root.remove(el)
    transition=parse_xml(f'<p:transition {nsdecls("p")} spd="med" advClick="1"><p:fade/></p:transition>')
    timing=parse_xml(f'''<p:timing {nsdecls("p")}><p:tnLst><p:par>
      <p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>
        <p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>
          <p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>
            <p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>
              <p:par><p:cTn id="5" presetID="10" presetClass="entr" presetSubtype="0" fill="hold" nodeType="afterEffect"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>
                <p:set><p:cBhvr><p:cTn id="6" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="{target_id}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>
                <p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="7" dur="450"/><p:tgtEl><p:spTgt spid="{target_id}"/></p:tgtEl></p:cBhvr></p:animEffect>
              </p:childTnLst></p:cTn></p:par>
            </p:childTnLst></p:cTn></p:par>
          </p:childTnLst></p:cTn></p:par>
        </p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>
      </p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>''')
    # Insert after cSld/clrMapOvr and before extLst, respecting slide schema.
    ext=root.find(qn('p:extLst'))
    idx=list(root).index(ext) if ext is not None else len(root)
    root.insert(idx,transition);root.insert(idx+1,timing)

def add_effects(pres):
    for i,slide in enumerate(pres.slides):
        texts=[sh for sh in slide.shapes if sh.has_text_frame and sh.text.strip()]
        # Cover has brand first; other slides have small header first.
        animate_slide(slide,texts[1].shape_id)

english=Presentation(source);add_effects(english);english.save(en)
sinhala=Presentation(source)
assert len(sinhala.slides)==len(content)==len(notes_si)
for i,slide in enumerate(sinhala.slides):
    texts=[sh for sh in slide.shapes if sh.has_text_frame and sh.text.strip()]
    title,subtitle,body=content[i]
    if i==0:
        assert len(texts)==5
        replace_text(texts[1],title);replace_text(texts[2],subtitle);replace_text(texts[3],body[0]);replace_text(texts[4],body[1])
    else:
        assert len(texts[5:])==len(body),(i+1,len(texts[5:]),len(body))
        replace_text(texts[0],'AURAHEALTH PRO  /  විශේෂාංග සහ ප්‍රතිලාභ')
        replace_text(texts[1],title);replace_text(texts[2],subtitle)
        replace_text(texts[3],'සුවතා සහාය  •  වෛද්‍ය රෝග නිර්ණයක් නොවේ')
        for shape,msg in zip(texts[5:],body): replace_text(shape,msg)
    slide.notes_slide.notes_text_frame.text=notes_si[i]
add_effects(sinhala)
sinhala.core_properties.title='AuraHealth Pro — සිංහල හැඳින්වීම'
sinhala.save(si)
print('Created:',en,si)

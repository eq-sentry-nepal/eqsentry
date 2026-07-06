#!/usr/bin/env python3
"""EQ Sentry — bilingual (EN + नेपाली) infographic PDF kits.
Generates: eq-emergency-kit-checklist.pdf, eq-family-plan.pdf,
           eq-school-college-plan.pdf  (A4, print-friendly, brand style)
Fonts: Noto Sans Devanagari (HarfBuzz-shaped) + its Latin companion.
Run:   python3 scripts/generate-kits.py [outdir] [fontdir]
"""
import sys, math
from fpdf import FPDF

OUT = sys.argv[1] if len(sys.argv) > 1 else "assets/downloads"
FONTS = sys.argv[2] if len(sys.argv) > 2 else "/tmp/fonts"

ACCENT = (255, 77, 46); ACCENT2 = (255, 138, 61)
INK = (19, 26, 36); SOFT = (75, 85, 99); FAINT = (138, 148, 163)
DARK = (14, 17, 23); LINE = (222, 227, 235); CHIP = (255, 241, 237)
GREEN = (16, 185, 129); AMBER = (245, 158, 11); PAPER = (255, 255, 255)

W, H = 210, 297; M = 14  # A4 mm, margin

class Kit(FPDF):
    def __init__(self):
        super().__init__("P", "mm", "A4")
        self.set_auto_page_break(False)
        self.add_font("lat", "", f"{FONTS}/NotoDevaLatin-Regular.ttf")
        self.add_font("lat", "B", f"{FONTS}/NotoDevaLatin-Bold.ttf")
        self.add_font("dev", "", f"{FONTS}/NotoDeva-Regular.ttf")
        self.add_font("dev", "B", f"{FONTS}/NotoDeva-Bold.ttf")
        self.set_fallback_fonts(["lat"])          # Latin runs inside Nepali text
        self.set_text_shaping(True)
        self.set_title("EQ Sentry — Earthquake Preparedness Kit")
        self.set_author("EQ Sentry · eqsentry.com")

    # ---------- primitives ----------
    def seismic_wave(self, x, y, w, amp, color, lw=0.7):
        self.set_draw_color(*color); self.set_line_width(lw)
        pts, n = [], 60
        for i in range(n + 1):
            t = i / n
            a = amp * (math.sin(t * 18) * math.exp(-((t - 0.45) ** 2) * 18))
            pts.append((x + w * t, y - a))
        for i in range(n):
            self.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])

    def header_band(self, t_en, t_ne, chip=None, chip_ne=None):
        self.set_fill_color(*DARK); self.rect(0, 0, W, 30, "F")
        self.set_fill_color(*ACCENT); self.rect(0, 30, W, 1.6, "F")
        self.seismic_wave(W - 74, 22, 60, 5, ACCENT, 0.8)
        self.set_xy(M, 5); self.set_font("lat", "B", 8.5); self.set_text_color(*ACCENT2)
        self.cell(0, 4, "EQ SENTRY  ·  eqsentry.com")
        self.set_xy(M, 10); self.set_font("lat", "B", 17); self.set_text_color(255, 255, 255)
        self.cell(0, 8, t_en)
        self.set_xy(M, 19); self.set_font("dev", "B", 11.5); self.set_text_color(*ACCENT2)
        self.cell(0, 7, t_ne)
        if chip:
            self.set_font("lat", "B", 9); cw = self.get_string_width(chip) + 8
            self.set_fill_color(*ACCENT); self.set_text_color(255, 255, 255)
            self.rect(W - M - cw, 6, cw, 6.6, "F")
            self.set_xy(W - M - cw, 6.6); self.cell(cw, 5.4, chip, align="C")
            if chip_ne:
                self.set_xy(W - M - 60, 13.5); self.set_font("dev", "", 7.5)
                self.set_text_color(*FAINT); self.cell(60, 4, chip_ne, align="R")
        self.set_y(37)

    def section(self, n, en, ne):
        y = self.get_y() + 2
        self.set_fill_color(*ACCENT)
        self.ellipse(M, y, 8, 8, "F")
        self.set_xy(M, y + 1.4); self.set_font("lat", "B", 11); self.set_text_color(255, 255, 255)
        self.cell(8, 5, str(n), align="C")
        self.set_xy(M + 11, y - 0.6); self.set_font("lat", "B", 12.5); self.set_text_color(*INK)
        self.cell(0, 5.4, en)
        self.set_xy(M + 11, y + 4.6); self.set_font("dev", "", 9.5); self.set_text_color(*SOFT)
        self.cell(0, 4.6, ne)
        self.set_draw_color(*LINE); self.set_line_width(0.3)
        self.line(M, y + 11.2, W - M, y + 11.2)
        self.set_y(y + 13.6)

    def check_item(self, x, y, w, en, ne, hint=None):
        self.set_draw_color(*ACCENT); self.set_line_width(0.5)
        self.rect(x, y + 0.8, 4, 4)
        self.set_xy(x + 6, y - 0.4); self.set_font("lat", "B", 9.3); self.set_text_color(*INK)
        self.cell(w - 6, 4.6, en)
        if hint:
            self.set_font("lat", "", 7.8); self.set_text_color(*ACCENT)
            self.set_xy(x + 6, y - 0.4); self.cell(w - 6, 4.6, hint, align="R")
        self.set_xy(x + 6, y + 3.8); self.set_font("dev", "", 8.6); self.set_text_color(*SOFT)
        self.cell(w - 6, 4.4, ne)
        return y + 10.2

    def chip_row(self, items, y=None):
        if y is None: y = self.get_y()
        x = M
        for big, en, ne in items:
            cw = (W - 2 * M - (len(items) - 1) * 4) / len(items)
            self.set_fill_color(*CHIP); self.set_draw_color(255, 214, 200); self.set_line_width(0.3)
            self.rect(x, y, cw, 15.5, "FD")
            self.set_xy(x, y + 1.6); self.set_font("lat", "B", 13); self.set_text_color(*ACCENT)
            self.cell(cw, 6, big, align="C")
            self.set_xy(x, y + 7.6); self.set_font("lat", "B", 7.2); self.set_text_color(*INK)
            self.cell(cw, 3.4, en, align="C")
            self.set_xy(x, y + 11); self.set_font("dev", "", 6.8); self.set_text_color(*SOFT)
            self.cell(cw, 3.4, ne, align="C")
            x += cw + 4
        self.set_y(y + 18.5)

    def fill_line(self, en, ne, w=None, y=None):
        if y is None: y = self.get_y()
        if w is None: w = W - 2 * M
        self.set_xy(M, y); self.set_font("lat", "B", 9); self.set_text_color(*INK)
        self.cell(0, 4.4, en)
        self.set_xy(M, y + 4.2); self.set_font("dev", "", 8.4); self.set_text_color(*SOFT)
        self.cell(0, 4, ne)
        self.set_draw_color(*FAINT); self.set_line_width(0.3)
        self.line(M, y + 12.4, M + w, y + 12.4)
        self.set_y(y + 15.4)

    def table(self, headers, rows_h, col_w, y=None, ne_headers=None):
        if y is None: y = self.get_y()
        x = M
        self.set_fill_color(*DARK)
        self.rect(M, y, sum(col_w), 8.6 if ne_headers else 6, "F")
        for i, htxt in enumerate(headers):
            self.set_xy(x + 1.6, y + 0.8); self.set_font("lat", "B", 8); self.set_text_color(255, 255, 255)
            self.cell(col_w[i] - 3, 3.6, htxt)
            if ne_headers:
                self.set_xy(x + 1.6, y + 4.4); self.set_font("dev", "", 7.2); self.set_text_color(*ACCENT2)
                self.cell(col_w[i] - 3, 3.4, ne_headers[i])
            x += col_w[i]
        yy = y + (8.6 if ne_headers else 6)
        self.set_draw_color(*LINE); self.set_line_width(0.3)
        for r in range(len(rows_h)):
            x = M
            self.rect(M, yy, sum(col_w), rows_h[r])
            for i in range(len(col_w) - 1):
                x += col_w[i]; self.line(x, yy, x, yy + rows_h[r])
            yy += rows_h[r]
        self.set_y(yy + 3)
        return yy

    def bullet(self, n, en, ne, y=None, w=None):
        if y is None: y = self.get_y()
        if w is None: w = W - 2 * M - 10
        self.set_fill_color(*ACCENT2); self.ellipse(M, y + 0.6, 5.6, 5.6, "F")
        self.set_xy(M, y + 1.2); self.set_font("lat", "B", 8.5); self.set_text_color(255, 255, 255)
        self.cell(5.6, 4.4, str(n), align="C")
        self.set_xy(M + 8, y); self.set_font("lat", "B", 9.2); self.set_text_color(*INK)
        self.multi_cell(w, 4.3, en)
        y2 = self.get_y() + 0.4
        self.set_xy(M + 8, y2); self.set_font("dev", "", 8.6); self.set_text_color(*SOFT)
        self.multi_cell(w, 4.3, ne)
        self.set_y(self.get_y() + 3.4)

    def note_box(self, en, ne, color=AMBER, y=None):
        if y is None: y = self.get_y()
        hgt = 15
        self.set_fill_color(255, 250, 240); self.set_draw_color(*color); self.set_line_width(0.5)
        self.rect(M, y, W - 2 * M, hgt, "FD")
        self.set_fill_color(*color); self.rect(M, y, 1.6, hgt, "F")
        self.set_xy(M + 4.5, y + 2); self.set_font("lat", "B", 8.6); self.set_text_color(*INK)
        self.multi_cell(W - 2 * M - 8, 4, en)
        self.set_xy(M + 4.5, self.get_y() + 0.6); self.set_font("dev", "", 8.2); self.set_text_color(*SOFT)
        self.multi_cell(W - 2 * M - 8, 4, ne)
        self.set_y(y + hgt + 4)

    def footer_band(self, page, pages):
        self.set_fill_color(*DARK); self.rect(0, H - 14, W, 14, "F")
        self.set_xy(M, H - 11); self.set_font("lat", "B", 10); self.set_text_color(255, 255, 255)
        self.cell(0, 5, "100 Police  ·  102 Ambulance  ·  101 Fire  ·  1149 Disaster")
        self.set_xy(M, H - 6.4); self.set_font("dev", "", 7.6); self.set_text_color(*ACCENT2)
        self.cell(0, 4, "१०० प्रहरी · १०२ एम्बुलेन्स · १०१ दमकल · ११४९ विपद् — सबै निःशुल्क, २४/७")
        self.set_xy(W - M - 40, H - 10); self.set_font("lat", "", 7.5); self.set_text_color(*FAINT)
        self.cell(40, 4, f"eqsentry.com  ·  {page}/{pages}", align="R")

# ================= DOC 1: GO-BAG =================
def gobag():
    p = Kit(); p.add_page()
    p.header_band("Emergency Go-Bag Checklist", "आपत्कालीन झोला सूची", "72 HOURS", "पहिलो ७२ घण्टा आफैँ धान्ने तयारी")
    p.chip_row([("4 L", "water / person / day", "पानी / व्यक्ति / दिन"),
                ("3 days", "food & water minimum", "कम्तीमा ३ दिनको खाना-पानी"),
                ("1 bag", "per family, near the exit", "प्रति परिवार, निकास नजिक"),
                ("6 mo", "refresh everything", "हरेक ६ महिनामा जाँच")])
    p.section(1, "Pack these essentials", "यी अत्यावश्यक सामान राख्नुहोस्")
    items = [
        ("Water — sealed bottles", "पानी — सिलबन्द बोतल", "4 L × person × 3 days"),
        ("Dry food: beaten rice, biscuits, nuts", "सुक्खा खाना: चिउरा, बिस्कुट, बदाम", "3 days"),
        ("Torch + spare batteries", "टर्च + अतिरिक्त ब्याट्री", "1 per person"),
        ("Battery / hand-crank radio", "ब्याट्री / ह्यान्ड-क्र्याङ्क रेडियो", None),
        ("First-aid kit & bandages", "प्राथमिक उपचार बाकस र पट्टी", None),
        ("Medicines + prescriptions", "औषधि + प्रिस्क्रिप्सन", "1 week"),
        ("Phone power bank + cable", "पावर बैंक + केबल", "charged"),
        ("Cash in small notes", "नगद — साना नोटमा", None),
        ("Whistle (to signal for help)", "सिठी (मद्दत माग्न)", "1 per person"),
        ("Dust masks", "धुलो मास्क", "N95 if possible"),
        ("Sturdy shoes + work gloves", "बलियो जुत्ता + पन्जा", None),
        ("Warm clothes, blanket, raincoat", "न्यानो लुगा, कम्बल, रेनकोट", None),
        ("Multi-tool / wrench (gas & water)", "बहु-औजार / रेन्च (ग्यास-पानी बन्द गर्न)", None),
        ("Soap, sanitiser, sanitary supplies", "साबुन, स्यानिटाइजर, सरसफाइ सामग्री", None),
        ("Copies of documents (waterproof bag)", "कागजातका प्रतिलिपि (पानी नछिर्ने झोला)", None),
        ("Duct tape + rope + plastic sheet", "टेप + डोरी + प्लास्टिक पाल", None),
    ]
    colw = (W - 2 * M - 8) / 2
    y0 = p.get_y(); y = y0
    for i, (en, ne, hint) in enumerate(items):
        x = M if i < 8 else M + colw + 8
        if i == 8: y = y0
        y = p.check_item(x, y, colw, en, ne, hint)
    p.set_y(y0 + 8 * 10.2 + 2)
    p.note_box("Keep the bag where everyone can grab it in the dark — on the exit route, never locked away.",
               "झोला अँध्यारोमा पनि झट्टै भेटिने ठाउँमा राख्नुहोस् — निकास बाटोमै, कहिल्यै ताल्चा लगाएर होइन।")
    p.footer_band(1, 2)

    p.add_page()
    p.header_band("Go-Bag — Special Needs & Care", "आपत्कालीन झोला — विशेष आवश्यकता", "PAGE 2")
    p.section(2, "Add for your family", "आफ्नो परिवारअनुसार थप्नुहोस्")
    fam = [("Babies: milk formula, bottles, diapers, warm wrap", "शिशु: दूध/फर्मुला, बोतल, डाइपर, न्यानो बेर्ने"),
           ("Elderly: 1 week medicines, spare glasses, hearing-aid batteries, walking aid", "वृद्ध: १ हप्ताको औषधि, अतिरिक्त चस्मा, सुन्ने यन्त्रको ब्याट्री, लट्ठी"),
           ("Disability: device backup power, support network phone list", "अपाङ्गता: यन्त्रको ब्याकअप पावर, सहयोगी सञ्जालको फोन सूची"),
           ("Pets: 3-day food & water, leash or carrier, vet card", "पाल्तु: ३ दिनको खाना-पानी, डोरी वा बाकस, पशु-चिकित्सा कार्ड")]
    y = p.get_y()
    for en, ne in fam:
        y = p.check_item(M, y, W - 2 * M, en, ne)
    p.set_y(y + 2)
    p.section(3, "Documents pouch (copies, not originals)", "कागजात झोला (प्रतिलिपि, सक्कल होइन)")
    docs = [("Citizenship & birth certificates", "नागरिकता र जन्मदर्ता"),
            ("Land / house ownership papers", "जग्गा / घरधनी कागज"),
            ("Insurance policies & bank details", "बीमा र बैंक विवरण"),
            ("Family photo (for identification) + this checklist", "पारिवारिक फोटो (पहिचानका लागि) + यो सूची")]
    y = p.get_y()
    for en, ne in docs:
        y = p.check_item(M, y, W - 2 * M, en, ne)
    p.set_y(y + 2)
    p.section(4, "Every 6 months — refresh day", "हरेक ६ महिनामा — जाँच दिवस")
    p.bullet(1, "Replace water; check food and medicine expiry dates.",
                "पानी फेर्नुहोस्; खाना र औषधिको म्याद जाँच्नुहोस्।")
    p.bullet(2, "Test the torch and radio; recharge the power bank.",
                "टर्च र रेडियो जाँच्नुहोस्; पावर बैंक चार्ज गर्नुहोस्।")
    p.bullet(3, "Update documents, cash and children's sizes (shoes, clothes).",
                "कागजात, नगद र बालबालिकाको साइज (जुत्ता, लुगा) अद्यावधिक गर्नुहोस्।")
    yb = p.get_y() + 1
    p.set_fill_color(*CHIP); p.set_draw_color(255, 214, 200); p.rect(M, yb, W - 2 * M, 14, "FD")
    p.set_xy(M + 4, yb + 2.2); p.set_font("lat", "B", 9); p.set_text_color(*INK)
    p.cell(0, 4.4, "Next refresh date  /  अर्को जाँच मिति :  ________ / ________ / ________")
    p.set_xy(M + 4, yb + 8); p.set_font("dev", "", 8.2); p.set_text_color(*SOFT)
    p.cell(0, 4, "क्यालेन्डरमा लेख्नुहोस् — दसैं र नयाँ वर्ष सम्झने सजिलो जोडी हो।")
    p.footer_band(2, 2)
    p.output(f"{OUT}/eq-emergency-kit-checklist.pdf")

# ================= DOC 2: FAMILY PLAN =================
def family():
    p = Kit(); p.add_page()
    p.header_band("Family Earthquake Plan", "पारिवारिक भूकम्प योजना", "FILL & POST", "भरेर भित्तामा टाँस्नुहोस्")
    # Drop-Cover-Hold row
    y = p.get_y(); bw = (W - 2 * M - 8) / 3
    steps = [("DROP", "घोप्टिनुहोस्", "Hands & knees before it knocks you down", "लड्नुअघि नै हात-घुँडाका भरमा"),
             ("COVER", "ओत लिनुहोस्", "Under a sturdy table; shield head & neck", "बलियो टेबलमुनि; टाउको-घाँटी छोप्ने"),
             ("HOLD ON", "समाउनुहोस्", "Until the shaking fully stops", "हल्लाइ पूरै नरोकिएसम्म")]
    for i, (t1, t2, d1, d2) in enumerate(steps):
        x = M + i * (bw + 4)
        p.set_fill_color(*DARK); p.rect(x, y, bw, 21, "F")
        p.set_fill_color(*ACCENT); p.ellipse(x + 3, y + 3, 6.4, 6.4, "F")
        p.set_xy(x + 3, y + 4.4); p.set_font("lat", "B", 9); p.set_text_color(255, 255, 255)
        p.cell(6.4, 4, str(i + 1), align="C")
        p.set_xy(x + 11, y + 2.6); p.set_font("lat", "B", 10.5); p.cell(bw - 12, 5, t1)
        p.set_xy(x + 11, y + 7.4); p.set_font("dev", "B", 8.6); p.set_text_color(*ACCENT2); p.cell(bw - 12, 4.4, t2)
        p.set_xy(x + 3, y + 12.6); p.set_font("lat", "", 6.9); p.set_text_color(210, 216, 224)
        p.multi_cell(bw - 6, 3.2, d1)
        p.set_xy(x + 3, p.get_y() + 0.2); p.set_font("dev", "", 6.6); p.set_text_color(*FAINT)
        p.multi_cell(bw - 6, 3.2, d2)
    p.set_y(y + 25)
    p.section(1, "Where we meet", "हामी कहाँ भेट्छौं")
    p.fill_line("Meeting point 1 — right outside home (gate, courtyard)", "भेट्ने ठाउँ १ — घरकै बाहिर (गेट, आँगन)")
    p.fill_line("Meeting point 2 — outside the neighbourhood (school, open ground)", "भेट्ने ठाउँ २ — टोलबाहिर (विद्यालय, खुला चौर)")
    p.section(2, "Out-of-area contact", "क्षेत्रबाहिरको सम्पर्क व्यक्ति")
    p.set_font("lat", "", 8); p.set_text_color(*FAINT)
    p.set_xy(M, p.get_y() - 1.5)
    p.cell(0, 4, "When local lines are jammed, everyone reports to this person by SMS.")
    p.set_xy(M, p.get_y() + 3.6); p.set_font("dev", "", 7.6)
    p.cell(0, 4, "स्थानीय लाइन व्यस्त हुँदा सबैले यही व्यक्तिलाई SMS गर्ने।")
    p.set_y(p.get_y() + 5.5)
    p.fill_line("Name & place  /  नाम र ठाउँ", "", w=(W - 2 * M) * 0.55)
    p.set_y(p.get_y() - 15.4)
    p.set_x(M + (W - 2 * M) * 0.62)
    yline = p.get_y()
    p.set_xy(M + (W - 2 * M) * 0.62, yline); p.set_font("lat", "B", 9); p.set_text_color(*INK)
    p.cell(0, 4.4, "Phone  /  फोन")
    p.set_draw_color(*FAINT); p.line(M + (W - 2 * M) * 0.62, yline + 12.4, W - M, yline + 12.4)
    p.set_y(yline + 15.4)
    p.section(3, "Emergency contacts (ICE)", "आपत्कालीन सम्पर्क (ICE)")
    p.table(["Name", "Phone", "Relation", "Blood group"],
            [9, 9, 9, 9], [62, 44, 44, 32],
            ne_headers=["नाम", "फोन", "नाता", "रक्त समूह"])
    p.footer_band(1, 2)

    p.add_page()
    p.header_band("Family Plan — Who Does What", "पारिवारिक योजना — कसले के गर्ने", "PAGE 2")
    p.section(4, "Roles — write real names", "जिम्मेवारी — वास्तविक नाम लेख्नुहोस्")
    p.table(["Task  /  काम", "Who  /  को", "Backup  /  वैकल्पिक"], [9, 9, 9, 9], [92, 45, 45])
    tasks = [("Shut off gas · switch main power OFF", "ग्यास बन्द · मुख्य बिजुली OFF"),
             ("Grab the go-bag & water", "झोला र पानी लिने"),
             ("Help children / elderly / disabled", "बालबालिका / वृद्ध / अपाङ्गता भएकालाई सघाउने"),
             ("First aid & head-count at meeting point", "प्राथमिक उपचार र भेट्ने ठाउँमा गन्ती")]
    ty = p.get_y() - 3 - 36
    for i, (en, ne) in enumerate(tasks):
        p.set_xy(M + 2, ty + i * 9 + 0.6); p.set_font("lat", "B", 7.8); p.set_text_color(*INK)
        p.cell(88, 3.8, en)
        p.set_xy(M + 2, ty + i * 9 + 4.6); p.set_font("dev", "", 7.2); p.set_text_color(*SOFT)
        p.cell(88, 3.6, ne)
    p.set_y(ty + 36 + 5)
    p.section(5, "Utility shut-offs", "मुख्य स्विच / भल्भ")
    p.bullet(1, "GAS — turn the cylinder valve clockwise until snug. If you smell gas: no switches, no flames.",
                "ग्यास — भल्भ घडीको दिशामा कस्नुहोस्। गन्ध आए: स्विच नचलाउने, आगो नबाल्ने।")
    p.bullet(2, "ELECTRICITY — find the main breaker (MCB) today; switch OFF after strong shaking.",
                "बिजुली — मुख्य ब्रेकर (MCB) आजै चिन्नुहोस्; ठूलो हल्लाइपछि OFF गर्नुहोस्।")
    p.bullet(3, "WATER — know the stop-valve near the meter or tank; close it if pipes leak.",
                "पानी — मिटर/ट्याङ्की नजिकको स्टप-भल्भ चिन्नुहोस्; चुहिए बन्द गर्नुहोस्।")
    p.section(6, "Drill log — practise twice a year", "ड्रिल लग — वर्षमा दुईपटक अभ्यास")
    p.table(["Date  /  मिति", "Time to safe spot  /  सुरक्षित ठाउँसम्मको समय", "Fix next  /  के सुधार्ने"],
            [8, 8, 8], [40, 66, 76])
    p.note_box("Post this plan on the fridge. Put a copy in the go-bag and one in each school bag.",
               "यो योजना फ्रिजमा टाँस्नुहोस्। एक प्रति झोलामा र एक-एक प्रति विद्यालय झोलामा राख्नुहोस्।")
    p.footer_band(2, 2)
    p.output(f"{OUT}/eq-family-plan.pdf")

# ================= DOC 3: SCHOOL & COLLEGE =================
def school():
    p = Kit(); p.add_page()
    p.header_band("School & College Earthquake Kit", "विद्यालय तथा कलेज भूकम्प किट", "POST IT", "सूचना पाटीमा टाँस्नुहोस्")
    yb = p.get_y() - 1
    p.set_font("lat", "B", 9); p.set_text_color(*INK); p.set_xy(M, yb)
    p.cell(0, 4.6, "Institution  /  संस्था : ______________________________________     Updated  /  अद्यावधिक : ____________")
    p.set_y(yb + 8)
    p.section(1, "Who does what — real names, plus a deputy", "कसले के गर्ने — वास्तविक नाम र वैकल्पिक")
    p.table(["Role  /  भूमिका", "Name  /  नाम", "Deputy  /  वैकल्पिक"], [10, 10, 10, 10, 10, 10], [92, 45, 45])
    roles = [("Drill leader — runs practice & this plan", "ड्रिल नेता — अभ्यास र योजना चलाउने"),
             ("Sweep — checks rooms & toilets on the way out", "स्वीप — निस्कँदा कोठा-शौचालय जाँच्ने"),
             ("Roll-call — carries register, counts everyone", "हाजिरी — रजिस्टर बोक्ने, सबै गन्ने"),
             ("First aid — carries the kit", "प्राथमिक उपचार — किट बोक्ने"),
             ("Utilities — gas, power, water shut-offs", "युटिलिटी — ग्यास, बिजुली, पानी बन्द"),
             ("Communication — parents & 100/102/1149", "सञ्चार — अभिभावक र १००/१०२/११४९")]
    ty = p.get_y() - 3 - 60
    for i, (en, ne) in enumerate(roles):
        p.set_xy(M + 2, ty + i * 10 + 1); p.set_font("lat", "B", 7.9); p.set_text_color(*INK)
        p.cell(88, 3.8, en)
        p.set_xy(M + 2, ty + i * 10 + 5.2); p.set_font("dev", "", 7.3); p.set_text_color(*SOFT)
        p.cell(88, 3.6, ne)
    p.set_y(ty + 60 + 5)
    p.section(2, "When the shaking starts", "हल्लाइ सुरु हुँदा")
    p.bullet(1, "Everyone: DROP, COVER, HOLD ON — under desks, away from windows. Nobody runs while it shakes.",
                "सबै: घोप्टिने, ओत लिने, समाउने — डेस्कमुनि, झ्यालबाट टाढा। हल्लुन्जेल कोही नदौडने।")
    p.bullet(2, "Corridors or outside: drop by an interior wall or in the open; cover head and neck.",
                "बरन्डा वा बाहिर: भित्री भित्ताछेउ वा खुला ठाउँमा निहुरिने; टाउको-घाँटी छोप्ने।")
    p.bullet(3, "Never use lifts. Doorways are NOT safer — a desk is.",
                "लिफ्ट कहिल्यै प्रयोग नगर्ने। ढोका सुरक्षित होइन — डेस्क हो।")
    p.footer_band(1, 2)

    p.add_page()
    p.header_band("School Kit — After the Shaking", "विद्यालय किट — हल्लाइपछि", "PAGE 2")
    p.section(3, "Evacuate, assemble, account", "निस्कने, भेला हुने, गन्ने")
    p.bullet(1, "Walk out by the practised route — no running, no pushing. Sweep checks rooms; last out closes doors.",
                "अभ्यास गरेकै बाटोबाट हिँडेर निस्कने — नदौडने, नठेल्ने। स्वीपले कोठा जाँच्ने; अन्तिमले ढोका बन्द गर्ने।")
    p.bullet(2, "Assemble and take roll-call against the register. Report anyone missing — nobody re-enters.",
                "भेला भई रजिस्टरअनुसार हाजिरी लिने। हराएको भए खबर गर्ने — कोही भित्र नफर्कने।")
    p.bullet(3, "Treat injuries; call 102 (ambulance), 100 (police), 1149 (disaster). Expect aftershocks — stay clear of walls.",
                "घाइतेको उपचार; १०२ (एम्बुलेन्स), १०० (प्रहरी), ११४९ (विपद्)। पराकम्प आउँछ — पर्खालबाट टाढा।")
    p.bullet(4, "Release students only to listed guardians; log every release with time and signature.",
                "विद्यार्थी सूचीबद्ध अभिभावकलाई मात्र बुझाउने; हरेक बुझाइ समय र सहीसहित लग गर्ने।")
    p.fill_line("Assembly point — open ground, away from buildings & wires", "भेला हुने ठाउँ — भवन र तारबाट टाढा खुला चौर")
    p.section(4, "Drill log — once per term", "ड्रिल लग — हरेक सत्रमा एकपटक")
    p.table(["Date  /  मिति", "Time to assemble  /  भेला हुन लागेको समय", "Fix next  /  के सुधार्ने"],
            [8, 8, 8, 8, 8], [40, 66, 76])
    p.note_box("Children remember drills better than lectures. A calm, practised minute today is the whole point of this page.",
               "बालबालिकाले भाषणभन्दा अभ्यास राम्ररी सम्झन्छन्। आज अभ्यास गरेको शान्त एक मिनेट नै यो पानाको उद्देश्य हो।")
    p.footer_band(2, 2)
    p.output(f"{OUT}/eq-school-college-plan.pdf")

gobag(); family(); school()
print("generated 3 PDFs into", OUT)

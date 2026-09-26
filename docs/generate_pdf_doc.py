#!/usr/bin/env python3
"""Génère docs/MOKENGELI_Documentation.pdf"""
from pathlib import Path
from fpdf import FPDF

OUT = Path(__file__).resolve().parent / "MOKENGELI_Documentation.pdf"
MD = Path(__file__).resolve().parent / "MOKENGELI_Documentation.md"
FONT = r"C:\Windows\Fonts\arial.ttf"
FONT_B = r"C:\Windows\Fonts\arialbd.ttf"


class Doc(FPDF):
    def footer(self):
        self.set_y(-12)
        self.set_font("ArialUni", size=8)
        self.set_text_color(140, 140, 140)
        self.cell(0, 8, f"Page {self.page_no()}/{{nb}}", align="C")


def main():
    text = MD.read_text(encoding="utf-8")
    pdf = Doc(format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(True, 16)
    pdf.add_font("ArialUni", "", FONT)
    pdf.add_font("ArialUni", "B", FONT_B)
    pdf.set_margins(16, 16, 16)
    pdf.add_page()

    # Cover
    pdf.set_fill_color(30, 58, 95)
    pdf.rect(16, 45, 178, 50, "F")
    pdf.set_xy(16, 55)
    pdf.set_font("ArialUni", "B", 26)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(178, 12, "MOKENGELI", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("ArialUni", size=11)
    pdf.cell(178, 8, "Documentation du projet", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(178, 8, "IA predictive anti-fraude — Brainsoft 2026", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(40, 40, 40)
    pdf.set_xy(16, 110)
    pdf.set_font("ArialUni", size=10)
    pdf.multi_cell(
        0,
        6,
        "Plateforme d'intelligence artificielle predictive anti-fraude en temps reel. "
        "Ce document resume le contexte, l'architecture, le scoring (M1/M2/M3, phishing/vishing), "
        "les interfaces et l'API.",
    )
    pdf.add_page()

    in_code = False
    for raw in text.splitlines():
        line = raw.rstrip()
        if line.startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            pdf.set_font("ArialUni", size=8)
            pdf.set_text_color(50, 50, 50)
            if pdf.get_x() > pdf.l_margin:
                pdf.ln()
            pdf.multi_cell(0, 4, line[:110] if len(line) > 110 else line)
            continue
        if not line or line == "---":
            pdf.ln(2)
            continue
        if pdf.get_x() > pdf.l_margin + 1:
            pdf.ln()
        if line.startswith("# "):
            pdf.set_font("ArialUni", "B", 16)
            pdf.set_text_color(15, 40, 70)
            pdf.multi_cell(0, 8, line[2:].strip())
            pdf.ln(2)
        elif line.startswith("## "):
            pdf.set_font("ArialUni", "B", 13)
            pdf.set_text_color(30, 70, 120)
            pdf.ln(2)
            pdf.multi_cell(0, 7, line[3:].strip())
            pdf.ln(1)
        elif line.startswith("### "):
            pdf.set_font("ArialUni", "B", 11)
            pdf.set_text_color(40, 40, 40)
            pdf.ln(1)
            pdf.multi_cell(0, 6, line[4:].strip())
        elif line.startswith("|"):
            cell = " | ".join(p.strip() for p in line.strip("|").split("|"))
            if set(cell.replace("|", "").replace("-", "").replace(" ", "")) == set():
                continue
            pdf.set_font("ArialUni", size=8)
            pdf.set_text_color(35, 35, 35)
            pdf.multi_cell(0, 4.5, cell)
        elif line.startswith("- ") or line.startswith("* "):
            pdf.set_font("ArialUni", size=10)
            pdf.set_text_color(35, 35, 35)
            pdf.multi_cell(0, 5.5, "- " + line[2:].strip())
        else:
            pdf.set_font("ArialUni", size=10)
            pdf.set_text_color(35, 35, 35)
            clean = line.replace("**", "").replace("`", "")
            pdf.multi_cell(0, 5.5, clean)

    pdf.output(str(OUT))
    print(OUT)


if __name__ == "__main__":
    main()

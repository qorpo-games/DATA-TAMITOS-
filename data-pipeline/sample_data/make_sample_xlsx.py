"""Vygeneruje ukážkový CVTI XLSX (sample_data/cvti_sample.xlsx) pre offline test.
Spusti: python3 make_sample_xlsx.py"""
import openpyxl, os
wb = openpyxl.Workbook(); ws = wb.active; ws.title = "CPP_SCPP"
ws.append(["Názov organizácie", "Typ zariadenia", "Kraj", "Mesto", "Adresa", "E-mail"])
for r in [
    ("Centrum poradenstva a prevencie Bratislava II", "CPP", "Bratislavský", "Bratislava", "Vlárska 12", "cpp.ba@example.sk"),
    ("Špecializované CPP pre autizmus Bratislava", "ŠCPP", "Bratislavský", "Bratislava", "Tokajícka 24", "scpp.autizmus@example.sk"),
    ("Centrum poradenstva a prevencie Košice", "CPP", "Košický", "Košice", "Zádielska 1", "cpp.ke@example.sk"),
    ("Centrum poradenstva a prevencie Žilina", "CPP", "Žilinský", "Žilina", "Nám. J. Borodáča 6", "cpp.za@example.sk"),
    ("Špecializované CPP Prešov", "ŠCPP", "Prešovský", "Prešov", "Levočská 7", "scpp.po@example.sk"),
    ("Centrum poradenstva a prevencie Nitra", "CPP", "Nitriansky", "Nitra", "Za Ferenitkou 25", "cpp.nr@example.sk"),
]:
    ws.append(r)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cvti_sample.xlsx")
wb.save(out); print("Saved", out)

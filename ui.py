#!/usr/bin/env python3
import json
import tkinter as tk
from tkinter import ttk
from pathlib import Path
from datetime import datetime
import threading
import subprocess

SCRIPT_DIR = Path(__file__).parent.resolve()
STATE_FILE = SCRIPT_DIR / "state.json"
SCHEDULE_FILE = SCRIPT_DIR / "schedule.json"
PYTHON_EXE = SCRIPT_DIR / ".venv" / "bin" / "python3"
NOTIFIER_SCRIPT = SCRIPT_DIR / "eminus_notifier.py"
PLIST_PATH = Path.home() / "Library" / "LaunchAgents" / "mx.uv.eminus.notifier.plist"

DAYS_MAP = {0: "LUN", 1: "MAR", 2: "MIE", 3: "JUE", 4: "VIE", 5: "SAB", 6: "DOM"}

class Dashboard(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Tareas de Eminus")
        self.geometry("1000x750")
        self.minsize(1000, 750)

        self.logo_art = (
            "▒▒▒▒         ▒▒▒▒\n"
            "▒▒▒▒▒▒▒░░░░░░▒▒▒▒\n"
            " ▒▒░░░▒▒▒░░▒▒▒░▒▒\n"
            " ▒▒▓▒▓▒░░░░▒▒▓█▓▒\n"
            "▒░▒▓▓▓▒▒▒░░░▒▒▓▓▒▒\n"
            "░▒▒░░░░░░▒▒▒▒▒▒▒▒▒\n"
            "░░▒▒▒░░░▒▓▓▓▓▓▓▒▒▒\n"
            "░░░▒░░░░░▒▓▓█▓▒▒▒▒\n"
            "░░░░░░▒▒▒▒▒▓▓▓▓▓▓▒▒\n"
            "░░░░░░░▒▒▓▓▓▓▓▓▓▓\n"
            "░░░░░░▒▒▒▒▓▓▓▓▓▓▓"
        )

        # Paleta Blanca Minimalista Refinada
        self.bg_color = "#FBFBFB"
        self.surface_color = "#FFFFFF"
        self.surface_alt = "#F5F5F5"
        self.border_color = "#EEEEEE"
        self.text_primary = "#1A1A1A"
        self.text_secondary = "#757575"
        self.accent_color = "#000000"
        self.accent_hover = "#333333"
        self.button_text = "#FFFFFF"

        # Estados: Soft Palette
        self.overdue_bg = "#FFEBEE"
        self.overdue_fg = "#B71C1C"
        self.imminent_bg = "#FFF3E0"
        self.imminent_fg = "#E65100"
        self.urgent_bg = "#FEF9E7"
        self.urgent_fg = "#827717"

        # Fuentes
        self.font_family = "Helvetica"
        self.mono_family = "Menlo"

        self.configure(bg=self.bg_color)
        self.eval('tk::PlaceWindow . center')

        self.setup_styles()
        self.setup_ui()

        self.load_state_data()
        self.load_schedule_data()
        self.update_service_btn_ui()
        self.auto_refresh_from_file()

    def setup_styles(self):
        style = ttk.Style(self)
        style.theme_use('clam')

        style.configure("TFrame", background=self.bg_color)
        style.configure("Surface.TFrame", background=self.surface_color)
        style.configure("TLabel", background=self.bg_color, foreground=self.text_primary, font=(self.font_family, 12))
        style.configure("Header.TLabel", font=(self.font_family, 28, "bold"), foreground=self.text_primary)
        style.configure("Subheader.TLabel", font=(self.font_family, 11), foreground=self.text_secondary)
        style.configure("Footer.TLabel", font=(self.font_family, 11), foreground=self.text_secondary, background=self.bg_color)

        # Contador Styles
        style.configure("Counter.TLabel", font=(self.font_family, 10, "bold"), padding=(8, 4))
        style.configure("Overdue.Counter.TLabel", background=self.overdue_bg, foreground=self.overdue_fg)
        style.configure("Imminent.Counter.TLabel", background=self.imminent_bg, foreground=self.imminent_fg)
        style.configure("Urgent.Counter.TLabel", background=self.urgent_bg, foreground=self.urgent_fg)

        style.configure("Primary.TButton",
                        font=(self.font_family, 11, "bold"),
                        foreground=self.button_text,
                        background=self.accent_color,
                        padding=(15, 8),
                        borderwidth=0)
        style.map("Primary.TButton",
                  background=[("active", self.accent_hover), ("disabled", "#CCCCCC")])

        # Service Control Style
        style.configure("Service.TButton",
                        font=(self.font_family, 10),
                        foreground=self.text_secondary,
                        background=self.surface_alt,
                        padding=(10, 5),
                        borderwidth=1)
        style.map("Service.TButton",
                  background=[("active", self.border_color)])

        style.configure("Vertical.TScrollbar",
                        background="#F5F5F5",
                        troughcolor=self.bg_color,
                        bordercolor=self.bg_color,
                        arrowcolor=self.text_secondary)

        style.configure("Treeview",
                        background=self.surface_color,
                        foreground=self.text_primary,
                        rowheight=40,
                        fieldbackground=self.surface_color,
                        font=(self.font_family, 12),
                        borderwidth=0)

        style.map('Treeview',
                  background=[('selected', "#000000")],
                  foreground=[('selected', "#FFFFFF")])

        style.configure("Treeview.Heading",
                        font=(self.font_family, 10, "bold"),
                        background=self.bg_color,
                        foreground=self.text_primary,
                        borderwidth=1,
                        padding=(10, 10))
        style.map("Treeview.Heading", background=[('active', "#F9F9F9")])

    def setup_ui(self):
        self.main_frame = ttk.Frame(self, padding="40 30 40 40")
        self.main_frame.pack(fill=tk.BOTH, expand=True)

        header_frame = ttk.Frame(self.main_frame)
        header_frame.pack(fill=tk.X, pady=(0, 30))

        # Logo y Título
        logo_label = tk.Label(
            header_frame,
            text=self.logo_art,
            justify=tk.LEFT,
            bg=self.bg_color,
            fg=self.text_primary,
            font=(self.mono_family, 9)
        )
        logo_label.pack(side=tk.LEFT, padx=(0, 20))

        title_container = ttk.Frame(header_frame)
        title_container.pack(side=tk.LEFT, fill=tk.Y)

        self.title_label = ttk.Label(title_container, text="Tareas pendientes", style="Header.TLabel")
        self.title_label.pack(anchor=tk.W, pady=(5, 0))

        self.last_check_label = ttk.Label(title_container, text="...", style="Subheader.TLabel")
        self.last_check_label.pack(anchor=tk.W)

        # Service Control Button
        self.service_btn = ttk.Button(header_frame, text="COMPROBANDO...", style="Service.TButton", command=self.toggle_service)
        self.service_btn.pack(side=tk.RIGHT, anchor=tk.CENTER, padx=(15, 0))

        # Counters Frame
        self.counter_frame = ttk.Frame(title_container)
        self.counter_frame.pack(anchor=tk.W, pady=(10, 0))

        self.overdue_count_label = ttk.Label(self.counter_frame, text="0 VENCIDAS", style="Overdue.Counter.TLabel")
        self.overdue_count_label.pack(side=tk.LEFT, padx=(0, 8))

        self.imminent_count_label = ttk.Label(self.counter_frame, text="0 HOY", style="Imminent.Counter.TLabel")
        self.imminent_count_label.pack(side=tk.LEFT, padx=(0, 8))

        self.urgent_count_label = ttk.Label(self.counter_frame, text="0 PRÓXIMAS", style="Urgent.Counter.TLabel")
        self.urgent_count_label.pack(side=tk.LEFT)

        self.refresh_btn = ttk.Button(header_frame, text="ACTUALIZAR", style="Primary.TButton", command=self.run_update_thread)
        self.refresh_btn.pack(side=tk.RIGHT, anchor=tk.CENTER)

        # Middle Content: Schedule + Table
        self.content_frame = ttk.Frame(self.main_frame)
        self.content_frame.pack(fill=tk.BOTH, expand=True)

        # Schedule Section (Lateral o Superior? Vamos con Superior Compacto)
        self.schedule_frame = ttk.Frame(self.content_frame, padding=(0, 0, 0, 20))
        self.schedule_frame.pack(fill=tk.X)

        ttk.Label(self.schedule_frame, text="CLASES DE HOY", font=(self.font_family, 10, "bold"), foreground=self.text_secondary).pack(anchor=tk.W, pady=(0, 8))

        self.schedule_list_frame = ttk.Frame(self.schedule_frame)
        self.schedule_list_frame.pack(fill=tk.X)
        self.no_classes_label = ttk.Label(self.schedule_list_frame, text="No hay clases programadas para hoy.", style="Subheader.TLabel")
        self.no_classes_label.pack(anchor=tk.W)

        # Tabla
        self.table_container = ttk.Frame(self.content_frame)
        self.table_container.pack(fill=tk.BOTH, expand=True)

        columns = ("course", "task", "deadline")
        self.tree = ttk.Treeview(self.table_container, columns=columns, show="headings", selectmode="browse")

        self.tree.heading("course", text="CURSO")
        self.tree.heading("task", text="ACTIVIDAD")
        self.tree.heading("deadline", text="PLAZO")

        self.tree.column("course", width=200, anchor=tk.W)
        self.tree.column("task", width=450, anchor=tk.W)
        self.tree.column("deadline", width=250, anchor=tk.W)

        scrollbar = ttk.Scrollbar(self.table_container, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscroll=scrollbar.set)

        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.tree.tag_configure('even', background=self.surface_alt)
        self.tree.tag_configure('odd', background=self.surface_color)

        self.tree.tag_configure('overdue', foreground=self.overdue_fg, background=self.overdue_bg, font=(self.font_family, 12, "bold"))
        self.tree.tag_configure('imminent', foreground=self.imminent_fg, background=self.imminent_bg, font=(self.font_family, 12, "bold"))
        self.tree.tag_configure('urgent', foreground=self.urgent_fg, background=self.urgent_bg, font=(self.font_family, 12, "bold"))
        self.tree.tag_configure('normal', foreground=self.text_primary)

        self.footer_label = ttk.Label(self.main_frame, text="Listo.", style="Footer.TLabel")
        self.footer_label.pack(anchor=tk.W, pady=(20, 0))

    def load_schedule_data(self):
        # Limpiar clases previas
        for widget in self.schedule_list_frame.winfo_children():
            widget.destroy()

        try:
            if SCHEDULE_FILE.exists():
                with open(SCHEDULE_FILE, "r", encoding="utf-8") as f:
                    schedule = json.load(f)

                now = datetime.now()
                day_name = DAYS_MAP.get(now.weekday())
                today_classes = []

                for course in schedule.get("courses", []):
                    time_str = course.get("schedule", {}).get(day_name)
                    if time_str:
                        today_classes.append({
                            "name": course.get("name", "Curso"),
                            "time": time_str
                        })

                # Ordenar por hora
                today_classes.sort(key=lambda x: x["time"])

                if today_classes:
                    for cls in today_classes:
                        f = ttk.Frame(self.schedule_list_frame, style="Surface.TFrame", padding=(12, 8))
                        f.pack(side=tk.LEFT, padx=(0, 10))

                        name_lbl = tk.Label(f, text=cls["name"][:25] + "..." if len(cls["name"]) > 25 else cls["name"],
                                            font=(self.font_family, 10, "bold"), bg=self.surface_color, fg=self.text_primary)
                        name_lbl.pack(anchor=tk.W)

                        time_lbl = tk.Label(f, text=cls["time"], font=(self.font_family, 9),
                                            bg=self.surface_color, fg=self.text_secondary)
                        time_lbl.pack(anchor=tk.W)
                else:
                    self.no_classes_label = ttk.Label(self.schedule_list_frame, text="No hay clases programadas para hoy.", style="Subheader.TLabel")
                    self.no_classes_label.pack(anchor=tk.W)
        except Exception as e:
            print(f"Error cargando horario: {e}")

    def is_service_loaded(self):
        try:
            # Comprobar si el plist está cargado en launchctl
            res = subprocess.run(["launchctl", "list", "mx.uv.eminus.notifier"], capture_output=True, text=True)
            return res.returncode == 0
        except:
            return False

    def update_service_btn_ui(self):
        if self.is_service_loaded():
            self.service_btn.config(text="DETENER SERVICIO")
            self.footer_label.config(text="Servicio automático activo (cada 15 min).")
        else:
            self.service_btn.config(text="REANUDAR SERVICIO")
            self.footer_label.config(text="Servicio automático detenido. Actualización manual.")

    def toggle_service(self):
        if self.is_service_loaded():
            # Detener
            subprocess.run(["launchctl", "unload", str(PLIST_PATH)], capture_output=True)
        else:
            # Reanudar
            subprocess.run(["launchctl", "load", str(PLIST_PATH)], capture_output=True)
        self.update_service_btn_ui()

    def run_update_thread(self):
        self.refresh_btn.config(state=tk.DISABLED, text="ESPERE...")
        self.footer_label.config(text="Sincronizando con Eminus...")
        thread = threading.Thread(target=self.run_notifier)
        thread.daemon = True
        thread.start()

    def run_notifier(self):
        try:
            subprocess.run(
                [str(PYTHON_EXE), str(NOTIFIER_SCRIPT), "--list"],
                cwd=str(SCRIPT_DIR),
                check=True,
                capture_output=True,
                text=True
            )
        except Exception:
            pass
        finally:
            self.after(0, self.on_update_finished)

    def on_update_finished(self):
        self.refresh_btn.config(state=tk.NORMAL, text="ACTUALIZAR")
        self.footer_label.config(text="Sincronización completada.")
        self.load_state_data()
        self.load_schedule_data()
        self.after(5000, lambda: self.footer_label.config(text="Listo.") if self.refresh_btn['state'] == tk.NORMAL else None)

    def auto_refresh_from_file(self):
        self.load_state_data()
        self.load_schedule_data()
        self.after(30000, self.auto_refresh_from_file)

    def load_state_data(self):
        try:
            if STATE_FILE.exists():
                with open(STATE_FILE, "r", encoding="utf-8") as f:
                    state = json.load(f)

                last_check_str = state.get("last_check")
                if last_check_str:
                    try:
                        dt = datetime.fromisoformat(last_check_str)
                        self.last_check_label.config(text=f"Actualizado: {dt.strftime('%d/%m/%Y %H:%M')}")
                    except:
                        pass

                for item in self.tree.get_children():
                    self.tree.delete(item)

                pending = state.get("pending_activities", [])

                # Inteligencia de Ordenamiento: Vencidas > Inminentes > Urgentes > Resto
                def sort_key(act):
                    if act.get("overdue"): return 0
                    if act.get("imminent"): return 1
                    if act.get("urgent"): return 2
                    return 3

                pending.sort(key=sort_key)

                overdue_c, imminent_c, urgent_c = 0, 0, 0

                if pending:
                    for i, act in enumerate(pending):
                        course_name = act.get("course", "")
                        if " - " in course_name:
                            course_name = course_name.split(" - ")[0]

                        is_overdue = act.get("overdue")
                        is_imminent = act.get("imminent")
                        is_urgent = act.get("urgent")

                        tags = []
                        if is_overdue:
                            tags.append('overdue')
                            overdue_c += 1
                        elif is_imminent:
                            tags.append('imminent')
                            imminent_c += 1
                        elif is_urgent:
                            tags.append('urgent')
                            urgent_c += 1
                        else:
                            tags.append('even' if i % 2 == 0 else 'odd')
                            tags.append('normal')

                        self.tree.insert("", tk.END, values=(
                            course_name.upper(),
                            act.get("title", ""),
                            act.get("deadline", "")
                        ), tags=tuple(tags))
                else:
                    self.tree.insert("", tk.END, values=("", "No hay actividades pendientes", ""), tags=('odd',))

                # Actualizar contadores
                self.overdue_count_label.config(text=f"{overdue_c} VENCIDAS")
                self.imminent_count_label.config(text=f"{imminent_c} HOY")
                self.urgent_count_label.config(text=f"{urgent_c} PRÓXIMAS")

            else:
                self.last_check_label.config(text="Esperando sincronización...")
        except Exception as e:
            print(f"Error cargando estado: {e}")

if __name__ == "__main__":
    app = Dashboard()
    app.mainloop()

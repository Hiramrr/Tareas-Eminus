import json, tkinter as tk, threading, subprocess, os, platform
from tkinter import ttk, messagebox
from pathlib import Path
from datetime import datetime, timedelta

try: import keyring
except ImportError: keyring = None

IS_WINDOWS = platform.system() == "Windows"
SCRIPT_DIR = Path(__file__).parent.resolve()
STATE_FILE, SCHEDULE_FILE = SCRIPT_DIR / "state.json", SCRIPT_DIR / "schedule.json"
PYTHON_EXE = SCRIPT_DIR / ".venv" / ("Scripts" if IS_WINDOWS else "bin") / ("python.exe" if IS_WINDOWS else "python3")
NOTIFIER_SCRIPT = SCRIPT_DIR / "eminus_notifier.py"
PLIST_PATH = Path.home() / "Library" / "LaunchAgents" / "mx.uv.eminus.notifier.plist"
DAYS_MAP = {0: "LUN", 1: "MAR", 2: "MIE", 3: "JUE", 4: "VIE", 5: "SAB", 6: "DOM"}

class LoginDialog(tk.Toplevel):
    def __init__(self, parent, callback):
        super().__init__(parent)
        self.title("Configurar Cuenta"); self.geometry("400x350"); self.resizable(False, False); self.configure(bg="#FFFFFF")
        self.callback, self.font = callback, ("Helvetica", 11)
        self.transient(parent); self.grab_set()
        ttk.Label(self, text="INICIAR SESIÓN", font=("Helvetica", 16, "bold"), background="#FFFFFF").pack(pady=(30, 20))
        container = ttk.Frame(self, padding=20); container.pack(fill=tk.BOTH, expand=True)
        ttk.Label(container, text="MATRÍCULA / USUARIO UV", font=("Helvetica", 9, "bold"), foreground="#757575", background="#FFFFFF").pack(anchor=tk.W)
        self.user_entry = tk.Entry(container, font=self.font, bg="#F5F5F5", relief=tk.FLAT, highlightthickness=1, highlightbackground="#EEEEEE")
        self.user_entry.pack(fill=tk.X, pady=(5, 15), ipady=5)
        ttk.Label(container, text="CONTRASEÑA", font=("Helvetica", 9, "bold"), foreground="#757575", background="#FFFFFF").pack(anchor=tk.W)
        self.pass_entry = tk.Entry(container, font=self.font, show="•", bg="#F5F5F5", relief=tk.FLAT, highlightthickness=1, highlightbackground="#EEEEEE")
        self.pass_entry.pack(fill=tk.X, pady=(5, 20), ipady=5)
        self.status_label = ttk.Label(container, text="", font=("Helvetica", 9), foreground="#B71C1C", background="#FFFFFF"); self.status_label.pack(pady=(0, 10))
        self.login_btn = ttk.Button(container, text="GUARDAR Y VALIDAR", command=self.validate); self.login_btn.pack(fill=tk.X)
        self.eval('tk::PlaceWindow . center')

    def validate(self):
        user, pwd = self.user_entry.get().strip(), self.pass_entry.get().strip()
        if not user or not pwd: self.status_label.config(text="Complete todos los campos"); return
        if not keyring: messagebox.showerror("Error", "Keyring no instalado."); return
        self.login_btn.config(state=tk.DISABLED, text="VALIDANDO...")
        threading.Thread(target=self.run_validation, args=(user, pwd), daemon=True).start()

    def run_validation(self, user, pwd):
        try:
            res = subprocess.run([str(PYTHON_EXE), str(NOTIFIER_SCRIPT), "--validate", "--username", user, "--password", pwd], cwd=str(SCRIPT_DIR), capture_output=True, text=True)
            if "VALID_CREDENTIALS" in res.stdout:
                keyring.set_password('eminus-notifier', 'username', user); keyring.set_password('eminus-notifier', 'password', pwd)
                self.after(0, lambda: self.finish(True))
            else: self.after(0, lambda: self.finish(False))
        except: self.after(0, lambda: self.finish(False))

    def finish(self, success):
        if success: messagebox.showinfo("Éxito", "Cuenta vinculada correctamente."); self.callback(); self.destroy()
        else: self.login_btn.config(state=tk.NORMAL, text="GUARDAR Y VALIDAR"); self.status_label.config(text="Credenciales inválidas.")

class Dashboard(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Tareas Eminus"); self.geometry("1050x850"); self.minsize(1050, 800)
        self.logo_art = "▒▒▒▒         ▒▒▒▒\n▒▒▒▒▒▒▒░░░░░░▒▒▒▒\n ▒▒░░░▒▒▒░░▒▒▒░▒▒\n ▒▒▓▒▓▒░░░░▒▒▓█▓▒\n▒░▒▓▓▓▒▒▒░░░▒▒▓▓▒▒\n░▒▒░░░░░░▒▒▒▒▒▒▒▒▒\n░░▒▒▒░░░▒▓▓▓▓▓▓▒▒▒\n░░░▒░░░░░▒▓▓█▓▒▒▒▒\n░░░░░░▒▒▒▒▒▓▓▓▓▓▓▒▒\n░░░░░░░▒▒▓▓▓▓▓▓▓▓\n░░░░░░▒▒▒▒▓▓▓▓▓▓▓"
        self.bg_color, self.surface_color, self.surface_alt, self.border_color = "#FBFBFB", "#FFFFFF", "#F5F5F5", "#EEEEEE"
        self.text_primary, self.text_secondary, self.accent_color, self.accent_hover, self.button_text = "#1A1A1A", "#757575", "#000000", "#333333", "#FFFFFF"
        self.overdue_bg, self.overdue_fg, self.imminent_bg, self.imminent_fg, self.urgent_bg, self.urgent_fg = "#FFEBEE", "#B71C1C", "#FFF3E0", "#E65100", "#FEF9E7", "#827717"
        self.schedule_day_offset, self.font_family, self.mono_family = 0, "Helvetica", "Menlo"
        self.search_query = tk.StringVar(); self.search_query.trace_add("write", lambda *args: self.load_state_data())
        self.configure(bg=self.bg_color); self.eval('tk::PlaceWindow . center')
        self.setup_styles(); self.setup_ui(); self.load_state_data(); self.load_schedule_data(); self.update_service_btn_ui(); self.update_session_ui(); self.auto_refresh_from_file()

    def setup_styles(self):
        s = ttk.Style(self); s.theme_use('clam')
        s.configure("TFrame", background=self.bg_color); s.configure("Surface.TFrame", background=self.surface_color)
        s.configure("TLabel", background=self.bg_color, foreground=self.text_primary, font=(self.font_family, 12))
        s.configure("Header.TLabel", font=(self.font_family, 28, "bold")); s.configure("Subheader.TLabel", font=(self.font_family, 11), foreground=self.text_secondary)
        s.configure("Footer.TLabel", font=(self.font_family, 11), foreground=self.text_secondary, background=self.bg_color)
        s.configure("Counter.TLabel", font=(self.font_family, 10, "bold"), padding=(8, 4))
        s.configure("Overdue.Counter.TLabel", background=self.overdue_bg, foreground=self.overdue_fg)
        s.configure("Imminent.Counter.TLabel", background=self.imminent_bg, foreground=self.imminent_fg)
        s.configure("Urgent.Counter.TLabel", background=self.urgent_bg, foreground=self.urgent_fg)
        s.configure("Primary.TButton", font=(self.font_family, 11, "bold"), foreground=self.button_text, background=self.accent_color, padding=(15, 8), borderwidth=0)
        s.map("Primary.TButton", background=[("active", self.accent_hover), ("disabled", "#CCCCCC")])
        s.configure("Service.TButton", font=(self.font_family, 10), foreground=self.text_secondary, background=self.surface_alt, padding=(10, 5), borderwidth=1)
        s.map("Service.TButton", background=[("active", self.border_color)])
        s.configure("Day.TButton", font=(self.font_family, 9, "bold"), padding=(10, 4))
        s.configure("Treeview", background=self.surface_color, foreground=self.text_primary, rowheight=40, fieldbackground=self.surface_color, font=(self.font_family, 12), borderwidth=0)
        s.map('Treeview', background=[('selected', "#000000")], foreground=[('selected', "#FFFFFF")])
        s.configure("Treeview.Heading", font=(self.font_family, 10, "bold"), background=self.bg_color, foreground=self.text_primary, borderwidth=1, padding=(10, 10))

    def setup_ui(self):
        self.main_frame = ttk.Frame(self, padding="40 30 40 40"); self.main_frame.pack(fill=tk.BOTH, expand=True)
        h = ttk.Frame(self.main_frame); h.pack(fill=tk.X, pady=(0, 20))
        tk.Label(h, text=self.logo_art, justify=tk.LEFT, bg=self.bg_color, fg=self.text_primary, font=(self.mono_family, 9)).pack(side=tk.LEFT, padx=(0, 20))
        tc = ttk.Frame(h); tc.pack(side=tk.LEFT, fill=tk.Y)
        ttk.Label(tc, text="Tareas pendientes", style="Header.TLabel").pack(anchor=tk.W, pady=(5, 0))
        self.user_name_label = ttk.Label(tc, text="", font=(self.font_family, 12, "bold"), foreground=self.accent_color); self.user_name_label.pack(anchor=tk.W)
        self.last_check_label = ttk.Label(tc, text="...", style="Subheader.TLabel"); self.last_check_label.pack(anchor=tk.W)
        self.service_btn = ttk.Button(h, text="COMPROBANDO...", style="Service.TButton", command=self.toggle_service); self.service_btn.pack(side=tk.RIGHT, anchor=tk.CENTER, padx=(15, 0))
        self.refresh_btn = ttk.Button(h, text="ACTUALIZAR", style="Primary.TButton", command=self.run_update_thread); self.refresh_btn.pack(side=tk.RIGHT, anchor=tk.CENTER)
        sr = ttk.Frame(self.main_frame); sr.pack(fill=tk.X, pady=(0, 20))
        cf = ttk.Frame(sr); cf.pack(side=tk.LEFT)
        self.overdue_count_label = ttk.Label(cf, text="0 VENCIDAS", style="Overdue.Counter.TLabel"); self.overdue_count_label.pack(side=tk.LEFT, padx=(0, 8))
        self.imminent_count_label = ttk.Label(cf, text="0 HOY", style="Imminent.Counter.TLabel"); self.imminent_count_label.pack(side=tk.LEFT, padx=(0, 8))
        self.urgent_count_label = ttk.Label(cf, text="0 PRÓXIMAS", style="Urgent.Counter.TLabel"); self.urgent_count_label.pack(side=tk.LEFT)
        sf = ttk.Frame(sr); sf.pack(side=tk.RIGHT)
        ttk.Label(sf, text="FILTRAR:", font=(self.font_family, 9, "bold"), foreground=self.text_secondary).pack(side=tk.LEFT, padx=(0, 10))
        self.search_entry = tk.Entry(sf, textvariable=self.search_query, font=(self.font_family, 11), bg="#FFFFFF", relief=tk.FLAT, width=25, highlightthickness=1, highlightbackground=self.border_color); self.search_entry.pack(side=tk.LEFT)
        self.workload_container = tk.Frame(self.main_frame, height=4, bg=self.border_color); self.workload_container.pack(fill=tk.X, pady=(0, 25)); self.workload_container.pack_propagate(False)
        self.workload_overdue, self.workload_imminent, self.workload_urgent = tk.Frame(self.workload_container, bg=self.overdue_fg), tk.Frame(self.workload_container, bg=self.imminent_fg), tk.Frame(self.workload_container, bg=self.urgent_fg)
        self.footer_frame = ttk.Frame(self.main_frame); self.footer_frame.pack(side=tk.BOTTOM, fill=tk.X, pady=(10, 0))
        self.footer_label = ttk.Label(self.footer_frame, text="Listo.", style="Footer.TLabel"); self.footer_label.pack(side=tk.LEFT, anchor=tk.W, pady=10)
        self.logout_btn, self.login_btn = ttk.Button(self.footer_frame, text="CERRAR SESIÓN", style="Primary.TButton", command=self.logout), ttk.Button(self.footer_frame, text="INICIAR SESIÓN", style="Primary.TButton", command=self.login)
        self.content_frame = ttk.Frame(self.main_frame); self.content_frame.pack(fill=tk.BOTH, expand=True)
        self.schedule_frame = ttk.Frame(self.content_frame, padding=(0, 0, 0, 20)); self.schedule_frame.pack(fill=tk.X)
        sh = ttk.Frame(self.schedule_frame); sh.pack(fill=tk.X, pady=(0, 10))
        self.schedule_title = ttk.Label(sh, text="CLASES DE HOY", font=(self.font_family, 10, "bold"), foreground=self.text_secondary); self.schedule_title.pack(side=tk.LEFT)
        self.day_toggle_btn = ttk.Button(sh, text="VER MAÑANA", style="Day.TButton", command=self.toggle_schedule_day); self.day_toggle_btn.pack(side=tk.RIGHT)
        self.schedule_list_frame = ttk.Frame(self.schedule_frame); self.schedule_list_frame.pack(fill=tk.X)
        self.table_container = ttk.Frame(self.content_frame); self.table_container.pack(fill=tk.BOTH, expand=True)
        self.tree = ttk.Treeview(self.table_container, columns=("course", "task", "deadline"), show="headings", selectmode="browse")
        self.tree.heading("course", text="CURSO"); self.tree.heading("task", text="ACTIVIDAD"); self.tree.heading("deadline", text="PLAZO")
        self.tree.column("course", width=200); self.tree.column("task", width=450); self.tree.column("deadline", width=250)
        sb = ttk.Scrollbar(self.table_container, orient=tk.VERTICAL, command=self.tree.yview); self.tree.configure(yscroll=sb.set); sb.pack(side=tk.RIGHT, fill=tk.Y); self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.tree.tag_configure('even', background=self.surface_alt); self.tree.tag_configure('odd', background=self.surface_color)
        self.tree.tag_configure('overdue', foreground=self.overdue_fg, background=self.overdue_bg, font=(self.font_family, 12, "bold"))
        self.tree.tag_configure('imminent', foreground=self.imminent_fg, background=self.imminent_bg, font=(self.font_family, 12, "bold"))
        self.tree.tag_configure('urgent', foreground=self.urgent_fg, background=self.urgent_bg, font=(self.font_family, 12, "bold"))

    def toggle_schedule_day(self):
        self.schedule_day_offset = 1 if self.schedule_day_offset == 0 else 0
        self.schedule_title.config(text="CLASES DE HOY" if self.schedule_day_offset == 0 else "CLASES DE MAÑANA")
        self.day_toggle_btn.config(text="VER MAÑANA" if self.schedule_day_offset == 0 else "VER HOY"); self.load_schedule_data()

    def load_schedule_data(self):
        for w in self.schedule_list_frame.winfo_children(): w.destroy()
        try:
            if SCHEDULE_FILE.exists():
                schedule = json.loads(SCHEDULE_FILE.read_text())
                day_name = DAYS_MAP.get((datetime.now() + timedelta(days=self.schedule_day_offset)).weekday())
                target_classes = sorted([{"name": c.get("name", "Curso"), "time": c.get("schedule", {}).get(day_name)} for c in schedule.get("courses", []) if c.get("schedule", {}).get(day_name)], key=lambda x: x["time"])
                if target_classes:
                    for cls in target_classes:
                        f = ttk.Frame(self.schedule_list_frame, style="Surface.TFrame", padding=(12, 8)); f.pack(side=tk.LEFT, padx=(0, 10))
                        tk.Label(f, text=cls["name"][:25]+"...", font=(self.font_family, 10, "bold"), bg=self.surface_color).pack(anchor=tk.W)
                        tk.Label(f, text=cls["time"], font=(self.font_family, 9), bg=self.surface_color, fg=self.text_secondary).pack(anchor=tk.W)
                else: ttk.Label(self.schedule_list_frame, text="No hay clases programadas.", style="Subheader.TLabel").pack(anchor=tk.W)
        except: pass

    def is_service_loaded(self):
        try:
            if IS_WINDOWS: return subprocess.run(["schtasks", "/query", "/tn", "EminusNotifier"], capture_output=True).returncode == 0
            return subprocess.run(["launchctl", "list", "mx.uv.eminus.notifier"], capture_output=True).returncode == 0
        except: return False

    def update_service_btn_ui(self):
        loaded = self.is_service_loaded()
        self.service_btn.config(text="DETENER SERVICIO" if loaded else "REANUDAR SERVICIO")
        self.footer_label.config(text="Servicio automático activo (cada 15 min)." if loaded else "Servicio automático detenido.")

    def update_session_ui(self):
        user, name = keyring.get_password("eminus-notifier", "username") if keyring else None, ""
        try:
            if STATE_FILE.exists(): name = json.loads(STATE_FILE.read_text()).get("user_name", "")
        except: pass
        if user:
            self.login_btn.pack_forget(); self.logout_btn.pack(side=tk.RIGHT, pady=10)
            self.user_name_label.config(text=f"{name.upper()} ({user.upper()})" if name else user.upper())
        else: self.logout_btn.pack_forget(); self.login_btn.pack(side=tk.RIGHT, pady=10); self.user_name_label.config(text="")

    def login(self): LoginDialog(self, self.on_login_success)
    def logout(self):
        if messagebox.askyesno("Cerrar Sesión", "¿Borrar credenciales y datos locales?"):
            if keyring: keyring.delete_password("eminus-notifier", "username"); keyring.delete_password("eminus-notifier", "password")
            if STATE_FILE.exists(): STATE_FILE.unlink()
            if SCHEDULE_FILE.exists(): SCHEDULE_FILE.unlink()
            self.update_session_ui(); self.load_state_data(); self.load_schedule_data(); messagebox.showinfo("Sesión Cerrada", "Datos eliminados.")

    def on_login_success(self): self.update_session_ui(); self.run_update_thread()
    def toggle_service(self):
        if IS_WINDOWS:
            if self.is_service_loaded(): subprocess.run(["schtasks", "/delete", "/tn", "EminusNotifier", "/f"])
            else:
                vbs = SCRIPT_DIR / "run_hidden.vbs"
                if vbs.exists(): subprocess.run(["schtasks", "/create", "/tn", "EminusNotifier", "/tr", f"wscript.exe \"{vbs}\"", "/sc", "minute", "/mo", "15", "/f"])
                else: subprocess.run(["schtasks", "/create", "/tn", "EminusNotifier", "/tr", f"\"{PYTHON_EXE}\" \"{NOTIFIER_SCRIPT}\"", "/sc", "minute", "/mo", "15", "/f"])
        else:
            if self.is_service_loaded(): subprocess.run(["launchctl", "unload", str(PLIST_PATH)])
            else: subprocess.run(["launchctl", "load", str(PLIST_PATH)])
        self.update_service_btn_ui()

    def run_update_thread(self):
        self.refresh_btn.config(state=tk.DISABLED, text="ESPERE..."); self.footer_label.config(text="Sincronizando con Eminus...")
        threading.Thread(target=self.run_notifier, daemon=True).start()

    def run_notifier(self):
        try: subprocess.run([str(PYTHON_EXE), str(NOTIFIER_SCRIPT), "--list"], cwd=str(SCRIPT_DIR), check=True, capture_output=True, text=True)
        except: pass
        finally: self.after(0, self.on_update_finished)

    def on_update_finished(self):
        self.refresh_btn.config(state=tk.NORMAL, text="ACTUALIZAR"); self.footer_label.config(text="Sincronización completada."); self.load_state_data(); self.load_schedule_data(); self.update_session_ui()
        self.after(5000, lambda: self.footer_label.config(text="Listo.") if self.refresh_btn['state'] == tk.NORMAL else None)

    def auto_refresh_from_file(self): self.load_state_data(); self.load_schedule_data(); self.update_session_ui(); self.after(30000, self.auto_refresh_from_file)

    def load_state_data(self):
        try:
            if STATE_FILE.exists():
                state = json.loads(STATE_FILE.read_text()); last = state.get("last_check")
                if last: self.last_check_label.config(text=f"Actualizado: {datetime.fromisoformat(last).strftime('%d/%m/%Y %H:%M')}")
                for i in self.tree.get_children(): self.tree.delete(i)
                all_p = state.get("pending_activities", [])
                query = self.search_query.get().lower()
                pending = sorted([a for a in all_p if query in a.get("course", "").lower() or query in a.get("title", "").lower()], key=lambda x: (0 if x.get("overdue") else (1 if x.get("imminent") else (2 if x.get("urgent") else 3))))
                for i, act in enumerate(pending):
                    c_name = act.get("course", "").split(" - ")[0]
                    tags = ('overdue',) if act.get("overdue") else (('imminent',) if act.get("imminent") else (('urgent',) if act.get("urgent") else (('even' if i%2==0 else 'odd'), 'normal')))
                    self.tree.insert("", tk.END, values=(c_name.upper(), act.get("title", ""), act.get("deadline", "")), tags=tags)
                o_c, i_c, u_c, total = sum(1 for a in all_p if a.get("overdue")), sum(1 for a in all_p if a.get("imminent")), sum(1 for a in all_p if a.get("urgent")), len(all_p)
                self.overdue_count_label.config(text=f"{o_c} VENCIDAS"); self.imminent_count_label.config(text=f"{i_c} HOY"); self.urgent_count_label.config(text=f"{u_c} PRÓXIMAS")
                if total > 0:
                    self.workload_overdue.place(relx=0, rely=0, relwidth=o_c/total, relheight=1); self.workload_imminent.place(relx=o_c/total, rely=0, relwidth=i_c/total, relheight=1); self.workload_urgent.place(relx=(o_c+i_c)/total, rely=0, relwidth=u_c/total, relheight=1)
                else: self.workload_overdue.place_forget(); self.workload_imminent.place_forget(); self.workload_urgent.place_forget()
            else:
                for i in self.tree.get_children(): self.tree.delete(i)
                self.overdue_count_label.config(text="0 VENCIDAS"); self.imminent_count_label.config(text="0 HOY"); self.urgent_count_label.config(text="0 PRÓXIMAS")
                self.workload_overdue.place_forget(); self.workload_imminent.place_forget(); self.workload_urgent.place_forget(); self.last_check_label.config(text="Esperando sincronización...")
        except: pass

if __name__ == "__main__": app = Dashboard(); app.mainloop()

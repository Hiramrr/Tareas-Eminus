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
PYTHON_EXE = SCRIPT_DIR / ".venv" / "bin" / "python3"
NOTIFIER_SCRIPT = SCRIPT_DIR / "eminus_notifier.py"

class Dashboard(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Tareas pendientes")
        self.geometry("900x600")

        # Colores (Inspirados en la interfaz de macOS)
        self.bg_color = "#F5F5F7"
        self.surface_color = "#FFFFFF"
        self.text_primary = "#1D1D1F"
        self.text_secondary = "#86868B"
        self.accent_color = "#007AFF"
        self.accent_hover = "#0056B3"
        self.danger_color = "#FF3B30"

        self.configure(bg=self.bg_color)
        self.eval('tk::PlaceWindow . center')

        self.setup_styles()
        self.setup_ui()

        self.load_state_data()
        self.auto_refresh_from_file()

    def setup_styles(self):
        style = ttk.Style(self)
        style.theme_use('clam')

        # Fuentes principales
        font_family = "Helvetica Neue"

        # Frames
        style.configure("TFrame", background=self.bg_color)
        style.configure("Surface.TFrame", background=self.surface_color)

        # Etiquetas
        style.configure("TLabel", background=self.bg_color, foreground=self.text_primary, font=(font_family, 13))
        style.configure("Surface.TLabel", background=self.surface_color, foreground=self.text_primary)
        style.configure("Header.TLabel", font=(font_family, 26, "bold"), foreground=self.text_primary)
        style.configure("Subheader.TLabel", font=(font_family, 12), foreground=self.text_secondary)

        # Botón
        style.configure("Primary.TButton",
                        font=(font_family, 12, "bold"),
                        foreground="white",
                        background=self.accent_color,
                        padding=(15, 8),
                        borderwidth=0)
        style.map("Primary.TButton",
                  background=[("active", self.accent_hover), ("disabled", "#CCCCCC")],
                  foreground=[("disabled", "#888888")])

        # Tabla (Treeview)
        style.configure("Treeview",
                        background=self.surface_color,
                        foreground=self.text_primary,
                        rowheight=40,
                        fieldbackground=self.surface_color,
                        font=(font_family, 13),
                        borderwidth=0)

        # Color de selección
        style.map('Treeview',
                  background=[('selected', '#E5F1FF')],
                  foreground=[('selected', self.text_primary)])

        # Cabecera de la tabla
        style.configure("Treeview.Heading",
                        font=(font_family, 13, "bold"),
                        background=self.bg_color,
                        foreground=self.text_secondary,
                        borderwidth=0,
                        padding=(5, 10))
        style.map("Treeview.Heading", background=[('active', self.bg_color)])

    def setup_ui(self):
        # Contenedor principal con márgenes amplios
        self.main_frame = ttk.Frame(self, padding="40 30 40 30")
        self.main_frame.pack(fill=tk.BOTH, expand=True)

        # Sección de Cabecera
        self.header_frame = ttk.Frame(self.main_frame)
        self.header_frame.pack(fill=tk.X, pady=(0, 25))

        # Contenedor del título y subtítulo
        title_container = ttk.Frame(self.header_frame)
        title_container.pack(side=tk.LEFT)

        self.title_label = ttk.Label(title_container, text="Tareas pendientes", style="Header.TLabel")
        self.title_label.pack(anchor=tk.W)

        self.last_check_label = ttk.Label(title_container, text="Última revisión: ...", style="Subheader.TLabel")
        self.last_check_label.pack(anchor=tk.W, pady=(4, 0))

        # Botón de acción
        self.refresh_btn = ttk.Button(self.header_frame, text="Actualizar Datos", style="Primary.TButton", command=self.run_update_thread)
        self.refresh_btn.pack(side=tk.RIGHT, anchor=tk.S)

        # Contenedor de la tabla con borde falso
        self.table_border = tk.Frame(self.main_frame, bg="#E5E5EA", bd=1)
        self.table_border.pack(fill=tk.BOTH, expand=True)

        # Tabla
        columns = ("course", "task", "deadline")
        self.tree = ttk.Treeview(self.table_border, columns=columns, show="headings", selectmode="none")
        self.tree.heading("course", text="Materia")
        self.tree.heading("task", text="Actividad")
        self.tree.heading("deadline", text="Vencimiento")

        self.tree.column("course", width=220, anchor=tk.W)
        self.tree.column("task", width=380, anchor=tk.W)
        self.tree.column("deadline", width=220, anchor=tk.W)

        # Barra de desplazamiento suave
        scrollbar = ttk.Scrollbar(self.table_border, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscroll=scrollbar.set)

        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        # Estilos de fila para colores alternos e indicadores de urgencia
        self.tree.tag_configure('even', background="#F9F9FB")
        self.tree.tag_configure('odd', background=self.surface_color)
        self.tree.tag_configure('urgent', foreground=self.danger_color, font=("Helvetica Neue", 13, "bold"))
        self.tree.tag_configure('urgent_even', foreground=self.danger_color, font=("Helvetica Neue", 13, "bold"), background="#F9F9FB")

        # Pie de página (Estado)
        self.footer_frame = ttk.Frame(self.main_frame)
        self.footer_frame.pack(fill=tk.X, pady=(15, 0))

        self.status_icon = ttk.Label(self.footer_frame, text="●", font=("Helvetica Neue", 14), foreground="#34C759") # Punto verde
        self.status_icon.pack(side=tk.LEFT, padx=(0, 5))

        self.footer_label = ttk.Label(self.footer_frame, text="Listo.", style="Subheader.TLabel")
        self.footer_label.pack(side=tk.LEFT, pady=(2, 0))

    def run_update_thread(self):
        self.refresh_btn.config(state=tk.DISABLED, text="Actualizando...")
        self.status_icon.config(foreground="#FF9500") # Punto naranja
        self.footer_label.config(text="Sincronizando con Eminus... Esto puede tardar varios segundos.")
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
        except subprocess.CalledProcessError as e:
            print(f"Error running notifier (Exit code {e.returncode}):\n{e.stderr}")
        except Exception as e:
            print(f"Error running notifier: {e}")
        finally:
            self.after(0, self.on_update_finished)

    def on_update_finished(self):
        self.refresh_btn.config(state=tk.NORMAL, text="Actualizar Datos")
        self.status_icon.config(foreground="#34C759") # Punto verde
        self.footer_label.config(text="Sincronización completada.")
        self.load_state_data()

        # Limpiar mensaje de estado después de 5 segundos
        self.after(5000, lambda: self.footer_label.config(text="Listo.") if self.refresh_btn['state'] == tk.NORMAL else None)

    def auto_refresh_from_file(self):
        self.load_state_data()
        self.after(30000, self.auto_refresh_from_file)

    def load_state_data(self):
        try:
            if STATE_FILE.exists():
                with open(STATE_FILE, "r", encoding="utf-8") as f:
                    state = json.load(f)

                # Actualizar texto de última revisión
                last_check_str = state.get("last_check")
                if last_check_str:
                    try:
                        dt = datetime.fromisoformat(last_check_str)
                        self.last_check_label.config(text=f"Última revisión: {dt.strftime('%d/%m/%Y a las %H:%M')}")
                    except:
                        pass

                # Actualizar tabla
                for item in self.tree.get_children():
                    self.tree.delete(item)

                pending = state.get("pending_activities", [])
                if pending:
                    for i, act in enumerate(pending):
                        course_name = act.get("course", "")
                        # Limpiar nombre del curso (quitar NRC)
                        if " - " in course_name:
                            course_name = course_name.split(" - ")[0]

                        is_even = i % 2 == 0
                        is_urgent = act.get("urgent")

                        if is_urgent and is_even:
                            tags = ('urgent_even',)
                        elif is_urgent:
                            tags = ('urgent',)
                        elif is_even:
                            tags = ('even',)
                        else:
                            tags = ('odd',)

                        self.tree.insert("", tk.END, values=(
                            course_name,
                            act.get("title", ""),
                            act.get("deadline", "")
                        ), tags=tags)
                else:
                    self.tree.insert("", tk.END, values=("", "No hay actividades pendientes", ""), tags=('odd',))
            else:
                self.last_check_label.config(text="Esperando la primera revisión de Eminus...")
        except Exception as e:
            print(f"Error reading state: {e}")

if __name__ == "__main__":
    app = Dashboard()
    app.mainloop()

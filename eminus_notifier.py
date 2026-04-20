#!/usr/bin/env python3
"""
Eminus Notifier — eminus_notifier.py
Login automatico en Eminus 4 UV, detecta cambios y envia notificaciones nativas de macOS.
"""

import argparse
import hashlib
import json
import logging
import os
import re
import subprocess
import sys
import time
import requests
from datetime import datetime, timedelta
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("eminus-notifier")

SCRIPT_DIR = Path(__file__).parent.resolve()
STATE_FILE = SCRIPT_DIR / "state.json"
SCHEDULE_FILE = SCRIPT_DIR / "schedule.json"
BASE_URL = "https://eminus.uv.mx/eminus4"

DAYS_MAP = {0: "LUN", 1: "MAR", 2: "MIE", 3: "JUE", 4: "VIE", 5: "SAB", 6: "DOM"}
MONTHS_ES = {
    "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6,
    "jul": 7, "ago": 8, "sep": 9, "oct": 10, "nov": 11, "dic": 12
}

def parse_eminus_date(date_str):
    """
    Intenta parsear fechas como '20/abr/2026 - 23:45 hrs' o ISO.
    """
    if not date_str or date_str == "Sin fecha":
        return None
    
    try:
        # Formato: 20/abr/2026 - 23:45 hrs
        match = re.search(r"(\d{1,2})/(\w{3})/(\d{4})\s*-\s*(\d{1,2}):(\d{2})", date_str.lower())
        if match:
            day, mon_str, year, hr, mn = match.groups()
            month = MONTHS_ES.get(mon_str, 1)
            return datetime(int(year), month, int(day), int(hr), int(mn))
        
        # Formato ISO u otros
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except Exception:
        return None

def get_time_remaining(end_date):
    if not end_date:
        return ""
    now = datetime.now()
    diff = end_date - now
    
    if diff.total_seconds() < 0:
        return "Vencida"
    
    days = diff.days
    hours = diff.seconds // 3600
    
    if days > 0:
        return f"en {days}d {hours}h"
    return f"en {hours}h"

def load_schedule():
    if SCHEDULE_FILE.exists():
        try:
            data = json.loads(SCHEDULE_FILE.read_text())
            log.info("Horario cargado desde %s (%d cursos)", SCHEDULE_FILE.name, len(data.get("courses", [])))
            return data
        except Exception as e:
            log.warning("No se pudo cargar schedule.json: %s", e)
    else:
        log.warning("No se encontró el archivo de horario: %s", SCHEDULE_FILE)
    return {}

def is_course_allowed(c_name, c_nrc, allowed_courses):
    if not allowed_courses:
        return True
    for allowed in allowed_courses:
        a_nrc = str(allowed.get("nrc", ""))
        if c_nrc and a_nrc == c_nrc:
            return True
        a_name = allowed.get("name", "").upper().replace(" ", "")
        norm_c_name = c_name.upper().replace(" ", "")
        if a_name and a_name in norm_c_name:
            return True
    return False

def check_class_reminders(schedule, state):
    now = datetime.now()
    day_name = DAYS_MAP.get(now.weekday())
    today_str = now.strftime("%Y-%m-%d")
    
    if "sent_reminders" not in state or state.get("last_reminder_date") != today_str:
        state["sent_reminders"] = []
        state["last_reminder_date"] = today_str

    for course in schedule.get("courses", []):
        class_time = course.get("schedule", {}).get(day_name)
        if not class_time: continue
        
        start_str = class_time.split("-")[0]
        try:
            start_time = datetime.strptime(start_str, "%H:%M").replace(
                year=now.year, month=now.month, day=now.day
            )
            diff = (start_time - now).total_seconds() / 60
            reminder_id = f"{course['nrc']}_{start_str}_{today_str}"
            
            if 0 <= diff <= 20 and reminder_id not in state["sent_reminders"]:
                notify(
                    title="Próxima Clase",
                    message=f"{course['name']} comienza a las {start_str}",
                    subtitle=f"NRC: {course['nrc']} | UV",
                    sound="Ping"
                )
                state["sent_reminders"].append(reminder_id)
        except Exception as e:
            log.error("Error horario %s: %s", course["name"], e)

def get_credentials():
    try:
        import keyring
        username = keyring.get_password("eminus-notifier", "username")
        password = keyring.get_password("eminus-notifier", "password")
        if not username or not password:
            log.error("Credenciales no encontradas. Ejecuta setup.sh.")
            sys.exit(1)
        return username, password
    except Exception as exc:
        log.error("Error Keychain: %s", exc)
        sys.exit(1)

def notify(title, message, subtitle="", sound="Glass"):
    try:
        from plyer import notification
        # En macOS combinamos titulo y subtitulo para mejor visualizacion
        full_title = f"{title}: {subtitle}" if subtitle else title
        notification.notify(
            title=full_title,
            message=message,
            app_name="Eminus Notifier",
            timeout=10
        )
        log.info("Notificacion: %s | %s", title, subtitle)
    except Exception as exc:
        log.warning("No se pudo notificar: %s", exc)

def load_state():
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except Exception: pass
    return {}

def save_state(state):
    STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False))

def create_driver():
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from webdriver_manager.chrome import ChromeDriverManager
    chrome_profile = os.path.expanduser("~/.eminus-notifier-chrome-profile")
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--window-size=1280,900")
    opts.add_argument(f"--user-data-dir={chrome_profile}")
    svc = Service(ChromeDriverManager().install(), log_path=os.devnull)
    driver = webdriver.Chrome(service=svc, options=opts)
    driver.implicitly_wait(10)
    return driver

def login(driver, username, password):
    from selenium.common.exceptions import NoSuchElementException
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.support.ui import WebDriverWait
    log.info("Navegando a Eminus 4...")
    driver.get(f"{BASE_URL}/")
    time.sleep(5)
    try:
        driver.find_element(By.TAG_NAME, "m-login")
        is_logged_out = True
    except NoSuchElementException:
        is_logged_out = False
    if is_logged_out:
        log.info("Iniciando login...")
        wait = WebDriverWait(driver, 35)
        try:
            user_field = wait.until(EC.presence_of_element_located((By.NAME, "username")))
            pass_field = driver.find_element(By.NAME, "password")
            user_field.send_keys(username)
            pass_field.send_keys(password)
            driver.execute_script("arguments[0].click();", wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit']"))))
            time.sleep(10)
        except Exception as e:
            log.error("Error login: %s", e)
            return None
    return driver.execute_script("return localStorage.getItem('accessToken');")

def get_courses(token):
    url = "https://eminus.uv.mx/eminusapi8/api/Course/getAllCourses"
    headers = {"Authorization": f"Bearer {token}"}
    try:
        res = requests.get(url, headers=headers, timeout=20)
        return res.json().get("contenido", [])
    except Exception as e:
        log.error("Error cursos: %s", e)
        return []

def get_activities(token, course_id):
    url = f"https://eminus.uv.mx/eminusapi8/api/Activity/getActividadesEstudiante/{course_id}"
    headers = {"Authorization": f"Bearer {token}"}
    try:
        res = requests.get(url, headers=headers, timeout=20)
        return res.json().get("contenido", [])
    except Exception as e:
        log.error("Error actividades curso %s: %s", course_id, e)
        return []

def main():
    parser = argparse.ArgumentParser(description="Eminus Notifier")
    parser.add_argument("--list", action="store_true", help="Listar tareas actuales")
    parser.add_argument("--validate", action="store_true", help="Validar credenciales")
    parser.add_argument("--username", help="Usuario para validar")
    parser.add_argument("--password", help="Contraseña para validar")
    args = parser.parse_args()

    if args.validate:
        if args.username and args.password:
            u, p = args.username, args.password
        else:
            u, p = get_credentials()
        
        log.info("Validando credenciales para %s...", u)
        driver = None
        try:
            driver = create_driver()
            token = login(driver, u, p)
            if token:
                print("VALID_CREDENTIALS")
                sys.exit(0)
            else:
                print("INVALID_CREDENTIALS")
                sys.exit(1)
        except Exception as e:
            log.error("Error durante validación: %s", e)
            print("ERROR_VALIDATING")
            sys.exit(1)
        finally:
            if driver: driver.quit()

    log.info("=" * 55)
    log.info("Eminus Notifier (API Mode) iniciando...")
    username, password = get_credentials()
    state = load_state()
    schedule = load_schedule()
    
    if schedule: check_class_reminders(schedule, state)
    if "courses" not in state: state["courses"] = {}

    driver = None
    try:
        driver = create_driver()
        token = login(driver, username, password)
        if driver: driver.quit(); driver = None
        if not token: return

        courses = get_courses(token)
        if not courses: return

        # Filtrar por periodo mas reciente
        periods = [str(c.get("idPeriodo") or c.get("curso", {}).get("idPeriodo", "")) for c in courses]
        periods = [p for p in periods if p]
        latest_period = max(periods) if periods else None
        if latest_period:
            courses = [c for c in courses if str(c.get("idPeriodo") or c.get("curso", {}).get("idPeriodo", "")) == latest_period]

        allowed_courses = schedule.get("courses", [])
        log.info("Procesando %d cursos...", len(courses))

        pending_for_ui = []

        for c_entry in courses:
            course = c_entry.get("curso", {})
            c_id, c_name = str(course.get("idCurso")), course.get("nombre")
            if not c_id or not c_name: continue
            
            nrc_match = re.search(r"(\d{5})", c_name)
            c_nrc = nrc_match.group(1) if nrc_match else None
            
            if not is_course_allowed(c_name, c_nrc, allowed_courses): continue

            log.info("  Revisando: %s", c_name)
            activities = get_activities(token, c_id)
            if c_id not in state["courses"]: state["courses"][c_id] = {"name": c_name, "seen_activities": []}
            seen = state["courses"][c_id]["seen_activities"]
            
            for act in activities:
                if act.get("entregada") or act.get("fechaEntrega"): continue
                
                a_id = act.get("idActividad")
                a_title = act.get("titulo")
                
                fields = ["fechaTermino", "fechaVencimiento", "fechaFin"]
                a_end_str = next((act.get(f) for f in fields if act.get(f) and act.get(f) != "Sin fecha"), "Sin fecha")
                
                a_end_date = parse_eminus_date(a_end_str)
                time_rem = get_time_remaining(a_end_date)
                
                display_deadline = f"{a_end_str} ({time_rem})" if time_rem else a_end_str
                
                # Calcular niveles de urgencia
                diff_seconds = (a_end_date - datetime.now()).total_seconds() if a_end_date else None
                is_overdue = a_end_date and a_end_date < datetime.now()
                is_imminent = diff_seconds is not None and 0 <= diff_seconds < 86400  # < 24h
                is_urgent = diff_seconds is not None and 86400 <= diff_seconds < 172800 # 24h - 48h

                pending_for_ui.append({
                    "course": c_name,
                    "title": a_title,
                    "deadline": display_deadline,
                    "overdue": is_overdue,
                    "imminent": is_imminent,
                    "urgent": is_urgent
                })

                if args.list:
                    log.info("    [Tarea] %s - Vence: %s", a_title, display_deadline)

                if a_id and a_id not in seen:
                    if is_overdue: prefix = "[VENCIDA] "
                    elif is_imminent: prefix = "[INMINENTE] "
                    elif is_urgent: prefix = "[URGENTE] "
                    else: prefix = ""
                    notify(
                        title=f"Eminus: {c_name}",
                        message=f"{prefix}{a_title}",
                        subtitle=f"Vence: {display_deadline}",
                        sound="Glass" if not is_urgent else "Basso"
                    )
                    seen.append(a_id)
                    hist = state.get("history", [])
                    hist.insert(0, {"label": f"{c_name}: {a_title}", "time": datetime.now().isoformat()})
                    state["history"] = hist[:100]

        state["pending_activities"] = pending_for_ui
        state["last_check"] = datetime.now().isoformat()
        save_state(state)
        log.info("Revisión completada exitosamente.")

    except Exception as exc:
        log.error("Error: %s", exc, exc_info=True)
    finally:
        if driver: driver.quit()

if __name__ == "__main__":
    main()

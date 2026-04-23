import argparse
import hashlib
import json
import logging
import os
import re
import subprocess
import sys
import time
import unicodedata
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
ACTIVITY_DEBUG_LOG = SCRIPT_DIR / "activity_debug.log"
BASE_URL = "https://eminus.uv.mx/eminus4"

DAYS_MAP = {0: "LUN", 1: "MAR", 2: "MIE", 3: "JUE", 4: "VIE", 5: "SAB", 6: "DOM"}
MONTHS_ES = {
    "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6,
    "jul": 7, "ago": 8, "sep": 9, "oct": 10, "nov": 11, "dic": 12
}

def parse_eminus_date(date_str):
    if not date_str or date_str == "Sin fecha":
        return None
    try:
        match = re.search(r"(\d{1,2})/(\w{3})/(\d{4})\s*-\s*(\d{1,2}):(\d{2})", date_str.lower())
        if match:
            day, mon_str, year, hr, mn = match.groups()
            month = MONTHS_ES.get(mon_str, 1)
            return datetime(int(year), month, int(day), int(hr), int(mn))
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except Exception:
        return None

def get_time_remaining(end_date):
    if not end_date: return ""
    now = datetime.now()
    diff = end_date - now
    if diff.total_seconds() < 0: return "Vencida"
    days = diff.days
    hours = diff.seconds // 3600
    if days > 0: return f"en {days}d {hours}h"
    return f"en {hours}h"

def load_schedule():
    if SCHEDULE_FILE.exists():
        try:
            data = json.loads(SCHEDULE_FILE.read_text())
            log.info("Horario cargado desde %s (%d cursos)", SCHEDULE_FILE.name, len(data.get("courses", [])))
            return data
        except Exception as e:
            log.warning("No se pudo cargar schedule.json: %s", e)
    return {}

def normalize_text(value):
    text = str(value or "").strip().lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", "", text)

def extract_course_nrc(course):
    if not isinstance(course, dict):
        return None
    candidate_fields = ["nrc", "idNrc", "claveNrc"]
    for field in candidate_fields:
        raw = course.get(field)
        if raw is None:
            continue
        match = re.search(r"(\d{5})", str(raw))
        if match:
            return match.group(1)
    name_match = re.search(r"(\d{5})", str(course.get("nombre", "")))
    return name_match.group(1) if name_match else None

def is_course_allowed(c_name, c_nrc, allowed_courses):
    if not allowed_courses: return True
    norm_c_name = normalize_text(c_name)
    for allowed in allowed_courses:
        a_nrc = re.search(r"(\d{5})", str(allowed.get("nrc", "")))
        a_nrc = a_nrc.group(1) if a_nrc else ""
        if c_nrc and a_nrc == c_nrc: return True
        a_name = normalize_text(allowed.get("name", ""))
        if a_name and (a_name in norm_c_name or norm_c_name in a_name): return True
    return False

def as_bool(value):
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        normalized = value.strip().lower()
        if not normalized or normalized in {"0", "false", "f", "no", "n", "null", "none", "sin entregar", "pendiente"}:
            return False
        if normalized in {"1", "true", "t", "si", "sí", "y", "yes", "entregada", "entregado", "completada", "completado"}:
            return True
    return bool(value)

def has_delivery_date(value):
    if value is None:
        return False
    if isinstance(value, str):
        normalized = value.strip().lower()
        return normalized not in {"", "null", "none", "sin entrega", "sin entregar", "pendiente"}
    return True

def append_activity_debug(entry):
    try:
        with ACTIVITY_DEBUG_LOG.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception as exc:
        log.warning("No se pudo escribir activity_debug.log: %s", exc)

def get_activity_deadline_str(act):
    if not isinstance(act, dict):
        return "Sin fecha"
    for field in ["fechaTermino", "fechaVencimiento", "fechaFin"]:
        value = act.get(field)
        if value and str(value).strip().lower() != "sin fecha":
            return str(value).strip()
    return "Sin fecha"

def is_activity_in_current_year(act, year):
    deadline_str = get_activity_deadline_str(act)
    if deadline_str == "Sin fecha":
        return True
    deadline_date = parse_eminus_date(deadline_str)
    if deadline_date:
        return deadline_date.year == year
    # Fallback para fechas ISO como "2026-04-15T23:45:00"
    if isinstance(deadline_str, str):
        match = re.match(r"^\s*(\d{4})-", deadline_str)
        if match:
            return int(match.group(1)) == year
    return False

def is_activity_pending(act):
    if not isinstance(act, dict):
        return False
    if as_bool(act.get("entregada")):
        return False
    if as_bool(act.get("completada")):
        return False
    estatus = str(act.get("estatus", "")).strip().lower()
    if estatus in {"entregada", "entregado", "completada", "completado", "calificada", "cerrada", "cerrado", "finalizada", "finalizado", "enviada", "enviado", "revisada", "revisado"}:
        return False
    pending_statuses = {"pendiente", "abierta", "abierto", "activa", "activo", "en progreso", "por entregar", "sin entregar", "no entregada", "no entregado"}
    fecha_entrega = str(act.get("fechaEntrega", "")).strip()
    if has_delivery_date(fecha_entrega):
        # En algunas cuentas fechaEntrega replica la fecha límite.
        # Si coincide con fecha de cierre/vencimiento, no la tomamos como "entregada".
        deadline_values = {
            str(act.get("fechaTermino", "")).strip(),
            str(act.get("fechaVencimiento", "")).strip(),
            str(act.get("fechaFin", "")).strip(),
        }
        looks_like_deadline = bool(fecha_entrega and fecha_entrega in deadline_values)
        if not looks_like_deadline and estatus not in pending_statuses:
            return False
    return True

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
            start_time = datetime.strptime(start_str, "%H:%M").replace(year=now.year, month=now.month, day=now.day)
            diff = (start_time - now).total_seconds() / 60
            reminder_id = f"{course['nrc']}_{start_str}_{today_str}"
            if 0 <= diff <= 20 and reminder_id not in state["sent_reminders"]:
                notify(title="Próxima Clase", message=f"{course['name']} comienza a las {start_str}", subtitle=f"NRC: {course['nrc']} | UV", sound="Ping")
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
        full_title = f"{title}: {subtitle}" if subtitle else title
        notification.notify(title=full_title, message=message, app_name="Eminus Notifier", timeout=10)
        log.info("Notificacion: %s | %s", title, subtitle)
    except Exception as exc:
        log.warning("No se pudo notificar: %s", exc)

def load_state():
    if STATE_FILE.exists():
        try: return json.loads(STATE_FILE.read_text())
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

def sync_miuv_schedule(driver, username, password):
    from bs4 import BeautifulSoup
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.support.ui import WebDriverWait
    log.info("Navegando a MiUV para obtener el horario...")
    driver.get("https://dsia.uv.mx/miuv/escritorio/login.aspx")
    wait = WebDriverWait(driver, 20)
    try:
        user_field = wait.until(EC.presence_of_element_located((By.ID, "txtUser")))
        pass_field = driver.find_element(By.ID, "txtPassword")
        user_field.send_keys(username)
        pass_field.send_keys(password)
        submit_btn = driver.find_element(By.ID, "btnValidacion")
        driver.execute_script("arguments[0].click();", submit_btn)
        time.sleep(5)
        log.info("Accediendo al horario de estudiante...")
        driver.get("https://dsiapes.uv.mx/MiUVestudiantes/portales/estudiantes/szihorc.aspx")
        time.sleep(5)
    except Exception as e:
        log.warning("No se pudo iniciar sesión en MiUV o cargar horario: %s", e)
        return False
    soup = BeautifulSoup(driver.page_source, "html.parser")
    courses = []
    for idx in range(30):
        encabezado = soup.find("div", id=f"content_ctl00_dlHorario_divEncabezadoTile_{idx}")
        if not encabezado: continue
        course = {}
        nombre_span = encabezado.find("span", id=f"content_ctl00_dlHorario_lblCampoExp_{idx}")
        if nombre_span: course["name"] = nombre_span.get_text(strip=True)
        nrc_span = soup.find("span", id=f"content_ctl00_dlHorario_lblCampoNRC_{idx}")
        if nrc_span: course["nrc"] = nrc_span.get_text(strip=True)
        schedule = {}
        dias = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"]
        dias_map = {"Lunes": "LUN", "Martes": "MAR", "Miercoles": "MIE", "Jueves": "JUE", "Viernes": "VIE", "Sabado": "SAB", "Domingo": "DOM"}
        sub_idx = 0
        while True:
            encontro_algo = False
            for dia in dias:
                dia_span = soup.find("span", id=f"content_ctl00_dlHorario_dlHorariosDias_{idx}_lblCampo{dia}_{sub_idx}")
                if dia_span:
                    encontro_algo = True
                    hora = dia_span.get_text(strip=True)
                    if hora and dias_map[dia] not in schedule: schedule[dias_map[dia]] = hora
            if not encontro_algo: break
            sub_idx += 1
        if schedule: course["schedule"] = schedule
        if course.get("name") and course.get("nrc"): courses.append(course)
    if courses:
        output = {"courses": courses}
        SCHEDULE_FILE.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
        log.info("Horario de MiUV guardado exitosamente con %d materias.", len(courses))
        return True
    return False

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
    try:
        data = driver.execute_script("return JSON.stringify(localStorage);")
        import json as j
        storage = j.loads(data)
        full_name = storage.get("userName")
        if full_name:
            state = load_state()
            state["user_name"] = full_name.strip()
            save_state(state)
            log.info("Nombre detectado (Eminus): %s", full_name.strip())
    except: pass
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
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--validate", action="store_true")
    parser.add_argument("--username")
    parser.add_argument("--password")
    args = parser.parse_args()
    if args.validate:
        u, p = (args.username, args.password) if (args.username and args.password) else get_credentials()
        log.info("Validando credenciales para %s...", u)
        driver = None
        try:
            driver = create_driver()
            token = login(driver, u, p)
            print("VALID_CREDENTIALS" if token else "INVALID_CREDENTIALS")
            sys.exit(0 if token else 1)
        except Exception as e:
            log.error("Error validación: %s", e)
            print("ERROR_VALIDATING")
            sys.exit(1)
        finally:
            if driver: driver.quit()
    log.info("=" * 55)
    log.info("Eminus Notifier iniciando...")
    username, password = get_credentials()
    state = load_state()
    schedule = load_schedule()
    if schedule: check_class_reminders(schedule, state)
    if "courses" not in state: state["courses"] = {}
    driver = None
    try:
        driver = create_driver()
        if not schedule or not SCHEDULE_FILE.exists():
            log.info("Sincronizando horario desde MiUV...")
            try:
                if sync_miuv_schedule(driver, username, password): schedule = load_schedule()
            except Exception as e: log.error("Error sincronización: %s", e)
        token = login(driver, username, password)
        if driver: driver.quit(); driver = None
        if not token: return
        courses = get_courses(token)
        if not courses: return
        now_ts = datetime.now().timestamp()
        active_courses = []
        for c in courses:
            course = c.get("curso", {})
            start_epoch = course.get("fechaInicioEpoch")
            end_epoch = course.get("fechaTerminoEpoch")
            if isinstance(start_epoch, (int, float)) and isinstance(end_epoch, (int, float)) and start_epoch > 0 and end_epoch > 0:
                if (start_epoch - (15 * 86400)) <= now_ts <= (end_epoch + (30 * 86400)):
                    active_courses.append(c)
            else:
                # Si Eminus no entrega epochs válidos, no excluimos el curso.
                active_courses.append(c)
        if active_courses: courses = active_courses
        allowed_courses = schedule.get("courses", [])
        if allowed_courses:
            schedule_filtered_courses = []
            for c_entry in courses:
                course = c_entry.get("curso", {})
                c_name = course.get("nombre")
                if not c_name:
                    continue
                c_nrc = extract_course_nrc(course)
                if is_course_allowed(c_name, c_nrc, allowed_courses):
                    schedule_filtered_courses.append(c_entry)
            if schedule_filtered_courses:
                courses = schedule_filtered_courses
                log.info("Filtro de horario aplicado: %d cursos válidos.", len(courses))
            else:
                log.warning("schedule.json no coincide con los cursos actuales; se omite ese filtro para evitar perder pendientes.")
        log.info("Procesando %d cursos...", len(courses))
        pending_for_ui = []
        current_year = datetime.now().year
        for c_entry in courses:
            course = c_entry.get("curso", {})
            c_id, c_name = str(course.get("idCurso")), course.get("nombre")
            if not c_id or not c_name: continue
            activities = get_activities(token, c_id)
            if c_id not in state["courses"]: state["courses"][c_id] = {"name": c_name, "seen_activities": []}
            seen = state["courses"][c_id]["seen_activities"]
            for act in activities:
                if not is_activity_in_current_year(act, current_year):
                    append_activity_debug({
                        "time": datetime.now().isoformat(),
                        "course_id": c_id,
                        "course_name": c_name,
                        "activity_id": act.get("idActividad"),
                        "title": act.get("titulo"),
                        "pending": False,
                        "filtered_by_year": True,
                        "current_year": current_year,
                        "fechaTermino": act.get("fechaTermino"),
                        "fechaVencimiento": act.get("fechaVencimiento"),
                        "fechaFin": act.get("fechaFin"),
                    })
                    continue
                is_pending = is_activity_pending(act)
                append_activity_debug({
                    "time": datetime.now().isoformat(),
                    "course_id": c_id,
                    "course_name": c_name,
                    "activity_id": act.get("idActividad"),
                    "title": act.get("titulo"),
                    "pending": is_pending,
                    "entregada": act.get("entregada"),
                    "completada": act.get("completada"),
                    "estatus": act.get("estatus"),
                    "fechaEntrega": act.get("fechaEntrega"),
                    "fechaTermino": act.get("fechaTermino"),
                    "fechaVencimiento": act.get("fechaVencimiento"),
                    "fechaFin": act.get("fechaFin"),
                    "filtered_by_year": False,
                    "current_year": current_year,
                })
                if not is_pending:
                    continue
                a_id, a_title = act.get("idActividad"), act.get("titulo")
                a_end_str = get_activity_deadline_str(act)
                a_end_date = parse_eminus_date(a_end_str)
                time_rem = get_time_remaining(a_end_date)
                display_deadline = f"{a_end_str} ({time_rem})" if time_rem else a_end_str
                diff_seconds = (a_end_date - datetime.now()).total_seconds() if a_end_date else None
                is_overdue = a_end_date and a_end_date < datetime.now()
                is_imminent = diff_seconds is not None and 0 <= diff_seconds < 86400
                is_urgent = diff_seconds is not None and 86400 <= diff_seconds < 172800
                pending_for_ui.append({"course": c_name, "title": a_title, "deadline": display_deadline, "overdue": is_overdue, "imminent": is_imminent, "urgent": is_urgent})
                if a_id and a_id not in seen:
                    prefix = "[VENCIDA] " if is_overdue else ("[INMINENTE] " if is_imminent else ("[URGENTE] " if is_urgent else ""))
                    notify(title=f"Eminus: {c_name}", message=f"{prefix}{a_title}", subtitle=f"Vence: {display_deadline}", sound="Glass" if not is_urgent else "Basso")
                    seen.append(a_id)
                    hist = state.get("history", [])
                    hist.insert(0, {"label": f"{c_name}: {a_title}", "time": datetime.now().isoformat()})
                    state["history"] = hist[:100]
        state["pending_activities"] = pending_for_ui
        state["last_check"] = datetime.now().isoformat()
        save_state(state)
        log.info("Revisión completada.")
    except Exception as exc: log.error("Error: %s", exc, exc_info=True)
    finally:
        if driver: driver.quit()

if __name__ == "__main__":
    main()

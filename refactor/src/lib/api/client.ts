import { getApiBaseUrl } from "@/lib/runtime-config";

interface ApiOptions extends RequestInit {
  token?: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Global 401 handler — set by AuthProvider to trigger auto-logout
let _unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null): void {
  _unauthorizedHandler = fn;
}

async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;
  const apiBase = getApiBaseUrl();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBase}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      _unauthorizedHandler?.();
    }
    const data = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      data.error || `Errore ${response.status}`,
    );
  }

  return response.json();
}

async function apiUpload<T>(
  endpoint: string,
  file: File,
  token: string,
  extraFields?: Record<string, string>,
): Promise<T> {
  const apiBase = getApiBaseUrl();
  const formData = new FormData();
  formData.append("file", file);
  if (extraFields) {
    for (const [k, v] of Object.entries(extraFields)) {
      formData.append(k, v);
    }
  }

  const response = await fetch(`${apiBase}${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      data.error || `Errore ${response.status}`,
    );
  }

  return response.json();
}

async function apiDownload(
  endpoint: string,
  token: string,
): Promise<{ blob: Blob; filename: string | null; contentType: string | null }> {
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    if (response.status === 401) {
      _unauthorizedHandler?.();
    }
    const data = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      data.error || `Errore ${response.status}`,
    );
  }

  const disposition = response.headers.get("Content-Disposition");
  const filenameMatch = disposition?.match(/filename="?([^"]+)"?/i);
  const filename = filenameMatch?.[1] || null;

  return {
    blob: await response.blob(),
    filename,
    contentType: response.headers.get("Content-Type"),
  };
}

function triggerBlobDownload(
  blob: Blob,
  filename: string,
  mode: "download" | "open" = "download",
) {
  const url = window.URL.createObjectURL(blob);
  if (mode === "open") {
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    return;
  }

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 5_000);
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

// ──── Types ────

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AliasLoginResponse extends LoginResponse {
  aliasedBy: User;
}

export interface User {
  id: number;
  username: string;
  nome: string;
  cognome: string;
  email: string;
  sesso: string;
  roles: string[];
  ruoloLabel: string;
}

export interface MenuItem {
  nome: string;
  descrizione: string;
  url: string;
  icona: string | null;
  abilitato: boolean;
  sottoMenu: MenuItem[] | null;
}

export interface LezioneContextCattedra {
  id: number;
  label: string;
  tipo: string | null;
  supplenza: boolean;
  classe: {
    id: number | null;
    nome: string;
  };
  materia: {
    id: number | null;
    nomeBreve: string | null;
    tipo: string | null;
  };
  alunnoSostegno: {
    id: number;
    cognome: string;
    nome: string;
  } | null;
  flags: {
    isSostegno: boolean;
    isReligione: boolean;
  };
}

export interface LezioneContextClasse {
  id: number;
  label: string;
  anno: number;
  sezione: string;
  gruppo: string | null;
  sede: {
    id: number;
    nome: string;
    nomeBreve: string;
  } | null;
}

export interface LezioneContextData {
  cattedre: LezioneContextCattedra[];
  classiSostituzione: LezioneContextClasse[];
  defaultSelection: {
    mode: "cattedra" | "classe" | null;
    cattedraId: number | null;
    classeId: number | null;
  };
}

export interface RegistroFirmeGroup {
  groupKey: string;
  materia: string;
  argomento: string;
  docenti: string[];
  docentiId: number[];
}

export interface RegistroFirmeLesson {
  ora: number;
  inizio: string | null;
  fine: string | null;
  groups: RegistroFirmeGroup[];
  permissions: {
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
}

export interface RegistroFirmeRow {
  date: string;
  error: string | null;
  lessons: RegistroFirmeLesson[];
  annotazioniCount: number;
  noteCount: number;
}

export interface RegistroFirmeData {
  info: {
    data: string;
    dataLabel: string;
    vista: "G" | "M";
    errore: string | null;
    dataInizio: string;
    dataFine: string;
    dataPrec: string | null;
    dataSucc: string | null;
    classe: {
      id: number;
      nome: string;
    };
    cattedra: {
      id: number;
      tipo: string | null;
    } | null;
    materia: {
      id: number | null;
      nomeBreve: string | null;
      tipo: string | null;
    };
    alunnoSostegno: {
      id: number;
      cognome: string;
      nome: string;
    } | null;
  };
  calendar: {
    festivi: string[];
  };
  alerts: {
    avvisi: number;
    circolari: { id: number; titolo: string }[];
  };
  rows: RegistroFirmeRow[];
  assenti: {
    assenze: string[];
    entrate: string[];
    uscite: string[];
    fuoriClasse: {
      alunno: string;
      oraInizio: string | null;
      oraFine: string | null;
      tipo: string;
      descrizione: string;
    }[];
  };
}

export interface RegistroLezioneCreateContext {
  supported: boolean;
  action: {
    type: "create" | "co_sign" | "transform";
    label: string;
  };
  reason: string | null;
  argomentoDefault?: string;
  attivitaDefault?: string;
  moduloFormativoDefaultId?: number | null;
  endOptions: {
    label: string;
    ora: number;
  }[];
  moduliFormativi: {
    id: number;
    label: string;
  }[];
  materiaOptions: {
    id: number;
    label: string;
  }[];
  substitutionOptions: {
    value: string;
    label: string;
  }[];
  context?: {
    classe: {
      id: number;
      nome: string;
    };
    cattedra: {
      id: number;
      tipo: string | null;
    } | null;
    materia: {
      id: number | null;
      nomeBreve: string | null;
      tipo: string | null;
    };
    data: string;
    ora: number;
    sostituzioneSostegno?: boolean;
  };
}

export interface RegistroLezioneEditContext {
  supported: boolean;
  reason: string | null;
  argomento: string;
  attivita: string;
  moduloFormativoId: number | null;
  moduliFormativi: {
    id: number;
    label: string;
  }[];
  context?: {
    classe: {
      id: number;
      nome: string;
    };
    materia: {
      id: number | null;
      nomeBreve: string | null;
      tipo: string | null;
    };
    data: string;
    ora: number;
  };
}

export interface RegistroAssenzeStudent {
  alunnoId: number;
  cognome: string;
  nome: string;
  displayName: string;
  assenzaId: number | null;
  entrataId: number | null;
  uscitaId: number | null;
  presenzaId: number | null;
  status: "PRESENTE" | "ASSENTE" | "FUORI_CLASSE";
  giustificazioni: {
    assenze: number;
    ritardi: number;
    uscite: number;
    convalide: number;
  };
  ritardiPeriodo: number;
  uscitePeriodo: number;
  entrata: {
    ora: string;
    note: string;
    valido: boolean;
    ritardoBreve: boolean;
  } | null;
  uscita: {
    ora: string;
    note: string;
    valido: boolean;
  } | null;
  fuoriClasse: {
    oraInizio: string | null;
    oraFine: string | null;
    tipo: string;
    descrizione: string;
  } | null;
}

export interface RegistroAssenzeAppelloEntry {
  alunnoId: number;
  displayName: string;
  presenza: "P" | "A";
  ora: string | null;
}

export interface RegistroAssenzeData {
  info: {
    data: string;
    dataLabel: string;
    errore: string | null;
    classe: {
      id: number;
      nome: string;
    };
    cattedra: {
      id: number;
      tipo: string | null;
    } | null;
    materia: {
      id: number | null;
      nomeBreve: string | null;
      tipo: string | null;
    };
    appello: {
      enabled: boolean;
      reason: string | null;
    };
  };
  students: RegistroAssenzeStudent[];
  attendanceDraft: RegistroAssenzeAppelloEntry[];
}

export interface RegistroVoteEntry {
  id: number;
  tipo: "S" | "O" | "P";
  displayTipo: string;
  data: string;
  displayDate: string;
  ordine: number;
  argomento: string;
  visibile: boolean;
  media: boolean;
  voto: number | null;
  votoText: string | null;
  giudizio: string;
}

export interface RegistroVotiStudent {
  alunnoId: number;
  displayName: string;
  dataNascita: string | null;
  bes: string;
  note: string;
  trasferito: boolean;
  averages: {
    S: number | string;
    O: number | string;
    P: number | string;
    T: number | string;
  };
  votes: {
    S: RegistroVoteEntry[];
    O: RegistroVoteEntry[];
    P: RegistroVoteEntry[];
  };
}

export interface RegistroVotiStandardData {
  info: {
    mode: "standard";
    classe: {
      id: number;
      nome: string;
    };
    cattedra: {
      id: number;
      tipo: string | null;
    };
    materia: {
      id: number;
      nomeBreve: string | null;
      tipo: string | null;
    };
    periodo: number;
    canEdit: boolean;
  };
  periods: {
    id: number;
    nome: string;
    inizio: string;
    fine: string;
  }[];
  students: RegistroVotiStudent[];
}

export interface RegistroVotiSupportData {
  info: {
    mode: "support";
    classe: {
      id: number;
      nome: string;
    };
    cattedra: {
      id: number;
      tipo: string | null;
    };
    materia: {
      id: number;
      nomeBreve: string | null;
      tipo: string | null;
    };
    periodo: number;
    canEdit: boolean;
  };
  periods: {
    id: number;
    nome: string;
    inizio: string;
    fine: string;
  }[];
  support: {
    alunno: {
      id: number;
      displayName: string;
      bes: string;
      note: string;
    };
    subjectOptions: {
      id: number;
      label: string;
    }[];
    selectedSubjectId: number | null;
    selectedSubjectLabel: string | null;
    classAverages: {
      subjects: {
        id: number;
        label: string;
      }[];
      students: {
        alunnoId: number;
        displayName: string;
        totalAverage: number | string;
        subjectAverages: {
          subjectId: number;
          label: string;
          value: number | string;
        }[];
      }[];
    };
    votePeriods: {
      label: string;
      subjects: {
        label: string;
        entries: {
          id: number;
          tipo: string;
          displayTipo: string;
          docente: string;
          data: string;
          displayDate: string;
          argomento: string;
          voto: number | null;
          votoText: string | null;
          giudizio: string;
          media: boolean;
        }[];
      }[];
    }[];
  };
}

export type RegistroVotiData = RegistroVotiStandardData | RegistroVotiSupportData;

export interface RegistroNotaEntry {
  id: number;
  tipo: "C" | "I";
  data: string;
  testo: string;
  provvedimento: string | null;
  annullata: string | null;
  docente: string;
  docenteProvvedimento: string | null;
  alunni: string[];
  alunniIds: number[];
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canCancel: boolean;
    canProvvedimento: boolean;
  };
  context: {
    cattedraId: number | null;
    classeId: number;
  };
}

export interface RegistroNoteData {
  info: {
    data: string;
    errore: string | null;
    classe: {
      id: number;
      nome: string;
    };
    cattedra: {
      id: number;
      tipo: string | null;
    } | null;
    materia: {
      id: number | null;
      nomeBreve: string | null;
      tipo: string | null;
    };
    permissions: {
      canAdd: boolean;
    };
  };
  studentOptions: {
    id: number;
    label: string;
  }[];
  notes: RegistroNotaEntry[];
}

export interface CircolareListItem {
  id: number;
  numero: number;
  title: string;
  data: string | null;
  displayDate: string | null;
  firma: boolean;
  status: {
    isRead: boolean;
    isSigned: boolean;
  };
}

export interface CircolareDetail {
  id: number;
  numero: number;
  title: string;
  data: string | null;
  displayDate: string | null;
  firma: boolean;
  author: string;
  status: {
    isRead: boolean;
    isSigned: boolean;
    readAt: string | null;
    signedAt: string | null;
  };
  attachments: {
    id: number;
    title: string;
    filename: string;
    extension: string;
    size: number;
  }[];
  recipient: {
    readAt: string | null;
    signedAt: string | null;
  };
}

export interface CircolariData {
  items: CircolareListItem[];
  pagination: {
    page: number;
    maxPages: number;
  };
  filters: {
    visualizza: string;
    mese: number | null;
    oggetto: string;
  };
}

export interface AvvisoListItem {
  id: number;
  title: string;
  data: string | null;
  displayDate: string | null;
  type: string;
  isRead: boolean;
}

export interface AvvisoDetail {
  id: number;
  title: string;
  data: string | null;
  displayDate: string | null;
  type: string;
  text: string;
  author: string;
  className: string | null;
  subject: string | null;
  status: {
    isRead: boolean;
    readAt: string | null;
  };
  attachments: {
    id: number;
    title: string;
    filename: string;
    extension: string;
    size: number;
  }[];
}

export interface AvvisiData {
  items: AvvisoListItem[];
  pagination: {
    page: number;
    maxPages: number;
  };
  filters: {
    visualizza: string;
    mese: number | null;
    oggetto: string;
  };
}

export interface AgendaMonthData {
  month: string;
  label: string;
  days: {
    day: number;
    flags: {
      attivita: boolean;
      verifiche: boolean;
      compiti: boolean;
      colloqui: boolean;
    };
  }[];
}

export interface AgendaDayData {
  date: string;
  type: "A" | "V" | "P" | "Q";
  items: {
    kind: "avviso" | "colloquio";
    id: number;
    title?: string;
    text?: string;
    type?: string;
    className?: string | null;
    subject?: string | null;
    destinatari?: string;
    classFilters?: string;
    time?: string | null;
    location?: string;
    message?: string;
    student?: string;
    teacher?: string;
  }[];
}

export interface ColloquiTeacher {
  id: number;
  name: string;
  subjects: string[];
}

export interface ColloquiFamilyRequest {
  id: number;
  slotId: number;
  appointmentAt: string | null;
  status: "R" | "C" | "N" | "A";
  statusLabel: string;
  message: string;
  date: string | null;
  displayDate: string | null;
  mode: string;
  location: string;
  teacher: string;
}

export interface ColloquiSlot {
  id: number;
  date: string | null;
  displayDate: string | null;
  startTime: string | null;
  endTime: string | null;
  mode: string;
  location: string;
  capacity: number;
  booked: number;
  available: number;
}

export interface ColloquiFamilyData {
  role: "genitore";
  student: {
    id: number;
    name: string;
    className: string | null;
  };
  teachers: ColloquiTeacher[];
  requests: ColloquiFamilyRequest[];
}

export interface ColloquiTeacherRequest {
  id: number;
  appointmentAt: string | null;
  status: "R" | "C" | "N" | "A";
  statusLabel: string;
  message: string;
  student: string;
  className: string;
  date: string | null;
  displayDate: string | null;
  mode: string;
  location: string;
}

export interface ColloquiTeacherAppointment {
  id: number;
  mode: string;
  date: string | null;
  displayDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string;
  capacity: number;
  booked: number;
  requests: ColloquiTeacherRequest[];
}

export interface ColloquiTeacherHistoryItem {
  id: number;
  enabled: boolean;
  mode: string;
  date: string | null;
  displayDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string;
  requests: {
    appointmentAt: string | null;
    status: "R" | "C" | "N" | "A";
    statusLabel: string;
    student: string;
    className: string;
  }[];
}

export interface ColloquiTeacherData {
  role: "docente";
  pendingCount: number;
  appointments: ColloquiTeacherAppointment[];
  history: ColloquiTeacherHistoryItem[];
}

export interface ColloquiTeacherSlotsData {
  teacher: ColloquiTeacher;
  slots: ColloquiSlot[];
  exhausted: ColloquiSlot[];
  upcoming: ColloquiSlot[];
}

export type ColloquiDashboardData = ColloquiFamilyData | ColloquiTeacherData;

export interface ColloquiManagementItem {
  id: number;
  date: string | null;
  displayDate: string | null;
  startTime: string | null;
  endTime: string | null;
  type: "P" | "D";
  mode: string;
  location: string;
  duration: number;
  capacity: number;
  requestCount: number;
  enabled: boolean;
  canEdit: boolean;
  canToggle: boolean;
}

export interface ColloquiManagementData {
  window: {
    start: string;
    end: string;
  };
  items: ColloquiManagementItem[];
  deleteOptions: {
    disabledCount: number;
    allCount: number;
  };
}

export interface FamigliaDashboardData {
  student: {
    id: number;
    name: string;
    className: string;
    supportsJustification: boolean;
  };
  overview: {
    lessonsToday: number;
    recentVotes: number;
    absenceHours: number;
    notesCount: number;
    pendingJustifications: number;
  };
  lessons: {
    items: {
      ora: number;
      startTime: string;
      endTime: string;
      groups: {
        key: string;
        subject: string;
        argomento: string;
        attivita: string;
        sostegno: string;
      }[];
    }[];
    annotations: string[];
  };
  votes: {
    groups: {
      period: string;
      subjects: {
        subject: string;
        entries: {
          date: string;
          displayDate: string;
          teacher: string;
          type: string;
          argomento: string;
          voto: number | null;
          votoLabel: string;
          giudizio: string;
          media: boolean;
        }[];
      }[];
    }[];
    recent: {
      period: string;
      subject: string;
      date: string;
      displayDate: string;
      teacher: string;
      type: string;
      argomento: string;
      voto: number | null;
      votoLabel: string;
      giudizio: string;
      media: boolean;
    }[];
  };
  absences: {
    stats: {
      assenze: number;
      brevi: number;
      ritardi: number;
      ritardiValidi: number;
      uscite: number;
      usciteValide: number;
      ore: number;
      orePerc: number;
      livello: string;
    };
    highlights: {
      assenza: Record<string, unknown>[];
      ritardo: Record<string, unknown>[];
      uscita: Record<string, unknown>[];
    };
    periods: {
      period: string;
      entries: {
        date: string;
        assenza?: Record<string, unknown> | null;
        ritardo?: Record<string, unknown> | null;
        uscita?: Record<string, unknown> | null;
        fuoriClasse?: Record<string, unknown> | null;
      }[];
    }[];
  };
  notes: {
    groups: {
      period: string;
      entries: {
        date: string;
        displayDate: string;
        type: string;
        text: string;
        teacher: string;
        provvedimento: string;
        provvedimentoDoc: string;
      }[];
    }[];
    recent: {
      period: string;
      date: string;
      displayDate: string;
      type: string;
      text: string;
      teacher: string;
      provvedimento: string;
      provvedimentoDoc: string;
    }[];
  };
  observations: {
    groups: {
      period: string;
      entries: {
        date: string;
        displayDate: string;
        subject: string;
        teacher: string;
        text: string;
      }[];
    }[];
    recent: {
      period: string;
      date: string;
      displayDate: string;
      subject: string;
      teacher: string;
      text: string;
    }[];
  };
}

export interface FamigliaPagelleData {
  student: {
    id: number;
    name: string;
    className: string | null;
  };
  periods: {
    code: string;
    label: string;
    selected: boolean;
    className: string | null;
  }[];
  selectedPeriod: string;
  detail: {
    period: string;
    hasHistoricalData: boolean;
    esito: {
      code: string | null;
      label: string | null;
      media: number | null;
      credito: number | null;
      creditoPrecedente: number | null;
    };
    flags: {
      carenze: boolean;
      noscrutinato: boolean;
      estero: boolean;
      rinviato: boolean;
      cittadinanza: boolean;
    };
    subjects: {
      subjectId: number | null;
      subject: string;
      tipo: string;
      grade: string | number | null;
      assenze: string | number | null;
      debito: unknown;
    }[];
  };
}

export interface RichiestaStatus {
  code: string;
  label: string;
}

export interface RichiestaFamigliaRow {
  id: number;
  moduleId: number;
  sentAt: string | null;
  handledAt: string | null;
  requestDate: string | null;
  document: string;
  attachmentsCount: number;
  status: RichiestaStatus;
  message: string;
  current: boolean;
  canCancel: boolean;
}

export interface RichiestaFamigliaModule {
  id: number;
  name: string;
  kind: "single" | "multiple";
  gestione: boolean;
  create: {
    canCreate: boolean;
    attachmentsRequired: number;
    showRequestDate: boolean;
    gestione: boolean;
    fields: {
      name: string;
      label: string;
      type: "string" | "text" | "int" | "float" | "bool" | "date" | "time";
      required: boolean;
    }[];
  };
  requests: {
    current: RichiestaFamigliaRow[];
    history: RichiestaFamigliaRow[];
  };
}

export interface RichiesteFamigliaData {
  modules: RichiestaFamigliaModule[];
  summary: {
    modules: number;
    currentRequests: number;
    historyRequests: number;
  };
}

export interface RichiestaGestioneRow {
  id: number;
  moduleName: string;
  moduleId: number | null;
  student: string;
  classe: string;
  sentAt: string | null;
  handledAt: string | null;
  requestDate: string | null;
  status: RichiestaStatus;
  message: string;
  attachmentsCount: number;
  canGestire: boolean;
  canRimuovere: boolean;
}

export interface RichiestaGestioneData {
  items: RichiestaGestioneRow[];
  pagination: { page: number; maxPages: number; total: number };
}

export interface RichiestaFamigliaDetail {
  id: number;
  module: {
    id: number | null;
    name: string;
    kind: "single" | "multiple";
    gestione: boolean;
  };
  status: RichiestaStatus;
  sentAt: string | null;
  handledAt: string | null;
  requestDate: string | null;
  message: string;
  document: {
    filename: string;
  };
  attachments: {
    index: number;
    filename: string;
  }[];
  values: {
    key: string;
    value: string;
  }[];
  canCancel: boolean;
}

export interface IstitutoConfig {
  istituto: {
    tipo: string;
    tipoSigla: string;
    nome: string;
    nomeBreve: string;
    email: string;
    pec: string;
    urlSito: string;
    urlRegistro: string;
  } | null;
  annoScolastico: string;
  annoInizio: string;
  annoFine: string;
}

export interface SchoolPublicInfo {
  istituto: {
    tipo: string;
    tipoSigla: string;
    nome: string;
    nomeBreve: string;
    email: string;
    pec: string;
    urlSito: string;
    urlRegistro: string;
  } | null;
  sedePrincipale: {
    nome: string;
    citta: string;
    indirizzo: string;
    cap: string;
    telefono: string;
  } | null;
  annoScolastico: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface Docente {
  id: number;
  nome: string;
  cognome: string;
  sesso: string;
  username: string;
  email: string;
  codiceFiscale: string | null;
  abilitato: boolean;
  spid: boolean;
  dataNascita: string | null;
  comuneNascita: string | null;
  provinciaNascita: string | null;
  citta: string | null;
  provincia: string | null;
  indirizzo: string | null;
  numeriTelefono: string[] | null;
  ultimoAccesso: string | null;
  responsabileBes: boolean;
  rspp: boolean;
  responsabileBesSede: number | null;
  ruolo: string;
  fotoUrl?: string | null;
  rappresentante?: string[];
}

export interface Alunno {
  id: number;
  nome: string;
  cognome: string;
  sesso: string;
  username: string;
  email: string;
  codiceFiscale: string | null;
  abilitato: boolean;
  dataNascita: string | null;
  comuneNascita: string | null;
  citta: string | null;
  indirizzo: string | null;
  bes: string;
  religione: string;
  frequenzaEstero: boolean;
  giustificaOnline: boolean;
  ultimoAccesso: string | null;
  fotoUrl?: string | null;
  classe: { id: number; nome: string } | null;
  rappresentante?: string[];
}

export interface ClasseInfo {
  id: number;
  anno: number;
  sezione: string;
  gruppo: string | null;
  nome: string;
  oreSettimanali: number;
  sede: { id: number; nome: string; nomeBreve: string };
  corso: { id: number; nome: string; nomeBreve: string };
  coordinatore: { id: number; nome: string; cognome: string } | null;
  segretario: { id: number; nome: string; cognome: string } | null;
}

export interface SedeInfo {
  id: number;
  nome: string;
  nomeBreve: string;
  citta: string | null;
  indirizzo1: string | null;
  indirizzo2: string | null;
  telefono: string | null;
  ordinamento: number;
}

export interface MateriaInfo {
  id: number;
  nome: string;
  nomeBreve: string;
  tipo: string;
  tipoLabel: string;
  valutazione: string;
  media: boolean;
  ordinamento: number;
}

export interface CorsoInfo {
  id: number;
  nome: string;
  nomeBreve: string;
}

export interface ModuloFormativoInfo {
  id: number;
  nome: string;
  nomeBreve: string;
  tipo: string;
  tipoLabel: string;
  classi: number[];
}

export interface CattedraInfo {
  id: number;
  docente: { id: number; nome: string; cognome: string };
  classe: { id: number; nome: string };
  materia: { id: number; nome: string; nomeBreve: string };
  attiva: boolean;
  supplenza: boolean;
  tipo: string;
  tipoLabel: string;
}

export interface AtaInfo {
  id: number;
  nome: string;
  cognome: string;
  sesso: string;
  username: string;
  email: string;
  codiceFiscale?: string | null;
  dataNascita?: string | null;
  comuneNascita?: string | null;
  provinciaNascita?: string | null;
  citta?: string | null;
  provincia?: string | null;
  indirizzo?: string | null;
  numeriTelefono?: string[];
  abilitato: boolean;
  tipo: string;
  tipoLabel: string;
  segreteria: boolean;
  sede: { id: number; nomeBreve: string } | null;
  ultimoAccesso: string | null;
  fotoUrl?: string | null;
  rappresentante?: string[];
}

export interface IstitutoDetail {
  id: number;
  tipo: string;
  tipoSigla: string;
  nome: string;
  nomeBreve: string;
  email: string;
  pec: string;
  urlSito: string;
  urlRegistro: string;
  firmaPreside: string;
  emailAmministratore: string;
  emailNotifiche: string;
  logoUrl?: string | null;
  indirizzo?: string | null;
  cap?: string | null;
  citta?: string | null;
  provincia?: string | null;
  telefono?: string | null;
  codiceMeccanografico?: string | null;
}

export interface FestivitaInfo {
  id: number;
  data: string;
  descrizione: string;
  tipo: string;
  tipoLabel: string;
  sede: { id: number; nomeBreve: string } | null;
}

export interface OrarioInfo {
  id: number;
  nome: string;
  inizio: string;
  fine: string;
  sede: { id: number; nomeBreve: string };
  scansioni: {
    id: number;
    giorno: number;
    ora: number;
    inizio: string;
    fine: string;
    durata: number;
  }[];
}

export interface OrarioLezione {
  id: number;
  giorno: number;
  ora: number;
  cattedra: {
    id: number;
    docente: { id: number; cognome: string; nome: string };
    materia: { id: number; nomeBreve: string; nome: string };
  };
}

export interface ScrutinioInfo {
  id: number | null;
  periodo: string;
  periodoLabel: string;
  data: string | null;
  dataProposte: string | null;
  classiVisibili: Record<string, string | null>;
}

export interface ModuloInfo {
  id: number;
  nome: string;
  abilitata: boolean;
  unica: boolean;
  gestione: boolean;
  tipo: string;
  allegati: number;
  richiedenti: string[];
  destinatari: string[];
  sede: { id: number; nomeBreve: string } | null;
}

export interface Parametro {
  id: number;
  parametro: string;
  valore: string;
  categoria: string;
  descrizione: string;
}

export interface DocenteOption {
  id: number;
  label: string;
}

export interface CoordinatoreInfo {
  classe: { id: number; nome: string };
  coordinatore: { id: number; cognome: string; nome: string } | null;
}

export interface SegretarioInfo {
  classe: { id: number; nome: string };
  segretario: { id: number; cognome: string; nome: string } | null;
}

export interface UtenteSearch {
  id: number;
  username: string;
  nome: string;
  cognome: string;
  email: string;
  ruolo: string;
}

export interface RappresentanteGenitore {
  id: number;
  nome: string;
  cognome: string;
  email: string;
  rappresentante: string[];
  alunno: {
    id: number;
    cognome: string;
    nome: string;
    classe: { id: number; nome: string } | null;
  } | null;
}

export interface SegreteriaAlunnoRow {
  id: number;
  displayName: string;
  classeId: number;
  classeName: string;
  assenze: number;
  assenzeNonGiust: number;
  ritardi: number;
  ritardiNonGiust: number;
  uscite: number;
}

export interface SegreteriaAssenzeData {
  items: SegreteriaAlunnoRow[];
  pagination: { page: number; maxPages: number; total: number };
}

export interface SegreteriaGenitore {
  id: number;
  displayName: string;
  username?: string;
  email: string;
  telefoni: string[];
  spid: boolean;
  ultimoAccesso: string | null;
}

export interface SegreteriaGenitoriRow {
  id: number;
  displayName: string;
  classeName: string;
  genitori: SegreteriaGenitore[];
}

export interface SegreteriaGenitoriData {
  items: SegreteriaGenitoriRow[];
  pagination: { page: number; maxPages: number; total: number };
}

export interface SegreteriaGenitoreCreatePayload {
  nome: string;
  cognome: string;
  email: string;
  username?: string;
  sesso?: "M" | "F";
  telefoni?: string[];
}

export interface SegreteriaScrutinioPeriodo {
  scrutinioId: number;
  periodo: string;
  label: string;
  data: string | null;
}

export interface SegreteriaScrutiniRow {
  id: number;
  displayName: string;
  classeName: string;
  scrutini: SegreteriaScrutinioPeriodo[];
}

export interface SegreteriaScrutiniData {
  items: SegreteriaScrutiniRow[];
  pagination: { page: number; maxPages: number; total: number };
}

export interface SegreteriaAlunnoDetail {
  alunno: { id: number; displayName: string; classeName: string | null };
  totali: {
    assenze: number;
    assenzeNonGiust: number;
    ritardi: number;
    ritardiNonGiust: number;
    uscite: number;
  };
  mesi: {
    mese: string;
    assenze: number;
    assenzeNonGiust: number;
    ritardi: number;
    ritardiNonGiust: number;
    uscite: number;
  }[];
}

export interface DocumentoAllegato {
  id: number;
  titolo: string;
  nome: string;
  estensione: string;
  dimensione: number;
}

export interface DocumentoInfo {
  id: number;
  tipo: string;
  titolo: string;
  data: string | null;
  canDelete: boolean;
  allegati: DocumentoAllegato[];
}

export interface DocumentoSlot {
  classeId: number;
  classeName: string;
  classeAnno: number;
  sedeNome: string;
  materiaId?: number;
  materiaNome?: string;
  alunnoId?: number | null;
  alunnoName?: string | null;
  documento: DocumentoInfo | null;
}

export interface DocumentoBesRow {
  alunnoId: number;
  alunnoName: string;
  classeId: number;
  classeName: string;
  documenti: DocumentoInfo[];
}

// ──── API methods ────

export const publicApi = {
  info: () =>
    apiRequest<SchoolPublicInfo>("/api/public/info"),
};

export const api = {
  auth: {
    login: (username: string, password: string) =>
      apiRequest<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
    me: (token: string) =>
      apiRequest<{ user: User }>("/api/auth/me", { token }),
    recovery: (email: string) =>
      apiRequest<{ message: string }>("/api/auth/recovery", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
  },

  menu: {
    list: (token: string) =>
      apiRequest<{ menu: MenuItem[] }>("/api/menu", { token }),
  },

  lezioni: {
    context: (token: string) =>
      apiRequest<{ data: LezioneContextData }>("/api/lezioni/contesto", { token }),
  },

  registro: {
    firme: (
      token: string,
      params: {
        cattedraId?: number;
        classeId?: number;
        data: string;
        vista: "G" | "M";
      },
    ) =>
      apiRequest<{ data: RegistroFirmeData }>(`/api/registro/firme${buildQuery(params)}`, {
        token,
      }),
    createContext: (
      token: string,
      params: {
        cattedraId?: number;
        classeId?: number;
        data: string;
        ora: number;
      },
    ) =>
      apiRequest<{ data: RegistroLezioneCreateContext }>(
        `/api/registro/lezioni/creazione${buildQuery(params)}`,
        { token },
      ),
    createLezione: (
      token: string,
      data: {
        cattedraId?: number;
        classeId?: number;
        data: string;
        ora: number;
        fineOra: number;
        argomento?: string;
        attivita?: string;
        moduloFormativoId?: number | null;
        materiaId?: number | null;
        tipoSostituzione?: string | null;
      },
    ) =>
      apiRequest<{ message: string; data: { created: number; lessonIds: number[] } }>(
        "/api/registro/lezioni",
        {
          token,
          method: "POST",
          body: JSON.stringify(data),
        },
      ),
    editContext: (
      token: string,
      params: {
        cattedraId?: number;
        classeId?: number;
        data: string;
        ora: number;
      },
    ) =>
      apiRequest<{ data: RegistroLezioneEditContext }>(
        `/api/registro/lezioni/modifica${buildQuery(params)}`,
        { token },
      ),
    updateLezione: (
      token: string,
      data: {
        cattedraId?: number;
        classeId?: number;
        data: string;
        ora: number;
        argomento?: string;
        attivita?: string;
        moduloFormativoId?: number | null;
      },
    ) =>
      apiRequest<{ message: string; data: { lessonId: number } }>(
        "/api/registro/lezioni",
        {
          token,
          method: "PUT",
          body: JSON.stringify(data),
        },
      ),
    deleteContext: (
      token: string,
      params: {
        cattedraId?: number;
        classeId?: number;
        data: string;
        ora: number;
      },
    ) =>
      apiRequest<{ data: { supported: boolean; isShared: boolean; message: string } }>(
        `/api/registro/lezioni/cancella${buildQuery(params)}`,
        { token },
      ),
    deleteLezione: (
      token: string,
      data: {
        cattedraId?: number;
        classeId?: number;
        data: string;
        ora: number;
      },
    ) =>
      apiRequest<{ message: string; data: { deletedLessonId: number; deletedOnlySignature: boolean } }>(
        "/api/registro/lezioni",
        {
          token,
          method: "DELETE",
          body: JSON.stringify(data),
        },
      ),
    assenzeQuadro: (
      token: string,
      params: {
        cattedraId?: number;
        classeId?: number;
        data: string;
      },
    ) =>
      apiRequest<{ data: RegistroAssenzeData }>(
        `/api/registro/assenze/quadro${buildQuery(params)}`,
        { token },
      ),
    salvaAppello: (
      token: string,
      data: {
        cattedraId?: number;
        classeId?: number;
        data: string;
        entries: {
          alunnoId: number;
          presenza: "P" | "A";
        }[];
      },
    ) =>
      apiRequest<{ message: string; data: { updated: number } }>(
        "/api/registro/assenze/appello",
        {
          token,
          method: "POST",
          body: JSON.stringify(data),
        },
      ),
    toggleAssenza: (
      token: string,
      data: {
        cattedraId?: number;
        classeId?: number;
        data: string;
        alunnoId: number;
      },
    ) =>
      apiRequest<{ message: string; data: { alunnoId: number } }>(
        "/api/registro/assenze/assenza",
        {
          token,
          method: "POST",
          body: JSON.stringify(data),
        },
      ),
    salvaEntrata: (
      token: string,
      data: {
        cattedraId?: number;
        classeId?: number;
        data: string;
        alunnoId: number;
        ora: string;
        valido?: boolean;
        note?: string;
      },
    ) =>
      apiRequest<{ message: string; data: { alunnoId: number } }>(
        "/api/registro/assenze/entrata",
        {
          token,
          method: "PUT",
          body: JSON.stringify(data),
        },
      ),
    deleteEntrata: (
      token: string,
      data: {
        cattedraId?: number;
        classeId?: number;
        data: string;
        alunnoId: number;
      },
    ) =>
      apiRequest<{ message: string; data: { alunnoId: number } }>(
        "/api/registro/assenze/entrata",
        {
          token,
          method: "DELETE",
          body: JSON.stringify(data),
        },
      ),
    salvaUscita: (
      token: string,
      data: {
        cattedraId?: number;
        classeId?: number;
        data: string;
        alunnoId: number;
        ora: string;
        valido?: boolean;
        note?: string;
      },
    ) =>
      apiRequest<{ message: string; data: { alunnoId: number } }>(
        "/api/registro/assenze/uscita",
        {
          token,
          method: "PUT",
          body: JSON.stringify(data),
        },
      ),
    deleteUscita: (
      token: string,
      data: {
        cattedraId?: number;
        classeId?: number;
        data: string;
        alunnoId: number;
      },
    ) =>
      apiRequest<{ message: string; data: { alunnoId: number } }>(
        "/api/registro/assenze/uscita",
        {
          token,
          method: "DELETE",
          body: JSON.stringify(data),
        },
      ),
    salvaFuoriClasse: (
      token: string,
      data: {
        cattedraId?: number;
        classeId?: number;
        data: string;
        alunnoId: number;
        oraTipo: "G" | "F" | "I";
        oraInizio?: string;
        oraFine?: string;
        tipo: "P" | "M" | "S" | "E";
        descrizione: string;
      },
    ) =>
      apiRequest<{ message: string; data: { alunnoId: number } }>(
        "/api/registro/assenze/fuori-classe",
        {
          token,
          method: "PUT",
          body: JSON.stringify(data),
        },
      ),
    deleteFuoriClasse: (
      token: string,
      data: {
        cattedraId?: number;
        classeId?: number;
        data: string;
        alunnoId: number;
      },
    ) =>
      apiRequest<{ message: string; data: { alunnoId: number } }>(
        "/api/registro/assenze/fuori-classe",
        {
          token,
          method: "DELETE",
          body: JSON.stringify(data),
        },
      ),
    noteList: (
      token: string,
      params: {
        cattedraId?: number;
        classeId?: number;
        data: string;
      },
    ) =>
      apiRequest<{ data: RegistroNoteData }>(
        `/api/registro/note${buildQuery(params)}`,
        { token },
      ),
    createNote: (
      token: string,
      data: {
        cattedraId?: number;
        classeId?: number;
        data: string;
        tipo: "C" | "I";
        testo: string;
        alunnoIds?: number[];
      },
    ) =>
      apiRequest<{ message: string; data: { id: number } }>(
        "/api/registro/note",
        {
          token,
          method: "POST",
          body: JSON.stringify(data),
        },
      ),
    updateNote: (
      token: string,
      data: {
        id: number;
        tipo: "C" | "I";
        testo: string;
        alunnoIds?: number[];
      },
    ) =>
      apiRequest<{ message: string; data: { id: number } }>(
        "/api/registro/note",
        {
          token,
          method: "PUT",
          body: JSON.stringify(data),
        },
      ),
    deleteNote: (
      token: string,
      id: number,
    ) =>
      apiRequest<{ message: string; data: { id: number } }>(
        "/api/registro/note",
        {
          token,
          method: "DELETE",
          body: JSON.stringify({ id }),
        },
      ),
    cancelNote: (token: string, id: number) =>
      apiRequest<{ message: string; data: { id: number } }>(
        `/api/registro/note/${id}/annulla`,
        {
          token,
          method: "PATCH",
        },
      ),
    setProvvedimento: (
      token: string,
      id: number,
      provvedimento: string,
    ) =>
      apiRequest<{ message: string; data: { id: number } }>(
        `/api/registro/note/${id}/provvedimento`,
        {
          token,
          method: "PATCH",
          body: JSON.stringify({ provvedimento }),
        },
      ),
  },

  voti: {
    quadro: (
      token: string,
      params: {
        cattedraId: number;
        periodo?: number;
        materiaId?: number;
      },
    ) =>
      apiRequest<{ data: RegistroVotiData }>(
        `/api/voti/quadro${buildQuery(params)}`,
        { token },
      ),
    create: (
      token: string,
      data: {
        cattedraId: number;
        alunnoId: number;
        tipo: "S" | "O" | "P";
        data: string;
        visibile: boolean;
        media: boolean;
        voto?: number | null;
        giudizio?: string;
        argomento?: string;
        confirmAbsent?: boolean;
        materiaId?: number | null;
      },
    ) =>
      apiRequest<{ message: string; data: { id: number } }>("/api/voti", {
        token,
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (
      token: string,
      data: {
        id: number;
        data: string;
        visibile: boolean;
        media: boolean;
        voto?: number | null;
        giudizio?: string;
        argomento?: string;
        confirmAbsent?: boolean;
      },
    ) =>
      apiRequest<{ message: string; data: { id: number } }>("/api/voti", {
        token,
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: number) =>
      apiRequest<{ message: string; data: { id: number } }>("/api/voti", {
        token,
        method: "DELETE",
        body: JSON.stringify({ id }),
      }),
  },

  comunicazioni: {
    circolari: (
      token: string,
      params?: { visualizza?: string; mese?: number; oggetto?: string; pagina?: number },
    ) =>
      apiRequest<{ data: CircolariData }>(`/api/circolari${buildQuery(params || {})}`, { token }),
    circolare: (token: string, id: number) =>
      apiRequest<{ data: CircolareDetail }>(`/api/circolari/${id}`, { token }),
    firmaCircolare: (token: string, id: number) =>
      apiRequest<{ message: string; data: CircolareDetail["status"] }>(`/api/circolari/${id}/firma`, {
        token,
        method: "PATCH",
      }),
    downloadCircolareAttachment: async (
      token: string,
      id: number,
      attachmentId: number,
      mode: "download" | "open" = "download",
    ) => {
      const file = await apiDownload(
        `/api/circolari/${id}/attachments/${attachmentId}${buildQuery({ mode })}`,
        token,
      );
      triggerBlobDownload(
        file.blob,
        file.filename || `circolare-${id}-${attachmentId}`,
        mode,
      );
    },
    avvisi: (
      token: string,
      params?: { visualizza?: string; mese?: number; oggetto?: string; pagina?: number },
    ) =>
      apiRequest<{ data: AvvisiData }>(`/api/avvisi${buildQuery(params || {})}`, { token }),
    avviso: (token: string, id: number) =>
      apiRequest<{ data: AvvisoDetail }>(`/api/avvisi/${id}`, { token }),
    readAvviso: (token: string, id: number) =>
      apiRequest<{ message: string; data: AvvisoDetail["status"] }>(`/api/avvisi/${id}/read`, {
        token,
        method: "PATCH",
      }),
    downloadAvvisoAttachment: async (
      token: string,
      id: number,
      attachmentId: number,
      mode: "download" | "open" = "download",
    ) => {
      const file = await apiDownload(
        `/api/avvisi/${id}/attachments/${attachmentId}${buildQuery({ mode })}`,
        token,
      );
      triggerBlobDownload(
        file.blob,
        file.filename || `avviso-${id}-${attachmentId}`,
        mode,
      );
    },
    agendaMonth: (token: string, mese: string) =>
      apiRequest<{ data: AgendaMonthData }>(`/api/agenda${buildQuery({ mese })}`, { token }),
    agendaDay: (token: string, date: string, type: "A" | "V" | "P" | "Q") =>
      apiRequest<{ data: AgendaDayData }>(`/api/agenda/${date}/${type}`, { token }),
  },

  colloqui: {
    dashboard: (token: string) =>
      apiRequest<{ data: ColloquiDashboardData }>("/api/colloqui", { token }),
    teacherSlots: (token: string, teacherId: number) =>
      apiRequest<{ data: ColloquiTeacherSlotsData }>(`/api/colloqui/docenti/${teacherId}/slots`, { token }),
    book: (token: string, docenteId: number, colloquioId: number) =>
      apiRequest<{ message: string; data: ColloquiFamilyRequest }>("/api/colloqui/prenotazioni", {
        token,
        method: "POST",
        body: JSON.stringify({ docenteId, colloquioId }),
      }),
    cancel: (token: string, requestId: number) =>
      apiRequest<{ message: string; data: ColloquiFamilyRequest }>(`/api/colloqui/prenotazioni/${requestId}/annulla`, {
        token,
        method: "PATCH",
      }),
    confirm: (token: string, requestId: number) =>
      apiRequest<{ message: string; data: ColloquiTeacherRequest }>(`/api/colloqui/richieste/${requestId}/conferma`, {
        token,
        method: "PATCH",
      }),
    reject: (token: string, requestId: number, message: string) =>
      apiRequest<{ message: string; data: ColloquiTeacherRequest }>(`/api/colloqui/richieste/${requestId}/rifiuta`, {
        token,
        method: "PATCH",
        body: JSON.stringify({ message }),
      }),
    updateResponse: (token: string, requestId: number, status: "C" | "N", message: string) =>
      apiRequest<{ message: string; data: ColloquiTeacherRequest }>(`/api/colloqui/richieste/${requestId}`, {
        token,
        method: "PATCH",
        body: JSON.stringify({ status, message }),
      }),
    management: (token: string) =>
      apiRequest<{ data: ColloquiManagementData }>("/api/colloqui/gestione", { token }),
    createSingleManagement: (
      token: string,
      data: {
        date: string;
        startTime: string;
        endTime: string;
        duration: number;
        type: "P" | "D";
        location: string;
        enabled?: boolean;
      },
    ) =>
      apiRequest<{ message: string; data: ColloquiManagementItem }>("/api/colloqui/gestione/single", {
        token,
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateSingleManagement: (
      token: string,
      id: number,
      data: {
        date: string;
        startTime: string;
        endTime: string;
        duration: number;
        type: "P" | "D";
        location: string;
        enabled?: boolean;
      },
    ) =>
      apiRequest<{ message: string; data: ColloquiManagementItem }>(`/api/colloqui/gestione/single/${id}`, {
        token,
        method: "PUT",
        body: JSON.stringify(data),
      }),
    createPeriodicManagement: (
      token: string,
      data: {
        type: "P" | "D";
        frequency: "S" | "1" | "2" | "3" | "4";
        weekday: number;
        startTime: string;
        endTime: string;
        duration: number;
        location: string;
      },
    ) =>
      apiRequest<{ message: string; warning?: string | null }>("/api/colloqui/gestione/periodic", {
        token,
        method: "POST",
        body: JSON.stringify(data),
      }),
    setManagementEnabled: (token: string, id: number, enabled: boolean) =>
      apiRequest<{ message: string; data: ColloquiManagementItem }>(`/api/colloqui/gestione/${id}/enabled`, {
        token,
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
    deleteManagement: (token: string, mode: "D" | "T") =>
      apiRequest<{ message: string; data: { deleted: number } }>(`/api/colloqui/gestione${buildQuery({ mode })}`, {
        token,
        method: "DELETE",
      }),
  },

  famiglia: {
    dashboard: (token: string) =>
      apiRequest<{ data: FamigliaDashboardData }>("/api/famiglia/dashboard", { token }),
    pagelle: (token: string, periodo?: string) =>
      apiRequest<{ data: FamigliaPagelleData }>(`/api/famiglia/pagelle${buildQuery({ periodo })}`, { token }),
  },

  richieste: {
    list: (token: string) =>
      apiRequest<{ data: RichiesteFamigliaData }>("/api/richieste", { token }),
    create: async (
      token: string,
      data: {
        moduleId: number;
        requestDate?: string;
        values: Record<string, string | number | boolean | null>;
      },
      attachments: File[],
    ) => {
      const apiBase = getApiBaseUrl();
      const formData = new FormData();
      formData.append("moduleId", String(data.moduleId));
      formData.append("payload", JSON.stringify({
        requestDate: data.requestDate,
        values: data.values,
      }));
      for (const file of attachments) {
        formData.append("attachments[]", file);
      }

      const response = await fetch(`${apiBase}/api/richieste`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new ApiError(response.status, body.error || `Errore ${response.status}`);
      }

      return response.json() as Promise<{ message: string; data: { id: number; status: RichiestaStatus } }>;
    },
    detail: (token: string, id: number) =>
      apiRequest<{ data: RichiestaFamigliaDetail }>(`/api/richieste/${id}`, { token }),
    cancel: (token: string, id: number) =>
      apiRequest<{ message: string; data: { id: number; status: RichiestaStatus } }>(`/api/richieste/${id}/annulla`, {
        token,
        method: "PATCH",
      }),
    download: async (
      token: string,
      id: number,
      documento = 0,
      mode: "download" | "open" = "download",
    ) => {
      const { blob, filename, contentType } = await apiDownload(`/api/richieste/${id}/download/${documento}`, token);
      triggerBlobDownload(
        blob,
        filename || `richiesta-${id}${documento > 0 ? `-allegato-${documento}` : ""}`,
        mode,
      );
      return { filename, contentType };
    },
    gestioneList: (token: string, params?: { stato?: string; classe?: number; pagina?: number }) =>
      apiRequest<{ data: RichiestaGestioneData }>(`/api/richieste/gestione${buildQuery(params || {})}`, { token }),
    gestisci: (token: string, id: number, messaggio?: string) =>
      apiRequest<{ message: string; data: { id: number; status: RichiestaStatus } }>(`/api/richieste/${id}/gestisci`, {
        token, method: "PATCH", body: JSON.stringify({ messaggio }),
      }),
    rimuovi: (token: string, id: number, messaggio?: string) =>
      apiRequest<{ message: string; data: { id: number; status: RichiestaStatus } }>(`/api/richieste/${id}/rimuovi`, {
        token, method: "PATCH", body: JSON.stringify({ messaggio }),
      }),
  },

  coordinatore: {
    classi: (token: string) =>
      apiRequest<{ data: { id: number; nome: string; sede: string }[] }>("/api/coordinatore/classi", { token }),
    situazione: (token: string, classeId: number) =>
      apiRequest<{ data: { classe: { id: number; nome: string; sede: string; oreSettimanali: number }; alunni: { id: number; displayName: string; dataNascita: string | null; sesso: string; bes: string; noteBes: string; religione: boolean; note: string }[] } }>(`/api/coordinatore/${classeId}/situazione`, { token }),
    assenze: (token: string, classeId: number) =>
      apiRequest<{ data: { items: { id: number; displayName: string; assenze: number; assenzeNonGiust: number; ritardi: number; ritardiNonGiust: number; uscite: number }[] } }>(`/api/coordinatore/${classeId}/assenze`, { token }),
    voti: (token: string, classeId: number) =>
      apiRequest<{ data: { items: { id: number; displayName: string; materie: { materia: string; media: number | null; count: number }[] }[] } }>(`/api/coordinatore/${classeId}/voti`, { token }),
  },

  documenti: {
    piani: (token: string) =>
      apiRequest<{ data: DocumentoSlot[] }>("/api/documenti/piani", { token }),
    programmi: (token: string) =>
      apiRequest<{ data: DocumentoSlot[] }>("/api/documenti/programmi", { token }),
    relazioni: (token: string) =>
      apiRequest<{ data: DocumentoSlot[] }>("/api/documenti/relazioni", { token }),
    maggio: (token: string) =>
      apiRequest<{ data: DocumentoSlot[] }>("/api/documenti/maggio", { token }),
    bes: (token: string) =>
      apiRequest<{ data: DocumentoBesRow[] }>("/api/documenti/bes", { token }),
    upload: (
      token: string,
      tipo: string,
      file: File,
      fields: { classeId?: number; materiaId?: number; alunnoId?: number },
    ) => {
      const extraFields: Record<string, string> = { tipo };
      if (fields.classeId) extraFields.classeId = String(fields.classeId);
      if (fields.materiaId) extraFields.materiaId = String(fields.materiaId);
      if (fields.alunnoId) extraFields.alunnoId = String(fields.alunnoId);
      return apiUpload<{ message: string; data: DocumentoInfo }>(
        "/api/documenti/upload",
        file,
        token,
        extraFields,
      );
    },
    download: async (token: string, id: number, mode: "download" | "open" = "open") => {
      const { blob, filename, contentType } = await apiDownload(`/api/documenti/${id}/download${buildQuery({ mode })}`, token);
      triggerBlobDownload(blob, filename || `documento-${id}`, mode);
      return { filename, contentType };
    },
    delete: (token: string, id: number) =>
      apiRequest<{ message: string }>(`/api/documenti/${id}`, { token, method: "DELETE" }),
  },

  segreteria: {
    classi: (token: string) =>
      apiRequest<{ data: { id: number; nome: string }[] }>("/api/segreteria/classi", { token }),
    assenze: (token: string, params?: { classe?: number; cognome?: string; nome?: string; pagina?: number }) =>
      apiRequest<{ data: SegreteriaAssenzeData }>(`/api/segreteria/assenze${buildQuery(params || {})}`, { token }),
    alunnoAssenze: (token: string, id: number) =>
      apiRequest<{ data: SegreteriaAlunnoDetail }>(`/api/segreteria/alunni/${id}/assenze`, { token }),
    genitori: (token: string, params?: { classe?: number; cognome?: string; nome?: string; pagina?: number }) =>
      apiRequest<{ data: SegreteriaGenitoriData }>(`/api/segreteria/genitori${buildQuery(params || {})}`, { token }),
    genitoreCreate: (token: string, alunnoId: number, body: SegreteriaGenitoreCreatePayload) =>
      apiRequest<{ data: { genitore: SegreteriaGenitore; generatedPassword: string } }>(`/api/segreteria/alunni/${alunnoId}/genitori`, {
        token, method: "POST", body: JSON.stringify(body),
      }),
    genitoreToggleAbilita: (token: string, id: number) =>
      apiRequest<{ data: { id: number; abilitato: boolean }; message: string }>(`/api/segreteria/genitori/${id}/abilita`, {
        token, method: "PATCH",
      }),
    genitoreEdit: (token: string, id: number, body: { email?: string; telefoni?: string[] }) =>
      apiRequest<{ data: { id: number; email: string; telefoni: string[] } }>(`/api/segreteria/genitori/${id}`, {
        token, method: "PUT", body: JSON.stringify(body),
      }),
    scrutini: (token: string, params?: { classe?: number; cognome?: string; nome?: string; pagina?: number }) =>
      apiRequest<{ data: SegreteriaScrutiniData }>(`/api/segreteria/scrutini${buildQuery(params || {})}`, { token }),
  },

  config: {
    istituto: (token: string) =>
      apiRequest<IstitutoConfig>("/api/config/istituto", { token }),
  },

  // ──── DOCENTI ────
  docenti: {
    list: (token: string, params?: { search?: string; page?: number; limit?: number }) =>
      apiRequest<PaginatedResponse<Docente>>(`/api/docenti${buildQuery(params || {})}`, { token }),
    get: (token: string, id: number) =>
      apiRequest<{ data: Docente }>(`/api/docenti/${id}`, { token }),
    create: (token: string, data: Partial<Docente> & { password?: string }) =>
      apiRequest<{ data: Docente; generatedPassword?: string }>("/api/docenti", {
        token, method: "POST", body: JSON.stringify(data),
      }),
    update: (token: string, id: number, data: Partial<Docente> & { password?: string }) =>
      apiRequest<{ data: Docente }>(`/api/docenti/${id}`, {
        token, method: "PUT", body: JSON.stringify(data),
      }),
    toggleAbilita: (token: string, id: number) =>
      apiRequest<{ data: Docente; message: string }>(`/api/docenti/${id}/abilita`, {
        token, method: "PATCH",
      }),
    staff: (token: string, params?: { search?: string }) =>
      apiRequest<{ data: Docente[] }>(`/api/docenti/staff${buildQuery(params || {})}`, { token }),
    coordinatori: (token: string) =>
      apiRequest<{ data: CoordinatoreInfo[] }>("/api/docenti/coordinatori", { token }),
    setCoordinatore: (token: string, classeId: number, docenteId: number | null) =>
      apiRequest<{ message: string }>(`/api/docenti/coordinatori/${classeId}`, {
        token, method: "PUT", body: JSON.stringify({ docenteId }),
      }),
    segretari: (token: string) =>
      apiRequest<{ data: SegretarioInfo[] }>("/api/docenti/segretari", { token }),
    setSegretario: (token: string, classeId: number, docenteId: number | null) =>
      apiRequest<{ message: string }>(`/api/docenti/segretari/${classeId}`, {
        token, method: "PUT", body: JSON.stringify({ docenteId }),
      }),
    responsabiliBes: (token: string) =>
      apiRequest<{ data: (Docente & { responsabileBesSede: { id: number; nomeBreve: string } | null })[] }>("/api/docenti/responsabili-bes", { token }),
    toggleBes: (token: string, id: number, data: { responsabileBes?: boolean; sedeId?: number | null }) =>
      apiRequest<{ message: string }>(`/api/docenti/responsabili-bes/${id}`, {
        token, method: "PATCH", body: JSON.stringify(data),
      }),
    rspp: (token: string) =>
      apiRequest<{ data: Docente[] }>("/api/docenti/rspp", { token }),
    toggleRspp: (token: string, id: number) =>
      apiRequest<{ message: string }>(`/api/docenti/rspp/${id}`, {
        token, method: "PATCH",
      }),
    rappresentanti: (token: string, tipo?: string) =>
      apiRequest<{ data: (Docente & { rappresentante: string[] })[] }>(
        `/api/docenti/rappresentanti${tipo ? `?tipo=${tipo}` : ""}`, { token },
      ),
    setRappresentante: (token: string, id: number, rappresentante: string[]) =>
      apiRequest<{ message: string }>(`/api/docenti/rappresentanti/${id}`, {
        token, method: "PUT", body: JSON.stringify({ rappresentante }),
      }),
    options: (token: string) =>
      apiRequest<{ data: DocenteOption[] }>("/api/docenti/options", { token }),
  },

  // ──── ALUNNI ────
  alunni: {
    list: (token: string, params?: { search?: string; classe?: number; page?: number; limit?: number }) =>
      apiRequest<PaginatedResponse<Alunno>>(`/api/alunni${buildQuery(params || {})}`, { token }),
    get: (token: string, id: number) =>
      apiRequest<{ data: Alunno }>(`/api/alunni/${id}`, { token }),
    create: (token: string, data: Partial<Alunno> & { password?: string }) =>
      apiRequest<{ data: Alunno }>("/api/alunni", {
        token, method: "POST", body: JSON.stringify(data),
      }),
    update: (token: string, id: number, data: Partial<Alunno> & { password?: string }) =>
      apiRequest<{ data: Alunno }>(`/api/alunni/${id}`, {
        token, method: "PUT", body: JSON.stringify(data),
      }),
    toggleAbilita: (token: string, id: number) =>
      apiRequest<{ data: Alunno; message: string }>(`/api/alunni/${id}/abilita`, {
        token, method: "PATCH",
      }),
    cambioClasse: (token: string, id: number, classeId: number | null) =>
      apiRequest<{ message: string; data: Alunno }>(`/api/alunni/${id}/classe`, {
        token, method: "PUT", body: JSON.stringify({ classeId }),
      }),
    rappresentanti: (token: string) =>
      apiRequest<{ data: (Alunno & { rappresentante: string[] })[] }>("/api/alunni/rappresentanti", { token }),
    setRappresentante: (token: string, id: number, rappresentante: string[]) =>
      apiRequest<{ message: string }>(`/api/alunni/${id}/rappresentante`, {
        token, method: "PUT", body: JSON.stringify({ rappresentante }),
      }),
    rappresentantiGenitori: (token: string) =>
      apiRequest<{ data: RappresentanteGenitore[] }>("/api/alunni/rappresentanti-genitori", { token }),
    setRappresentanteGenitore: (token: string, id: number, rappresentante: string[]) =>
      apiRequest<{ message: string }>(`/api/alunni/rappresentanti-genitori/${id}`, {
        token, method: "PUT", body: JSON.stringify({ rappresentante }),
      }),
  },

  // ──── CLASSI ────
  classi: {
    list: (token: string, params?: { search?: string; sede?: number; page?: number; limit?: number }) =>
      apiRequest<PaginatedResponse<ClasseInfo>>(`/api/classi${buildQuery(params || {})}`, { token }),
    get: (token: string, id: number) =>
      apiRequest<{ data: ClasseInfo }>(`/api/classi/${id}`, { token }),
    create: (token: string, data: { anno: number; sezione: string; gruppo?: string; oreSettimanali?: number; sedeId: number; corsoId: number }) =>
      apiRequest<{ data: ClasseInfo }>("/api/classi", {
        token, method: "POST", body: JSON.stringify(data),
      }),
    update: (token: string, id: number, data: { anno?: number; sezione?: string; gruppo?: string; oreSettimanali?: number; sedeId?: number; corsoId?: number }) =>
      apiRequest<{ data: ClasseInfo }>(`/api/classi/${id}`, {
        token, method: "PUT", body: JSON.stringify(data),
      }),
    delete: (token: string, id: number) =>
      apiRequest<{ message: string }>(`/api/classi/${id}`, {
        token, method: "DELETE",
      }),
  },

  // ──── SEDI ────
  sedi: {
    list: (token: string) =>
      apiRequest<{ data: SedeInfo[] }>("/api/sedi", { token }),
    get: (token: string, id: number) =>
      apiRequest<{ data: SedeInfo }>(`/api/sedi/${id}`, { token }),
    create: (token: string, data: Partial<SedeInfo>) =>
      apiRequest<{ data: SedeInfo }>("/api/sedi", {
        token, method: "POST", body: JSON.stringify(data),
      }),
    update: (token: string, id: number, data: Partial<SedeInfo>) =>
      apiRequest<{ data: SedeInfo }>(`/api/sedi/${id}`, {
        token, method: "PUT", body: JSON.stringify(data),
      }),
  },

  // ──── MATERIE ────
  materie: {
    list: (token: string, params?: { search?: string }) =>
      apiRequest<{ data: MateriaInfo[] }>(`/api/materie${buildQuery(params || {})}`, { token }),
    create: (token: string, data: Partial<MateriaInfo>) =>
      apiRequest<{ data: MateriaInfo }>("/api/materie", {
        token, method: "POST", body: JSON.stringify(data),
      }),
    update: (token: string, id: number, data: Partial<MateriaInfo>) =>
      apiRequest<{ data: MateriaInfo }>(`/api/materie/${id}`, {
        token, method: "PUT", body: JSON.stringify(data),
      }),
  },

  // ──── CORSI ────
  corsi: {
    list: (token: string) =>
      apiRequest<{ data: CorsoInfo[] }>("/api/corsi", { token }),
    create: (token: string, data: { nome: string; nomeBreve: string }) =>
      apiRequest<{ data: CorsoInfo }>("/api/corsi", {
        token, method: "POST", body: JSON.stringify(data),
      }),
    update: (token: string, id: number, data: { nome?: string; nomeBreve?: string }) =>
      apiRequest<{ data: CorsoInfo }>(`/api/corsi/${id}`, {
        token, method: "PUT", body: JSON.stringify(data),
      }),
    delete: (token: string, id: number) =>
      apiRequest<{ message: string }>(`/api/corsi/${id}`, {
        token, method: "DELETE",
      }),
  },

  // ──── CATTEDRE ────
  cattedre: {
    list: (token: string, params?: { search?: string; classe?: number; docente?: number; page?: number; limit?: number }) =>
      apiRequest<PaginatedResponse<CattedraInfo>>(`/api/cattedre${buildQuery(params || {})}`, { token }),
    create: (token: string, data: { docenteId: number; materiaId: number; classeId: number; tipo?: string; supplenza?: boolean }) =>
      apiRequest<{ data: CattedraInfo }>("/api/cattedre", {
        token, method: "POST", body: JSON.stringify(data),
      }),
    update: (token: string, id: number, data: { docenteId?: number; materiaId?: number; classeId?: number; tipo?: string; attiva?: boolean; supplenza?: boolean }) =>
      apiRequest<{ data: CattedraInfo }>(`/api/cattedre/${id}`, {
        token, method: "PUT", body: JSON.stringify(data),
      }),
    delete: (token: string, id: number) =>
      apiRequest<{ message: string }>(`/api/cattedre/${id}`, {
        token, method: "DELETE",
      }),
  },

  // ──── ATA ────
  ata: {
    list: (token: string, params?: { search?: string; page?: number; limit?: number }) =>
      apiRequest<PaginatedResponse<AtaInfo>>(`/api/ata${buildQuery(params || {})}`, { token }),
    create: (token: string, data: Partial<AtaInfo> & { password?: string; sedeId?: number | null; numeriTelefono?: string[] }) =>
      apiRequest<{ data: AtaInfo; generatedPassword?: string | null }>("/api/ata", {
        token, method: "POST", body: JSON.stringify(data),
      }),
    update: (token: string, id: number, data: Record<string, unknown>) =>
      apiRequest<{ data: AtaInfo }>(`/api/ata/${id}`, {
        token, method: "PUT", body: JSON.stringify(data),
      }),
    toggleAbilita: (token: string, id: number) =>
      apiRequest<{ data: AtaInfo; message: string }>(`/api/ata/${id}/abilita`, {
        token, method: "PATCH",
      }),
    rappresentanti: (token: string, tipo?: string) =>
      apiRequest<{ data: (AtaInfo & { rappresentante: string[] })[] }>(
        `/api/ata/rappresentanti${tipo ? `?tipo=${tipo}` : ""}`, { token },
      ),
    setRappresentante: (token: string, id: number, rappresentante: string[]) =>
      apiRequest<{ message: string }>(`/api/ata/${id}/rappresentante`, {
        token, method: "PUT", body: JSON.stringify({ rappresentante }),
      }),
  },

  // ──── SCUOLA (istituto, dirigente, amministratore, festivita, orario, scrutini, moduli) ────
  scuola: {
    istituto: (token: string) =>
      apiRequest<{ data: IstitutoDetail | null }>("/api/istituto", { token }),
    updateIstituto: (token: string, data: Partial<IstitutoDetail> & { logoUrl?: string | null }) =>
      apiRequest<{ message: string; data: IstitutoDetail }>("/api/istituto", {
        token, method: "PUT", body: JSON.stringify(data),
      }),
    amministratore: (token: string) =>
      apiRequest<{ data: { id: number; nome: string; cognome: string; username: string; email: string; sesso: string; fotoUrl?: string | null } | null }>("/api/amministratore", { token }),
    updateAmministratore: (token: string, data: { nome?: string; cognome?: string; email?: string; sesso?: string; password?: string; fotoUrl?: string }) =>
      apiRequest<{ message: string }>("/api/amministratore", {
        token, method: "PUT", body: JSON.stringify(data),
      }),
    dirigente: (token: string) =>
      apiRequest<{ data: { id: number; nome: string; cognome: string; username: string; email: string; sesso: string; fotoUrl?: string | null } | null }>("/api/dirigente", { token }),
    createDirigente: (token: string, data: { nome: string; cognome: string; username: string; email: string; sesso: string; password: string; fotoUrl?: string }) =>
      apiRequest<{ message: string; data: { id: number; nome: string; cognome: string; username: string; email: string; sesso: string; fotoUrl?: string | null } }>("/api/dirigente", {
        token, method: "POST", body: JSON.stringify(data),
      }),
    updateDirigente: (token: string, data: { nome?: string; cognome?: string; email?: string; sesso?: string; password?: string; fotoUrl?: string }) =>
      apiRequest<{ message: string }>("/api/dirigente", {
        token, method: "PUT", body: JSON.stringify(data),
      }),
    festivita: (token: string) =>
      apiRequest<{ data: FestivitaInfo[] }>("/api/festivita", { token }),
    createFestivita: (token: string, data: { data: string; descrizione: string; tipo: string; sede?: number | null }) =>
      apiRequest<{ message: string }>("/api/festivita", {
        token, method: "POST", body: JSON.stringify(data),
      }),
    updateFestivita: (token: string, id: number, data: { data?: string; descrizione?: string; tipo?: string; sede?: number | null }) =>
      apiRequest<{ message: string }>(`/api/festivita/${id}`, {
        token, method: "PUT", body: JSON.stringify(data),
      }),
    deleteFestivita: (token: string, id: number) =>
      apiRequest<{ message: string }>(`/api/festivita/${id}`, {
        token, method: "DELETE",
      }),
    orario: (token: string) =>
      apiRequest<{ data: OrarioInfo[] }>("/api/orario", { token }),
    createOrario: (token: string, data: { nome: string; inizio: string; fine: string; sedeId: number }) =>
      apiRequest<{ data: OrarioInfo }>("/api/orario", {
        token, method: "POST", body: JSON.stringify(data),
      }),
    updateOrario: (token: string, id: number, data: { nome?: string; inizio?: string; fine?: string; sedeId?: number }) =>
      apiRequest<{ data: OrarioInfo }>(`/api/orario/${id}`, {
        token, method: "PUT", body: JSON.stringify(data),
      }),
    deleteOrario: (token: string, id: number) =>
      apiRequest<{ message: string }>(`/api/orario/${id}`, {
        token, method: "DELETE",
      }),
    updateScansioni: (token: string, id: number, scansioni: { giorno: number; ora: number; inizio: string; fine: string; durata: number }[]) =>
      apiRequest<{ data: OrarioInfo }>(`/api/orario/${id}/scansioni`, {
        token, method: "PUT", body: JSON.stringify({ scansioni }),
      }),
    orarioLezioni: (token: string, orarioId: number, classeId?: number) =>
      apiRequest<{ data: OrarioLezione[] }>(
        `/api/orario/${orarioId}/lezioni${classeId ? `?classe=${classeId}` : ""}`, { token },
      ),
    addOrarioLezione: (token: string, orarioId: number, data: { giorno: number; ora: number; cattedraId: number }) =>
      apiRequest<{ data: OrarioLezione }>(`/api/orario/${orarioId}/lezioni`, {
        token, method: "POST", body: JSON.stringify(data),
      }),
    deleteOrarioLezione: (token: string, orarioId: number, lezioneId: number) =>
      apiRequest<{ message: string }>(`/api/orario/${orarioId}/lezioni/${lezioneId}`, {
        token, method: "DELETE",
      }),
    moduliFormativi: (token: string) =>
      apiRequest<{ data: ModuloFormativoInfo[] }>("/api/moduli-formativi", { token }),
    createModuloFormativo: (token: string, data: { nome: string; nomeBreve: string; tipo: string; classi: number[] }) =>
      apiRequest<{ data: ModuloFormativoInfo }>("/api/moduli-formativi", {
        token, method: "POST", body: JSON.stringify(data),
      }),
    updateModuloFormativo: (token: string, id: number, data: { nome?: string; nomeBreve?: string; tipo?: string; classi?: number[] }) =>
      apiRequest<{ data: ModuloFormativoInfo }>(`/api/moduli-formativi/${id}`, {
        token, method: "PUT", body: JSON.stringify(data),
      }),
    deleteModuloFormativo: (token: string, id: number) =>
      apiRequest<{ message: string }>(`/api/moduli-formativi/${id}`, {
        token, method: "DELETE",
      }),
    scrutini: (token: string) =>
      apiRequest<{ data: ScrutinioInfo[] }>("/api/scrutini", { token }),
    updateScrutinio: (
      token: string,
      periodo: string,
      data: { data: string; dataProposte: string; classiVisibili: Record<string, string | null> },
    ) =>
      apiRequest<{ message: string; data: ScrutinioInfo }>(`/api/scrutini/${periodo}`, {
        token, method: "PUT", body: JSON.stringify(data),
      }),
    moduli: (token: string) =>
      apiRequest<{ data: ModuloInfo[] }>("/api/moduli", { token }),
    toggleModulo: (token: string, id: number) =>
      apiRequest<{ message: string; data: ModuloInfo }>(`/api/moduli/${id}/toggle`, {
        token, method: "PATCH",
      }),
    updateModulo: (token: string, id: number, data: { unica?: boolean; gestione?: boolean; allegati?: number; abilitata?: boolean }) =>
      apiRequest<{ message: string; data: ModuloInfo }>(`/api/moduli/${id}`, {
        token, method: "PUT", body: JSON.stringify(data),
      }),
  },

  // ──── IMPORT ────
  import: {
    docenti: (token: string, file: File, filtro?: string) =>
      apiUpload<{ message: string; importati: number; aggiornati: number; errori: string[] }>(
        "/api/import/docenti", file, token, filtro ? { filtro } : undefined,
      ),
    alunni: (token: string, file: File, filtro?: string) =>
      apiUpload<{ message: string; importati: number; aggiornati: number; errori: string[] }>(
        "/api/import/alunni", file, token, filtro ? { filtro } : undefined,
      ),
    ata: (token: string, file: File, filtro?: string) =>
      apiUpload<{ message: string; importati: number; aggiornati: number; errori: string[] }>(
        "/api/import/ata", file, token, filtro ? { filtro } : undefined,
      ),
  },

  // ──── SISTEMA ────
  sistema: {
    parametri: (token: string) =>
      apiRequest<{ data: Record<string, Parametro[]> }>("/api/sistema/parametri", { token }),
    updateParametri: (token: string, parametri: { id: number; valore: string }[]) =>
      apiRequest<{ message: string }>("/api/sistema/parametri", {
        token, method: "PUT", body: JSON.stringify({ parametri }),
      }),
    banner: (token: string) =>
      apiRequest<{ banner_login: string; banner_home: string }>("/api/sistema/banner", { token }),
    updateBanner: (token: string, data: { banner_login?: string; banner_home?: string }) =>
      apiRequest<{ message: string }>("/api/sistema/banner", {
        token, method: "PUT", body: JSON.stringify(data),
      }),
    manutenzione: (token: string) =>
      apiRequest<{ inizio: string; fine: string }>("/api/sistema/manutenzione", { token }),
    updateManutenzione: (token: string, data: { inizio: string; fine: string }) =>
      apiRequest<{ message: string }>("/api/sistema/manutenzione", {
        token, method: "PUT", body: JSON.stringify(data),
      }),
    email: (token: string) =>
      apiRequest<{ server: string; porta: string; username: string; password: string; mittente: string }>("/api/sistema/email", { token }),
    updateEmail: (token: string, data: { server?: string; porta?: string; username?: string; password?: string; mittente?: string }) =>
      apiRequest<{ message: string }>("/api/sistema/email", {
        token, method: "PUT", body: JSON.stringify(data),
      }),
    telegram: (token: string) =>
      apiRequest<{ bot_token: string; webhook: string; abilitato: string }>("/api/sistema/telegram", { token }),
    updateTelegram: (token: string, data: Record<string, string>) =>
      apiRequest<{ message: string }>("/api/sistema/telegram", {
        token, method: "PUT", body: JSON.stringify(data),
      }),
    cambiaPassword: (token: string, userId: number, password: string) =>
      apiRequest<{ message: string }>("/api/sistema/password", {
        token, method: "POST", body: JSON.stringify({ userId, password }),
      }),
    cercaUtenti: (token: string, search: string) =>
      apiRequest<{ data: UtenteSearch[] }>(`/api/sistema/utenti?search=${encodeURIComponent(search)}`, { token }),
    startAlias: (token: string, userId: number) =>
      apiRequest<AliasLoginResponse>("/api/sistema/alias", {
        token, method: "POST", body: JSON.stringify({ userId }),
      }),
    exitAlias: (token: string, originalUsername?: string, originalRole?: string) =>
      apiRequest<{ message: string }>("/api/sistema/alias/exit", {
        token,
        method: "POST",
        body: JSON.stringify({ originalUsername, originalRole }),
      }),
    info: (token: string) =>
      apiRequest<{ versione: string; anno_scolastico: string; anno_inizio: string; anno_fine: string }>("/api/sistema/info", { token }),
  },
};

export { apiUpload };

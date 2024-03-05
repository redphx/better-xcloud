// ==UserScript==
// @name         Better xCloud
// @namespace    https://github.com/redphx
// @version      3.2.1
// @description  Improve Xbox Cloud Gaming (xCloud) experience
// @author       redphx
// @license      MIT
// @match        https://www.xbox.com/*/play*
// @match        https://www.xbox.com/*/auth/msa?*loggedIn*
// @run-at       document-start
// @grant        none
// @updateURL    https://raw.githubusercontent.com/redphx/better-xcloud/main/better-xcloud.meta.js
// @downloadURL  https://github.com/redphx/better-xcloud/releases/latest/download/better-xcloud.user.js
// ==/UserScript==
'use strict';

const SCRIPT_VERSION = '3.2.1';
const SCRIPT_HOME = 'https://github.com/redphx/better-xcloud';

const ENABLE_XCLOUD_LOGGER = false;
const ENABLE_PRELOAD_BX_UI = false;
const USE_DEV_TOUCH_LAYOUT = false;

let REMOTE_PLAY_SERVER;

const ENABLE_NATIVE_MKB_BETA = false;
window.NATIVE_MKB_TITLES = [
    // Not working anymore
    // '9PMQDM08SNK9', // MS Flight Simulator
    // '9NP1P1WFS0LB', // Halo Infinite
    // '9PJTHRNVH62H', // Grounded
    // '9P2N57MC619K', // Sea of Thieves
    // '9NBR2VXT87SJ', // Psychonauts 2
    // '9N5JRWWGMS1R', // ARK
    // '9P4KMR76PLLQ', // Gears 5
    // '9NN3HCKW5TPC', // Gears Tactics

    // Bugged
    // '9NG07QJNK38J', // Among Us
    // '9N2Z748SPMTM', // AoE 2
    // '9P731Z4BBCT3', // Atomic Heart
];

if (window.location.pathname.includes('/auth/msa')) {
    window.addEventListener('load', e => {
            window.location.search.includes('loggedIn') && setTimeout(() => {
                const location = window.location;
                location.pathname.includes('/play') && location.reload(true);
            }, 2000);
        });
    // Stop processing the script
    throw new Error('[Better xCloud] Refreshing the page after logging in');
}

console.log(`[Better xCloud] readyState: ${document.readyState}`);

const BxEvent = {
    JUMP_BACK_IN_READY: 'bx-jump-back-in-ready',
    POPSTATE: 'bx-popstate',

    STREAM_LOADING: 'bx-stream-loading',
    STREAM_STARTING: 'bx-stream-starting',
    STREAM_STARTED: 'bx-stream-started',
    STREAM_PLAYING: 'bx-stream-playing',
    STREAM_STOPPED: 'bx-stream-stopped',
    STREAM_ERROR_PAGE: 'bx-stream-error-page',

    STREAM_MENU_SHOWN: 'bx-stream-menu-shown',
    STREAM_MENU_HIDDEN: 'bx-stream-menu-hidden',

    STREAM_WEBRTC_CONNECTED: 'bx-stream-webrtc-connected',
    STREAM_WEBRTC_DISCONNECTED: 'bx-stream-webrtc-disconnected',

    CUSTOM_TOUCH_LAYOUTS_LOADED: 'bx-custom-touch-layouts-loaded',

    DATA_CHANNEL_CREATED: 'bx-data-channel-created',

    dispatch: (target, eventName, data) => {
        if (!eventName) {
            alert('BxEvent.dispatch(): eventName is null');
            return;
        }

        const event = new Event(eventName);

        if (data) {
            for (const key in data) {
                event[key] = data[key];
            }
        }

        target.dispatchEvent(event);
    },
};

// Quickly create a tree of elements without having to use innerHTML
function createElement(elmName, props = {}) {
    let $elm;
    const hasNs = 'xmlns' in props;

    if (hasNs) {
        $elm = document.createElementNS(props.xmlns, elmName);
        delete props.xmlns;
    } else {
        $elm = document.createElement(elmName);
    }

    for (const key in props) {
        if ($elm.hasOwnProperty(key)) {
            continue;
        }

        if (hasNs) {
            $elm.setAttributeNS(null, key, props[key]);
        } else {
            $elm.setAttribute(key, props[key]);
        }
    }

    for (let i = 2, size = arguments.length; i < size; i++) {
        const arg = arguments[i];
        const argType = typeof arg;

        if (argType === 'string' || argType === 'number') {
            $elm.appendChild(document.createTextNode(arg));
        } else if (arg) {
            $elm.appendChild(arg);
        }
    }

    return $elm;
}

const CE = createElement;
window.BX_CE = CE;
const CTN = document.createTextNode.bind(document);


const createSvgIcon = (icon, strokeWidth=2) => {
    const $svg = CE('svg', {
        'xmlns': 'http://www.w3.org/2000/svg',
        'fill': 'none',
        'stroke': '#fff',
        'fill-rule': 'evenodd',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-width': strokeWidth,
    });
    $svg.innerHTML = icon;
    $svg.setAttribute('viewBox', '0 0 32 32');

    return $svg;
};

const ButtonStyle = {};
ButtonStyle[ButtonStyle.PRIMARY = 1] = 'bx-primary';
ButtonStyle[ButtonStyle.DANGER = 2] = 'bx-danger';
ButtonStyle[ButtonStyle.GHOST = 4] = 'bx-ghost';
ButtonStyle[ButtonStyle.FOCUSABLE = 8] = 'bx-focusable';
ButtonStyle[ButtonStyle.FULL_WIDTH = 16] = 'bx-full-width';
ButtonStyle[ButtonStyle.FULL_HEIGHT = 32] = 'bx-full-height';

const ButtonStyleIndices = Object.keys(ButtonStyle).splice(0, Object.keys(ButtonStyle).length / 2).map(i => parseInt(i));


const createButton = options => {
    const $btn = CE(options.url ? 'a' : 'button', {'class': 'bx-button'});

    const style = options.style || 0;
    style && ButtonStyleIndices.forEach(index => {
            (style & index) && $btn.classList.add(ButtonStyle[index]);
        });

    options.classes && $btn.classList.add(...options.classes);

    options.icon && $btn.appendChild(createSvgIcon(options.icon, 4));
    options.label && $btn.appendChild(CE('span', {}, options.label));
    options.title && $btn.setAttribute('title', options.title);
    options.onClick && $btn.addEventListener('click', options.onClick);

    if (options.url) {
        $btn.href = options.url;
        $btn.target = '_blank';
    }

    return $btn;
}


const Translations = {
    getLocale: () => {
        const supportedLocales = [
            'de-DE',
            'en-US',
            'es-ES',
            'fr-FR',
            'it-IT',
            'ja-JP',
            'ko-KR',
            'pl-PL',
            'pt-BR',
            'ru-RU',
            'tr-TR',
            'uk-UA',
            'vi-VN',
            'zh-CN',
        ];

        Translations.enUS = supportedLocales.indexOf('en-US');

        let locale = localStorage.getItem('better_xcloud_locale');
        if (!locale) {
            locale = window.navigator.language || 'en-US';
            if (supportedLocales.indexOf(locale) === -1) {
                locale = 'en-US';
            }
            localStorage.setItem('better_xcloud_locale', locale);
        }

        return supportedLocales.indexOf(locale);
    },

    get: (key, values) => {
        const texts = Translations[key] || alert(`Missing translation key: ${key}`);
        const translation = texts[LOCALE] || texts[Translations.enUS];

        return values ? translation(values) : translation;
    },

    "activate": [
        "Aktivieren",
        "Activate",
        "Activo",
        ,
        ,
        "設定する",
        "활성화",
        "Aktywuj",
        "Ativar",
        "Активировать",
        "Etkinleştir",
        "Активувати",
        "Kích hoạt",
        "启用",
    ],
    "activated": [
        "Aktiviert",
        "Activated",
        "Activado",
        ,
        ,
        "設定中",
        "활성화 됨",
        "Aktywowane",
        "Ativado",
        "Активирован",
        "Etkin",
        "Активований",
        "Đã kích hoạt",
        "已启用",
    ],
    "active": [
        "Aktiv",
        "Active",
        "Activo",
        ,
        ,
        "有効",
        "활성화",
        "Aktywny",
        "Ativo",
        "Активный",
        "Etkin",
        "Активний",
        "Hoạt động",
        "已启用",
    ],
    "advanced": [
        "Erweitert",
        "Advanced",
        "Avanzado",
        "Options avancées",
        "Avanzate",
        "高度な設定",
        "고급",
        "Zaawansowane",
        "Avançado",
        "Продвинутые",
        "Gelişmiş ayarlar",
        "Розширені",
        "Nâng cao",
        "高级选项",
    ],
    "apply": [
        "Anwenden",
        "Apply",
        "Aplicar",
        ,
        ,
        "適用",
        ,
        "Zastosuj",
        "Aplicar",
        "Применить",
        "Uygula",
        "Застосувати",
        "Áp dụng",
        "应用",
    ],
    "audio": [
        "Audio",
        "Audio",
        "Audio",
        "Audio",
        "Audio",
        "音声",
        "오디오",
        "Dźwięk",
        "Áudio",
        "Звук",
        "Ses",
        "Звук",
        "Âm thanh",
        "音频",
    ],
    "auto": [
        "Automatisch",
        "Auto",
        "Auto",
        "Auto",
        "Automatico",
        "自動",
        "자동",
        "Automatyczne",
        "Automático",
        "Автоматически",
        "Otomatik",
        "Автоматично",
        "Tự động",
        "自动",
    ],
    "badge-audio": [
        "Audio",
        "Audio",
        "Audio",
        "Audio",
        "Audio",
        "音声",
        "오디오",
        "Dźwięk",
        "Áudio",
        "Звук",
        "Ses",
        "Звук",
        "Tiếng",
        "音频",
    ],
    "badge-battery": [
        "Batterie",
        "Battery",
        "Batería",
        "Batterie",
        "Batteria",
        "バッテリー",
        "배터리",
        "Bateria",
        "Bateria",
        "Батарея",
        "Pil",
        "Батарея",
        "Pin",
        "电量",
    ],
    "badge-in": [
        "Empfangen",
        "In",
        "Entrada",
        "Dans",
        "DL",
        "IN",
        "다운로드",
        "Pobieranie",
        "Recebidos",
        "Входящие",
        "Gelen",
        "Завантаження",
        "Nhận",
        "下载",
    ],
    "badge-out": [
        "Gesendet",
        "Out",
        "Salida",
        "Sorti",
        "UP",
        "OUT",
        "업로드",
        "Wysyłanie",
        "Enviados",
        "Исходящие",
        "Giden",
        "Вивантаження",
        "Gởi",
        "上传",
    ],
    "badge-playtime": [
        "Spielzeit",
        "Playtime",
        "Tiempo jugado",
        "Temps de jeu",
        "In gioco da",
        "プレイ時間",
        "플레이한 시간",
        "Czas gry",
        "Tempo de jogo",
        "Время в игре",
        "Oynanış süresi",
        "Час гри",
        "Giờ chơi",
        "游玩时间",
    ],
    "badge-server": [
        "Server",
        "Server",
        "Servidor",
        "Serveur",
        "Server",
        "サーバー",
        "서버",
        "Serwer",
        "Servidor",
        "Сервер",
        "Sunucu",
        "Сервер",
        "Máy chủ",
        "服务器",
    ],
    "badge-video": [
        "Video",
        "Video",
        "Video",
        "Vidéo",
        "Video",
        "映像",
        "비디오",
        "Obraz",
        "Vídeo",
        "Видео",
        "Görüntü",
        "Відео",
        "Hình",
        "视频",
    ],
    "bottom-left": [
        "Unten links",
        "Bottom-left",
        "Inferior izquierdo",
        "En bas à gauche",
        "In basso a sinistra",
        "左下",
        "좌측 하단",
        "Lewy dolny róg",
        "Inferior Esquerdo",
        "Левый нижний угол",
        "Sol alt",
        "Внизу ліворуч",
        "Phía dưới bên trái",
        "左下角",
    ],
    "bottom-right": [
        "Unten rechts",
        "Bottom-right",
        "Inferior derecha",
        "Bas-droit",
        "In basso a destra",
        "右下",
        "우측 하단",
        "Prawy dolny róg",
        "Inferior-direito",
        "Правый нижний угол",
        "Sağ alt",
        "Внизу праворуч",
        "Phía dưới bên phải",
        "右下角",
    ],
    "brightness": [
        "Helligkeit",
        "Brightness",
        "Brillo",
        "Luminosité",
        "Luminosità",
        "輝度",
        "밝기",
        "Jasność",
        "Brilho",
        "Яркость",
        "Aydınlık",
        "Яскравість",
        "Độ sáng",
        "亮度",
    ],
    "browser-unsupported-feature": [
        "Dein Browser unterstützt diese Funktion nicht",
        "Your browser doesn't support this feature",
        "Su navegador no soporta esta característica",
        "Votre navigateur ne supporte pas cette fonctionnalité",
        "Il tuo browser non supporta questa funzione",
        "お使いのブラウザはこの機能をサポートしていません。",
        "브라우저에서 이 기능을 지원하지 않습니다.",
        "Twoja przeglądarka nie obsługuje tej funkcji",
        "Seu navegador não suporta este recurso",
        "Ваш браузер не поддерживает эту функцию",
        "Web tarayıcınız bu özelliği desteklemiyor",
        "Ваш браузер не підтримує цю функцію",
        "Trình duyệt không hỗ trợ tính năng này",
        "您的浏览器不支持此功能",
    ],
    "can-stream-xbox-360-games": [
        "Kann Xbox 360 Spiele streamen",
        "Can stream Xbox 360 games",
        "Puede transmitir juegos de Xbox 360",
        ,
        "Puoi riprodurre i giochi Xbox 360",
        "Xbox 360ゲームのストリーミング可能",
        "Xbox 360 게임 스트림 가능",
        "Można strumieniować gry Xbox 360",
        "Pode transmitir jogos de Xbox 360",
        "Позволяет транслировать Xbox 360 игры",
        "Xbox 360 oyunlarına erişim sağlanabilir",
        "Дозволяє транслювати ігри Xbox 360",
        "Có thể stream các game Xbox 360",
        "可以进行流式传输Xbox360游戏",
    ],
    "cancel": [
        "Abbrechen",
        "Cancel",
        "Cancelar",
        ,
        ,
        "キャンセル",
        "취소",
        "Anuluj",
        "Cancelar",
        "Отмена",
        "Vazgeç",
        "Скасувати",
        "Hủy",
        "取消",
    ],
    "cant-stream-xbox-360-games": [
        "Kann Xbox 360 Spiele nicht streamen",
        "Can't stream Xbox 360 games",
        "No puede transmitir juegos de Xbox 360",
        ,
        "Impossibile riprodurre i giochi Xbox 360",
        "Xbox 360ゲームのストリーミング不可",
        "Xbox 360 게임 스트림 불가",
        "Nie można strumieniować gier Xbox 360",
        "Não pode transmitir jogos de Xbox 360",
        "Невозможно транслировать игры Xbox 360",
        "Xbox 360 oyunlarına erişim sağlanamaz",
        "Не дозволяє транслювати ігри Xbox 360",
        "Không thể stream các game Xbox 360",
        "不可以进行流式传输Xbox360游戏",
    ],
    "clarity": [
        "Klarheit",
        "Clarity",
        "Claridad",
        "Clarté",
        "Nitidezza",
        "明瞭度（クラリティ）",
        "선명도",
        "Ostrość",
        "Clareza",
        "Чёткость",
        "Netlik",
        "Чіткість",
        "Độ nét",
        "清晰度",
    ],
    "clarity-boost-warning": [
        "Diese Einstellungen funktionieren nicht, wenn \"Clarity Boost\" aktiviert ist",
        "These settings don't work when the Clarity Boost mode is ON",
        "Estos ajustes no funcionan cuando el modo Clarity Boost está activado",
        "Ces paramètres ne fonctionnent pas lorsque le mode Clarity Boost est activé",
        "Queste impostazioni non funzionano quando la modalità Clarity Boost è attiva",
        "クラリティブーストが有効の場合、映像設定は無効化されます。",
        "이 설정들은 선명도 향상 기능이 켜져 있을 때는 동작하지 않습니다.",
        "Te ustawienia nie będą działać, gdy tryb \"Clarity Boost\" jest włączony",
        "Estas configurações não funcionam quando o modo \"Clarity Boost\" está ATIVADO",
        "Эти настройки не работают, когда включен режим Clarity Boost",
        "Netliği Artırma modu açıkken bu ayarlar ETKİSİZDİR",
        "Ці налаштування не працюють, коли увімкнено режим \"Clarity Boost\"",
        "Các tùy chỉnh này không hoạt động khi chế độ Clarity Boost đang được bật",
        "这些设置在 Clarity Boost 清晰度增强 开启时不可用",
    ],
    "clear": [
        "Zurücksetzen",
        "Clear",
        "Borrar",
        ,
        ,
        "消去",
        "비우기",
        "Wyczyść",
        "Limpar",
        "Очистить",
        "Temizle",
        "Очистити",
        "Xóa",
        "清空",
    ],
    "close": [
        "Schließen",
        "Close",
        "Cerrar",
        "Fermer",
        "Chiudi",
        "閉じる",
        "닫기",
        "Zamknij",
        "Fechar",
        "Закрыть",
        "Kapat",
        "Закрити",
        "Đóng",
        "关闭",
    ],
    "conditional-formatting": [
        "Zustandsabhängige Textfarbe",
        "Conditional formatting text color",
        "Color condicional de formato de texto",
        "Couleur du texte de mise en forme conditionnelle",
        "Colore testo formattazione condizionale",
        "状態に応じた文字色で表示",
        "통계에 따라 글자 색 지정",
        "Kolor tekstu zależny od wartości",
        "Cor do texto de formatação condicional",
        "Цвет текста в зависимости от условий",
        "Metin renginin koşullu biçimlendirilmesi",
        "Колір тексту в залежності від умов",
        "Thay đổi màu chữ tùy theo giá trị",
        "更改文本颜色",
    ],
    "confirm-delete-preset": [
        "Möchtest Du diese Voreinstellung löschen?",
        "Do you want to delete this preset?",
        "¿Desea eliminar este preajuste?",
        ,
        ,
        "このプリセットを削除しますか？",
        "이 프리셋을 삭제하시겠습니까?",
        "Czy na pewno chcesz usunąć ten szablon?",
        "Você quer excluir esta predefinição?",
        "Вы точно хотите удалить этот шаблон?",
        "Bu hazır ayarı silmek istiyor musunuz?",
        "Ви бажаєте видалити цей пресет?",
        "Bạn có muốn xoá thiết lập sẵn này không?",
        "您想要删除此预设吗？",
    ],
    "confirm-reload-stream": [
        "Möchtest Du den Stream aktualisieren?",
        "Do you want to refresh the stream?",
        "¿Quieres actualizar el stream?\n",
        "Voulez-vous actualiser le stream ?",
        "Vuoi aggiornare lo stream?",
        "ストリーミングをリフレッシュしますか？",
        "스트리밍을 재시작할까요?",
        "Czy chcesz odświeżyć transmisję?",
        "Você deseja atualizar a transmissão?",
        "Вы хотите перезапустить поток?",
        "Yayını yeniden başlatmak istiyor musunuz?",
        "Бажаєте оновити трансляцію?",
        "Bạn có muốn kết nối lại stream không?",
        "您想要刷新吗？",
    ],
    "console-connect": [
        "Verbinden",
        "Connect",
        "Conectar",
        ,
        "Connetti",
        "本体に接続",
        "콘솔 연결",
        "Połącz",
        "Conectar",
        "Подключиться",
        "Bağlan",
        "Під’єднатися",
        "Kết nối",
        "连接",
    ],
    "contrast": [
        "Kontrast",
        "Contrast",
        "Contraste",
        "Contraste",
        "Contrasto",
        "コントラスト",
        "대비",
        "Kontrast",
        "Contraste",
        "Контрастность",
        "Karşıtlık",
        "Контрастність",
        "Độ tương phản",
        "对比度",
    ],
    "controller": [
        "Controller",
        "Controller",
        "Joystick",
        ,
        "Controller",
        "コントローラー",
        "컨트롤러",
        "Kontroler",
        "Controle",
        "Контроллер",
        "Oyun Kumandası",
        "Контролер",
        "Bộ điều khiển",
        "手柄",
    ],
    "controller-shortcuts": [
        "Controller-Shortcuts",
        "Controller shortcuts",
        "Habilitar atajos del Joystick",
        ,
        ,
        "コントローラーショートカット",
        ,
        "Skróty kontrolera",
        "Atalhos do controle",
        "Горячие клавиши контроллера",
        "Oyun kumandası kısayolları",
        "Ярлики контролера",
        "Các phím tắt tay cầm",
        "手柄快捷键",
    ],
    "controller-vibration": [
        "Vibration des Controllers",
        "Controller vibration",
        "Vibración del mando",
        ,
        ,
        "コントローラーの振動",
        "컨트롤러 진동",
        "Wibracje kontrolera",
        "Vibração do controle",
        "Вибрация контроллера",
        "Oyun kumandası titreşimi",
        "Вібрація контролера",
        "Rung bộ điều khiển",
        "控制器振动",
    ],
    "copy": [
        "Kopieren",
        "Copy",
        "Copiar",
        ,
        ,
        "コピー",
        "복사",
        "Kopiuj",
        "Copiar",
        "Скопировать",
        "Kopyala",
        "Копіювати",
        "Sao chép",
        "复制",
    ],
    "custom": [
        "Benutzerdefiniert",
        "Custom",
        "Personalizado",
        "Personnalisée",
        "Personalizzato",
        "カスタム",
        "사용자 지정",
        "Niestandardowe",
        "Customizado",
        "Вручную",
        "Özel",
        "Користувацькі",
        "Tùy chỉnh",
        "自定义",
    ],
    "deadzone-counterweight": [
        "Deadzone Gegengewicht",
        "Deadzone counterweight",
        "Contrapeso de la zona muerta",
        ,
        ,
        "デッドゾーンのカウンターウエイト",
        ,
        "Przeciwwaga martwej strefy",
        "Contador da Zona Morta",
        "Противодействие мертвой зоне игры",
        "Ölü alan denge ağırlığı",
        "Противага Deadzone",
        "Đối trọng vùng chết",
        "死区补偿",
    ],
    "default": [
        "Standard",
        "Default",
        "Por defecto",
        "Par défaut",
        "Predefinito",
        "デフォルト",
        "기본값",
        "Domyślny",
        "Padrão",
        "По умолчанию",
        "Varsayılan",
        "За замовчуванням",
        "Mặc định",
        "默认",
    ],
    "delete": [
        "Löschen",
        "Delete",
        "Borrar",
        ,
        ,
        "削除",
        "삭제",
        "Usuń",
        "Deletar",
        "Удалить",
        "Sil",
        "Видалити",
        "Xóa",
        "删除",
    ],
    "device-unsupported-touch": [
        "Dein Gerät hat keine Touch-Unterstützung",
        "Your device doesn't have touch support",
        "Tu dispositivo no tiene soporte táctil",
        "Votre appareil n'a pas de support tactile",
        "Il tuo dispositivo non ha uno schermo touch",
        "お使いのデバイスはタッチ機能をサポートしていません。",
        "브라우저에서 터치를 지원하지 않습니다.",
        "Twoje urządzenie nie obsługuję tej funkcji",
        "Seu dispositivo não possui suporte de toque",
        "Ваше устройство не поддерживает сенсорное управление",
        "Cihazınızda dokunmatik ekran özelliği yoktur",
        "Ваш пристрій не має підтримки сенсорного керування",
        "Thiết bị này không hỗ trợ cảm ứng",
        "您的设备不支持触摸",
    ],
    "device-vibration": [
        "Vibration des Geräts",
        "Device vibration",
        "Vibración del dispositivo",
        ,
        ,
        "デバイスの振動",
        "기기 진동",
        "Wibracje urządzenia",
        "Vibração do dispositivo",
        "Вибрация устройства",
        "Cihaz titreşimi",
        "Вібрація пристрою",
        "Rung thiết bị",
        "设备振动",
    ],
    "device-vibration-not-using-gamepad": [
        "An, wenn kein Gamepad verbunden",
        "On when not using gamepad",
        "Activado cuando no se utiliza el mando",
        ,
        ,
        "ゲームパッド未使用時にオン",
        "게임패드를 사용하지 않을 때",
        "Włączone, gdy nie używasz kontrolera",
        "Ativar quando não estiver usando o dispositivo",
        "Включить когда не используется геймпад",
        "Oyun kumandası bağlanmadan titreşim",
        "Увімкнена, коли не використовується геймпад",
        "Bật khi không dùng tay cầm",
        "当不使用游戏手柄时",
    ],
    "disable": [
        "Deaktiviert",
        "Disable",
        "Deshabilitar",
        "Désactiver",
        "Disabilita",
        "無効",
        "비활성화",
        "Wyłącz",
        "Desabilitar",
        "Отключить",
        "Devre dışı bırak",
        "Вимкнути",
        "Vô hiệu hóa",
        "禁用",
    ],
    "disable-post-stream-feedback-dialog": [
        "Feedback-Dialog beim Beenden deaktivieren",
        "Disable post-stream feedback dialog",
        "Desactivar diálogo de retroalimentación post-stream",
        "Désactiver la boîte de dialogue de commentaires post-stream",
        "Disabilita la finestra di feedback al termine dello stream",
        "ストリーミング終了後のフィードバック画面を非表示",
        "스트림 후 피드백 다이얼 비활성화",
        "Wyłącz okno opinii po zakończeniu transmisji",
        "Desativar o diálogo de comentários pós-transmissão",
        "Отключить диалог обратной связи после стрима",
        "Yayın sonrası geribildirim ekranını kapat",
        "Відключити діалогове вікно зворотного зв’язку після трансляції",
        "Tắt hộp thoại góp ý sau khi chơi xong",
        "禁用反馈问卷",
    ],
    "disable-social-features": [
        "Soziale Funktionen deaktivieren",
        "Disable social features",
        "Desactivar características sociales",
        "Désactiver les fonctionnalités sociales",
        "Disabilita le funzioni social",
        "ソーシャル機能を無効",
        "소셜 기능 비활성화",
        "Wyłącz funkcje społecznościowe",
        "Desativar recursos sociais",
        "Отключить социальные функции",
        "Sosyal özellikleri kapat",
        "Вимкнути соціальні функції",
        "Khóa các tính năng xã hội",
        "禁用社交功能",
    ],
    "disable-xcloud-analytics": [
        "xCloud-Datenanalyse deaktivieren",
        "Disable xCloud analytics",
        "Desactivar análisis de xCloud",
        "Désactiver les analyses xCloud",
        "Disabilita l'analitica di xCloud",
        "xCloudアナリティクスを無効",
        "xCloud 통계 비활성화",
        "Wyłącz analitykę xCloud",
        "Desativar telemetria do xCloud",
        "Отключить аналитику xCloud",
        "xCloud'un veri toplamasını devre dışı bırak",
        "Вимкнути аналітику xCloud",
        "Khóa phân tích thông tin của xCloud",
        "关闭 xCloud 遥测数据统计",
    ],
    "disabled": [
        "Deaktiviert",
        "Disabled",
        "Desactivado",
        ,
        ,
        "無効",
        "비활성화됨",
        "Wyłączony",
        "Desativado",
        "Отключено",
        "Kapalı",
        "Вимкнено",
        "Đã tắt",
        "禁用",
    ],
    "edit": [
        "Bearbeiten",
        "Edit",
        "Editar",
        ,
        ,
        "編集",
        "편집",
        "Edytuj",
        "Editar",
        "Редактировать",
        "Düzenle",
        "Редагувати",
        "Sửa",
        "编辑",
    ],
    "enable-controller-shortcuts": [
        "Controller-Shortcuts aktivieren",
        "Enable controller shortcuts",
        "Habilitar accesos directos del Joystick",
        ,
        "Consenti scorciatoie da controller",
        "コントローラーショートカットを有効化",
        "컨트롤러 숏컷 활성화",
        "Włącz skróty kontrolera",
        "Ativar atalhos do controle",
        "Включить быстрые клавиши контроллера",
        "Oyun kumandası kısayollarını aç",
        "Увімкнути ярлики контролера",
        "Bật tính năng phím tắt cho bộ điều khiển",
        "启用手柄快捷方式",
    ],
    "enable-local-co-op-support": [
        "Lokale Coop-Unterstützung aktivieren",
        "Enable local co-op support",
        "Habilitar soporte co-op local",
        ,
        ,
        "ローカルマルチプレイのサポートを有効化",
        ,
        "Włącz lokalny co-op",
        "Habilitar o suporte a co-op local",
        "Включить поддержку локальной кооперативной игры",
        "Yerel çok oyuncu desteğini aktive et",
        "Увімкнути локальну co-op підтримку",
        "Kích hoạt tính năng chơi chung cục bộ",
        ,
    ],
    "enable-local-co-op-support-note": [
        "Funktioniert nur, wenn das Spiel kein anderes Profil benötigt",
        "Only works if the game doesn't require a different profile",
        "Solo funciona si el juego no requiere un perfil diferente",
        ,
        ,
        "別アカウントでのサインインを必要としないゲームのみ動作します",
        ,
        "Działa tylko wtedy, gdy gra nie wymaga innego profilu",
        "Só funciona se o jogo não exigir um perfil diferente",
        "Работает только в том случае, если игра не требует другого профиля",
        "Bu seçenek ancak oyun ayrı profillere giriş yapılmasını istemiyorsa etki eder",
        "Працює, лише якщо для гри не потрібен інший профіль",
        "Chỉ hoạt động nếu game không yêu cầu thêm tài khoản khác",
        ,
    ],
    "enable-mic-on-startup": [
        "Mikrofon bei Spielstart aktivieren",
        "Enable microphone on game launch",
        "Activar micrófono al iniciar el juego",
        "Activer le microphone lors du lancement du jeu",
        "Abilita il microfono all'avvio del gioco",
        "ゲーム起動時にマイクを有効化",
        "게임 시작 시 마이크 활성화",
        "Włącz mikrofon przy uruchomieniu gry",
        "Ativar microfone ao iniciar um jogo",
        "Автоматически включать микрофон при запуске игры",
        "Oyun başlarken mikrofonu aç",
        "Увімкнути мікрофон при запуску гри",
        "Bật mic lúc vào game",
        "游戏启动时打开麦克风",
    ],
    "enable-mkb": [
        "Maus- und Tastaturunterstützung aktivieren",
        "Enable Mouse & Keyboard support",
        "Habilitar soporte para ratón y teclado",
        ,
        "Abilitare il supporto di mouse e tastiera",
        "マウス＆キーボードのサポートを有効化",
        "마우스 & 키보드 활성화",
        "Włącz obsługę myszy i klawiatury",
        "Habilitar suporte ao Mouse & Teclado",
        "Включить поддержку мыши и клавиатуры",
        "Klavye ve fare desteğini aktive et",
        "Увімкнути підтримку миші та клавіатури",
        "Kích hoạt hỗ trợ Chuột & Bàn phím",
        "启用鼠标和键盘支持",
    ],
    "enable-quick-glance-mode": [
        "\"Kurzer Blick\"-Modus aktivieren",
        "Enable \"Quick Glance\" mode",
        "Activar modo \"Vista rápida\"",
        "Activer le mode \"Aperçu rapide\"",
        "Abilita la modalità Quick Glance",
        "クイック確認モードを有効化",
        "\"퀵 글랜스\" 모드 활성화",
        "Włącz tryb \"Quick Glance\"",
        "Ativar modo \"Relance\"",
        "Включить режим «Быстрый взгляд»",
        "\"Seri Bakış\" modunu aç",
        "Увімкнути режим \"Quick Glance\"",
        "Bật chế độ \"Xem nhanh\"",
        "仅在打开设置时显示统计信息",
    ],
    "enable-remote-play-feature": [
        "\"Remote Play\" Funktion aktivieren",
        "Enable the \"Remote Play\" feature",
        "Activar la función \"Reproducción remota\"",
        ,
        "Abilitare la funzione \"Riproduzione remota\"",
        "リモートプレイ機能を有効化",
        "\"리모트 플레이\" 기능 활성화",
        "Włącz funkcję \"Gra zdalna\"",
        "Ativar o recurso \"Reprodução Remota\"",
        "Включить функцию «Удаленная игра»",
        "\"Uzaktan Oynama\" özelliğini aktive et",
        "Увімкнути функцію \"Remote Play\"",
        "Bật tính năng \"Chơi Từ Xa\"",
        "启用\"远程播放\"功能",
    ],
    "enable-volume-control": [
        "Lautstärkeregelung aktivieren",
        "Enable volume control feature",
        "Habilitar la función de control de volumen",
        "Activer la fonction de contrôle du volume",
        "Abilità controlli volume",
        "音量調節機能を有効化",
        "음량 조절 기능 활성화",
        "Włącz funkcję kontroli głośności",
        "Ativar recurso de controle de volume",
        "Включить управление громкостью",
        "Ses düzeyini yönetmeyi etkinleştir",
        "Увімкнути функцію керування гучністю",
        "Bật tính năng điều khiển âm lượng",
        "启用音量控制",
    ],
    "enabled": [
        "Aktiviert",
        "Enabled",
        "Activado",
        ,
        ,
        "有効",
        "활성화됨",
        "Włączony",
        "Ativado",
        "Включено",
        "Açık",
        "Увімкнено",
        "Đã bật",
        "启用",
    ],
    "export": [
        "Exportieren",
        "Export",
        "Exportar",
        ,
        ,
        "エクスポート（書出し）",
        "내보내기",
        "Eksportuj",
        "Exportar",
        "Экспортировать",
        "Dışa aktar",
        "Експорт",
        "Xuất",
        "导出",
    ],
    "fast": [
        "Schnell",
        "Fast",
        "Rápido",
        ,
        "Veloce",
        "高速",
        "빠름",
        "Szybko",
        "Rápido",
        "Быстрый",
        "Hızlı",
        "Швидкий",
        "Nhanh",
        "快速",
    ],
    "fortnite-allow-stw-mode": [
        "Erlaubt das Spielen im \"STW\"-Modus auf Mobilgeräten",
        "Allows playing STW mode on mobile",
        "Permitir jugar al modo STW en el móvil",
        ,
        ,
        "モバイル版で「世界を救え」をプレイできるようになります",
        ,
        "Zezwól na granie w tryb STW na urządzeniu mobilnym",
        "Permitir a reprodução do modo STW no celular",
        "Позволяет играть в режиме STW на мобильных устройствах",
        "Mobil cihazda Fortnite: Dünyayı Kurtar modunu etkinleştir",
        "Дозволити відтворення режиму STW на мобільному пристрої",
        "Cho phép chơi chế độ STW trên điện thoại",
        ,
    ],
    "fortnite-force-console-version": [
        "Fortnite: Erzwinge Konsolenversion",
        "Fortnite: force console version",
        "Fortnite: forzar versión de consola",
        ,
        ,
        "Fortnite: 強制的にコンソール版を起動する",
        ,
        "Fortnite: wymuś wersję konsolową",
        "Fortnite: forçar versão para console",
        "Fortnite: форсированная консольная версия",
        "Fortnite'ın konsol sürümünü aç",
        "Fortnite: примусова консольна версія",
        "Fortnite: bắt buộc phiên bản console",
        ,
    ],
    "getting-consoles-list": [
        "Rufe Liste der Konsolen ab...",
        "Getting the list of consoles...",
        "Obteniendo la lista de consolas...",
        ,
        "Ottenere la lista delle consoles...",
        "本体のリストを取得中...",
        "콘솔 목록 불러오는 중...",
        "Pobieranie listy konsoli...",
        "Obtendo a lista de consoles...",
        "Получение списка консолей...",
        "Konsol listesine erişiliyor...",
        "Отримання списку консолей...",
        "Đang lấy danh sách các console...",
        "正在获取控制台列表...",
    ],
    "help": [
        "Hilfe",
        "Help",
        "Ayuda",
        ,
        ,
        "ヘルプ",
        ,
        "Pomoc",
        "Ajuda",
        "Справка",
        "Yardım",
        "Довідка",
        "Trợ giúp",
        "帮助",
    ],
    "hide-idle-cursor": [
        "Mauszeiger bei Inaktivität ausblenden",
        "Hide mouse cursor on idle",
        "Ocultar el cursor del ratón al estar inactivo",
        "Masquer le curseur de la souris",
        "Nascondi il cursore previa inattività",
        "マウスカーソルを3秒間動かしていない場合に非表示",
        "대기 상태에서 마우스 커서 숨기기",
        "Ukryj kursor myszy podczas bezczynności",
        "Ocultar o cursor do mouse quando ocioso",
        "Скрыть курсор мыши при бездействии",
        "Boştayken fare imlecini gizle",
        "Приховати курсор при очікуванні",
        "Ẩn con trỏ chuột khi không di chuyển",
        "空闲时隐藏鼠标",
    ],
    "hide-system-menu-icon": [
        "Symbol des System-Menüs ausblenden",
        "Hide System menu's icon",
        "Ocultar el icono del menú del sistema",
        "Masquer l'icône du menu système",
        "Nascondi icona del menu a tendina",
        "システムメニューのアイコンを非表示",
        "시스템 메뉴 아이콘 숨기기",
        "Ukryj ikonę menu systemu",
        "Ocultar ícone do menu do Sistema",
        "Скрыть значок системного меню",
        "Sistem menüsü simgesini gizle",
        "Приховати іконку системного меню",
        "Ẩn biểu tượng của menu Hệ thống",
        "隐藏系统菜单图标",
    ],
    "horizontal-sensitivity": [
        "Horizontale Empfindlichkeit",
        "Horizontal sensitivity",
        "Sensibilidad horizontal",
        ,
        ,
        "左右方向の感度",
        ,
        "Czułość pozioma",
        "Sensibilidade horizontal",
        "Горизонтальная чувствительность",
        "Yatay hassasiyet",
        "Горизонтальна чутливість",
        "Độ nhạy ngang",
        "水平灵敏度",
    ],
    "import": [
        "Importieren",
        "Import",
        "Importar",
        ,
        ,
        "インポート（読込み）",
        "가져오기",
        "Importuj",
        "Importar",
        "Импортировать",
        "İçeri aktar",
        "Імпорт",
        "Nhập",
        "导入",
    ],
    "keyboard-shortcuts": [
        "Tastatur-Shortcuts",
        "Keyboard shortcuts",
        "Atajos del teclado",
        ,
        ,
        "キーボードショートカット",
        ,
        "Skróty klawiszowe",
        "Atalhos do teclado",
        "Горячие клавиши",
        "Klavye kısayolları",
        "Комбінації клавіш",
        "Các phím tắt bàn phím",
        "键盘快捷键",
    ],
    "language": [
        "Sprache",
        "Language",
        "Idioma",
        "Langue",
        "Lingua",
        "言語",
        "언어",
        "Język",
        "Linguagem",
        "Язык",
        "Dil",
        "Мова",
        "Ngôn ngữ",
        "切换语言",
    ],
    "large": [
        "Groß",
        "Large",
        "Grande",
        "Grande",
        "Grande",
        "大",
        "크게",
        "Duży",
        "Largo",
        "Большой",
        "Büyük",
        "Великий",
        "Lớn",
        "大",
    ],
    "layout": [
        "Layout",
        "Layout",
        "Diseño",
        ,
        "Layout",
        "レイアウト",
        "레이아웃",
        "Układ",
        "Layout",
        "Расположение",
        "Arayüz Görünümü",
        "Розмітка",
        "Bố cục",
        "布局",
    ],
    "left-stick": [
        "Linker Stick",
        "Left stick",
        "Joystick izquierdo",
        ,
        ,
        "左スティック",
        "왼쪽 스틱",
        "Lewy drążek analogowy",
        "Direcional analógico esquerdo",
        "Левый стик",
        "Sol analog çubuk",
        "Лівий стік",
        "Analog trái",
        "左摇杆",
    ],
    "loading-screen": [
        "Ladebildschirm",
        "Loading screen",
        "Pantalla de carga",
        "Écran de chargement",
        "Schermata di caricamento",
        "ロード画面",
        "로딩 화면",
        "Ekran wczytywania",
        "Tela de Carregamento",
        "Экран загрузки",
        "Yükleme ekranı",
        "Екран завантаження",
        "Màn hình chờ",
        "载入画面",
    ],
    "local-co-op": [
        ,
        "Local co-op",
        "Co-op local",
        ,
        ,
        "ローカルマルチプレイ",
        ,
        ,
        "Co-op local",
        ,
        ,
        "Локальний co-op",
        "Chơi chung cục bộ",
        ,
    ],
    "map-mouse-to": [
        "Maus binden an",
        "Map mouse to",
        "Mapear ratón a",
        ,
        ,
        "マウスの割り当て",
        ,
        "Przypisz myszkę do",
        "Mapear o mouse para",
        "Наведите мышку на",
        "Fareyi ata",
        "Прив'язати мишу до",
        "Gán chuột với",
        "将鼠标映射到",
    ],
    "may-not-work-properly": [
        "Funktioniert evtl. nicht fehlerfrei!",
        "May not work properly!",
        "¡Puede que no funcione correctamente!",
        ,
        "Potrebbe non funzionare correttamente!",
        "正常に動作しない場合があります！",
        "제대로 작동하지 않을 수 있음!",
        "Może nie działać poprawnie!",
        "Pode não funcionar corretamente!",
        "Может работать некорректно!",
        "Düzgün çalışmayabilir!",
        "Може працювати некоректно!",
        "Có thể không hoạt động!",
        "可能无法正常工作！",
    ],
    "menu-stream-settings": [
        "Stream Einstellungen",
        "Stream settings",
        "Ajustes del stream",
        "Réglages Stream",
        "Impostazioni dello stream",
        "ストリーミング設定",
        "스트리밍 설정",
        "Ustawienia strumienia",
        "Ajustes de transmissão",
        "Настройки потоковой передачи",
        "Yayın ayarları",
        "Налаштування трансляції",
        "Cấu hình stream",
        "串流设置",
    ],
    "menu-stream-stats": [
        "Stream Statistiken",
        "Stream stats",
        "Estadísticas del stream",
        "Statistiques du stream",
        "Statistiche dello stream",
        "ストリーミング統計情報",
        "통계",
        "Statystyki strumienia",
        "Estatísticas da transmissão",
        "Статистика стрима",
        "Yayın durumu",
        "Статистика трансляції",
        "Thông số stream",
        "串流统计数据",
    ],
    "microphone": [
        "Mikrofon",
        "Microphone",
        "Micrófono",
        ,
        "Microfono",
        "マイク",
        "마이크",
        "Mikrofon",
        "Microfone",
        "Микрофон",
        "Mikrofon",
        "Мікрофон",
        "Micro",
        "麦克风",
    ],
    "mkb-adjust-ingame-settings": [
        "Vielleicht müssen auch Empfindlichkeit & Deadzone in den Spieleinstellungen angepasst werden",
        "You may also need to adjust the in-game sensitivity & deadzone settings",
        "También puede que necesites ajustar la sensibilidad del juego y la configuración de la zona muerta",
        ,
        ,
        "ゲーム内の設定で感度とデッドゾーンの調整が必要な場合があります",
        ,
        "Może być również konieczne dostosowanie czułości w grze i ustawienia 'martwej strefy' urządzenia",
        "Você também pode precisar ajustar as configurações de sensibilidade e zona morta no jogo",
        "Также может потребоваться изменить настройки чувствительности и мертвой зоны в игре",
        "Bu seçenek etkinken bile oyun içi seçeneklerden hassasiyet ve ölü bölge ayarlarını düzeltmeniz gerekebilir",
        "Можливо, вам також доведеться регулювати чутливість і deadzone у параметрах гри",
        "Có thể bạn cần phải điều chỉnh các thông số độ nhạy và điểm chết trong game",
        "您可能还需要调整游戏内的灵敏度和死区设置",
    ],
    "mkb-click-to-activate": [
        "Klicken zum Aktivieren",
        "Click to activate",
        "Haz clic para activar",
        ,
        ,
        "マウスクリックで開始",
        ,
        "Kliknij, aby aktywować",
        "Clique para ativar",
        "Нажмите, чтобы активировать",
        "Etkinleştirmek için tıklayın",
        "Натисніть, щоб активувати",
        "Nhấn vào để kích hoạt",
        "单击以启用",
    ],
    "mkb-disclaimer": [
        "Das Nutzen dieser Funktion beim Online-Spielen könnte als Betrug angesehen werden",
        "Using this feature when playing online could be viewed as cheating",
        "Usar esta función al jugar en línea podría ser visto como trampas",
        ,
        ,
        "オンラインプレイでこの機能を使用すると不正行為と判定される可能性があります",
        ,
        "Używanie tej funkcji podczas grania online może być postrzegane jako oszukiwanie",
        "Usar esta função em jogos online pode ser considerado como uma forma de trapaça",
        "Использование этой функции при игре онлайн может рассматриваться как читерство",
        "Bu özellik çevrimiçi oyunlarda sizi hile yapıyormuşsunuz gibi gösterebilir",
        "Використання цієї функції під час гри онлайн може розглядатися як шахрайство",
        "Sử dụng chức năng này khi chơi trực tuyến có thể bị xem là gian lận",
        "游玩在线游戏时，使用此功能可能被视为作弊。",
    ],
    "mouse-and-keyboard": [
        "Maus & Tastatur",
        "Mouse & Keyboard",
        "Ratón y teclado",
        ,
        "Mouse e tastiera",
        "マウス＆キーボード",
        "마우스 & 키보드",
        "Mysz i klawiatura",
        "Mouse e Teclado",
        "Мышь и клавиатура",
        "Klavye ve Fare",
        "Миша та клавіатура",
        "Chuột và Bàn phím",
        "鼠标和键盘",
    ],
    "muted": [
        "Stumm",
        "Muted",
        "Silenciado",
        ,
        "Microfono disattivato",
        "ミュート",
        "음소거",
        "Wyciszony",
        "Mudo",
        "Выкл микрофон",
        "Kapalı",
        "Без звуку",
        "Đã tắt âm",
        "静音",
    ],
    "name": [
        "Name",
        "Name",
        "Nombre",
        ,
        ,
        "名前",
        "이름",
        "Nazwa",
        "Nome",
        "Имя",
        "İsim",
        "Назва",
        "Tên",
        "名称",
    ],
    "new": [
        "Neu",
        "New",
        "Nuevo",
        ,
        ,
        "新しい",
        "새로 만들기",
        "Nowy",
        "Novo",
        "Создать",
        "Yeni",
        "Новий",
        "Tạo mới",
        "新建",
    ],
    "no-consoles-found": [
        "Keine Konsolen gefunden",
        "No consoles found",
        "No se encontraron consolas",
        ,
        "Nessuna console trovata",
        "本体が見つかりません",
        "콘솔을 찾을 수 없음",
        "Nie znaleziono konsoli",
        "Nenhum console encontrado",
        "Консолей не найдено",
        "Konsol bulunamadı",
        "Не знайдено консолі",
        "Không tìm thấy console nào",
        "未找到主机",
    ],
    "normal": [
        "Mittel",
        "Normal",
        "Normal",
        "Normal",
        "Normale",
        "標準",
        "보통",
        "Normalny",
        "Normal",
        "Средний",
        "Normal",
        "Нормальний",
        "Thường",
        "中",
    ],
    "off": [
        "Aus",
        "Off",
        "Apagado",
        "Désactivé",
        "Off",
        "オフ",
        "꺼짐",
        "Wyłączone",
        "Desligado",
        "Выключен",
        "Kapalı",
        "Вимкнено",
        "Tắt",
        "关",
    ],
    "on": [
        "An",
        "On",
        "Activado",
        ,
        "Attivo",
        "オン",
        "켜짐",
        "Włącz",
        "Ativado",
        "Вкл",
        "Açık",
        "Увімкнено",
        "Bật",
        "开启",
    ],
    "only-supports-some-games": [
        "Unterstützt nur einige Spiele",
        "Only supports some games",
        "Sólo soporta algunos juegos",
        ,
        "Supporta solo alcuni giochi",
        "一部のゲームのみサポート",
        "몇몇 게임만 지원",
        "Wspiera tylko niektóre gry",
        "Suporta apenas alguns jogos",
        "Поддерживает только некоторые игры",
        "Yalnızca belli oyunlar destekleniyor",
        "Підтримує лише деякі ігри",
        "Chỉ hỗ trợ một vài game",
        "仅支持一些游戏",
    ],
    "opacity": [
        "Deckkraft",
        "Opacity",
        "Opacidad",
        "Opacité",
        "Opacità",
        "透過度",
        "불투명도",
        "Przezroczystość",
        "Opacidade",
        "Непрозрачность",
        "Saydamsızlık",
        "Непрозорість",
        "Độ mờ",
        "透明度",
    ],
    "other": [
        "Sonstiges",
        "Other",
        "Otro",
        "Autres",
        "Altro",
        "その他",
        "기타",
        "Inne",
        "Outros",
        "Прочее",
        "Diğer",
        "Інше",
        "Khác",
        "其他",
    ],
    "playing": [
        "Spielt",
        "Playing",
        "Jugando",
        ,
        ,
        "プレイ中",
        "플레이 중",
        "W grze",
        "Jogando",
        "Играет",
        "Şu anda oyunda",
        "Гра триває",
        "Đang chơi",
        "游戏中",
    ],
    "position": [
        "Position",
        "Position",
        "Posición",
        "Position",
        "Posizione",
        "位置",
        "위치",
        "Pozycja",
        "Posição",
        "Расположение",
        "Konum",
        "Позиція",
        "Vị trí",
        "位置",
    ],
    "powered-off": [
        "Ausgeschaltet",
        "Powered off",
        "Desactivado",
        ,
        "Spento",
        "本体オフ",
        "전원 꺼짐",
        "Zasilanie wyłączone",
        "Desligado",
        "Выключено",
        "Kapalı",
        "Вимкнений",
        "Đã tắt nguồn",
        "关机",
    ],
    "powered-on": [
        "Eingeschaltet",
        "Powered on",
        "Activado",
        ,
        "Acceso",
        "本体オン",
        "전원 켜짐",
        "Zasilanie włączone",
        "Ligado",
        "Включено",
        "Açık",
        "Увімкнений",
        "Đang bật nguồn",
        "开机",
    ],
    "prefer-ipv6-server": [
        "IPv6-Server bevorzugen",
        "Prefer IPv6 server",
        "Servidor IPv6 preferido",
        "Préférer le serveur IPv6",
        "Preferisci server IPv6",
        "IPv6 サーバーを優先",
        "IPv6 서버 우선",
        "Preferuj serwer IPv6",
        "Preferir servidor IPV6",
        "Предпочитать IPv6 сервер",
        "IPv6 sunucusunu tercih et",
        "Віддавати перевагу IPv6",
        "Ưu tiên máy chủ IPv6",
        "优先使用 IPv6 服务器",
    ],
    "preferred-game-language": [
        "Bevorzugte Spielsprache",
        "Preferred game's language",
        "Idioma preferencial del juego",
        "Langue préférée du jeu",
        "Lingua del gioco preferita",
        "ゲームの優先言語設定",
        "선호하는 게임 언어",
        "Preferowany język gry",
        "Idioma preferencial do jogo",
        "Предпочитаемый язык игры",
        "Oyunda tercih edilen dil",
        "Бажана мова гри",
        "Ngôn ngữ game ưu tiên",
        "首选游戏语言",
    ],
    "preset": [
        "Voreinstellung",
        "Preset",
        "Preajuste",
        ,
        ,
        "プリセット",
        "프리셋",
        "Szablon",
        "Predefinição",
        "Шаблон",
        "Hazır ayar",
        "Пресет",
        "Thiết lập sẵn",
        "预设",
    ],
    "press-esc-to-cancel": [
        "Zum Abbrechen \"Esc\" drücken",
        "Press Esc to cancel",
        "Presione Esc para cancelar",
        ,
        ,
        "Escを押してキャンセル",
        "ESC를 눌러 취소",
        "Naciśnij Esc, aby anulować",
        "Pressione Esc para cancelar",
        "Нажмите Esc для отмены",
        "İptal etmek için Esc'ye basın",
        "Натисніть Esc, щоб скасувати",
        "Nhấn Esc để bỏ qua",
        "按下ESC键以取消",
    ],
    "press-key-to-toggle-mkb": [
        e => `${e.key}: Maus- und Tastaturunterstützung an-/ausschalten`,
        e => `Press ${e.key} to toggle the Mouse and Keyboard feature`,
        e => `Pulsa ${e.key} para activar la función de ratón y teclado`,
        ,
        ,
        e => `${e.key} キーでマウスとキーボードの機能を切り替える`,
        e => `${e.key} 키를 눌러 마우스와 키보드 기능을 활성화 하십시오`,
        e => `Naciśnij ${e.key}, aby przełączyć funkcję myszy i klawiatury`,
        e => `Pressione ${e.key} para ativar/desativar a função de Mouse e Teclado`,
        e => `Нажмите ${e.key} для переключения функции мыши и клавиатуры`,
        e => `Klavye ve fare özelliğini açmak için ${e.key} tuşuna basın`,
        e => `Натисніть ${e.key}, щоб увімкнути або вимкнути функцію миші та клавіатури`,
        e => `Nhấn ${e.key} để bật/tắt tính năng Chuột và Bàn phím`,
        e => `按下 ${e.key} 切换键鼠模式`,
    ],
    "press-to-bind": [
        "Zum Festlegen Taste drücken oder mit der Maus klicken...",
        "Press a key or do a mouse click to bind...",
        "Presione una tecla o haga un clic del ratón para enlazar...",
        ,
        ,
        "キーを押すかマウスをクリックして割り当て...",
        "정지하려면 아무키나 마우스를 클릭해주세요...",
        "Naciśnij klawisz lub kliknij myszą, aby przypisać...",
        "Pressione uma tecla ou clique do mouse para vincular...",
        "Нажмите клавишу или щелкните мышкой, чтобы связать...",
        "Klavyedeki bir tuşa basarak veya fareyle tıklayarak tuş ataması yapın...",
        "Натисніть клавішу або кнопку миші, щоб прив'язати...",
        "Nhấn nút hoặc nhấn chuột để gán...",
        "按相应按键或鼠标键来绑定",
    ],
    "prompt-preset-name": [
        "Voreinstellung Name:",
        "Preset's name:",
        "Nombre del preajuste:",
        ,
        ,
        "プリセット名:",
        "프리셋 이름:",
        "Nazwa szablonu:",
        "Nome da predefinição:",
        "Имя шаблона:",
        "Hazır ayar adı:",
        "Назва пресету:",
        "Tên của mẫu sẵn:",
        "预设名称：",
    ],
    "ratio": [
        "Seitenverhältnis",
        "Ratio",
        "Relación de aspecto",
        "Ratio",
        "Rapporto",
        "比率",
        "화면 비율",
        "Współczynnik proporcji",
        "Proporção",
        "Соотношение сторон",
        "Görüntü oranı",
        "Співвідношення сторін",
        "Tỉ lệ",
        "宽高比",
    ],
    "reduce-animations": [
        "Animationen reduzieren",
        "Reduce UI animations",
        "Reduce las animaciones de la interfaz",
        "Réduire les animations dans l’interface",
        "Animazioni ridottte",
        "UIアニメーションを減らす",
        "애니메이션 감소",
        "Ogranicz animacje interfejsu",
        "Reduzir animações da interface",
        "Убрать анимации интерфейса",
        "Arayüz animasyonlarını azalt",
        "Зменшити анімацію інтерфейсу",
        "Giảm hiệu ứng chuyển động",
        "减少UI动画",
    ],
    "region": [
        "Region",
        "Region",
        "Región",
        "Région",
        "Regione",
        "地域",
        "지역",
        "Region",
        "Região",
        "Регион",
        "Bölge",
        "Регіон",
        "Khu vực",
        "地区",
    ],
    "remote-play": [
        "Remote Play",
        "Remote Play",
        "Reproducción remota",
        ,
        "Riproduzione Remota",
        "リモートプレイ",
        "리모트 플레이",
        "Gra zdalna",
        "Jogo Remoto",
        "Удаленная игра",
        "Uzaktan Bağlanma",
        "Віддалена гра",
        "Chơi Từ Xa",
        "远程游玩",
    ],
    "rename": [
        "Umbenennen",
        "Rename",
        "Renombrar",
        ,
        ,
        "名前変更",
        "이름 바꾸기",
        "Zmień nazwę",
        "Renomear",
        "Переименовать",
        "Ad değiştir",
        "Перейменувати",
        "Sửa tên",
        "重命名",
    ],
    "right-click-to-unbind": [
        "Rechtsklick auf Taste: Zuordnung aufheben",
        "Right-click on a key to unbind it",
        "Clic derecho en una tecla para desvincularla",
        ,
        ,
        "右クリックで割り当て解除",
        "할당 해제하려면 키를 오른쪽 클릭하세요",
        "Kliknij prawym przyciskiem myszy na klawisz, aby anulować przypisanie",
        "Clique com o botão direito em uma tecla para desvinculá-la",
        "Щелкните правой кнопкой мыши по кнопке, чтобы отвязать её",
        "Tuş atamasını kaldırmak için fareyle sağ tık yapın",
        "Натисніть правою кнопкою миші, щоб відв'язати",
        "Nhấn chuột phải lên một phím để gỡ nó",
        "右键解除绑定",
    ],
    "right-stick": [
        "Rechter Stick",
        "Right stick",
        "Joystick derecho",
        ,
        ,
        "右スティック",
        "오른쪽 스틱",
        "Prawy drążek analogowy",
        "Direcional analógico direito",
        "Правый стик",
        "Sağ analog çubuk",
        "Правий стік",
        "Analog phải",
        "右摇杆",
    ],
    "rocket-always-hide": [
        "Immer ausblenden",
        "Always hide",
        "Ocultar siempre",
        "Toujours masquer",
        "Nascondi sempre",
        "常に非表示",
        "항상 숨기기",
        "Zawsze ukrywaj",
        "Sempre ocultar",
        "Всегда скрывать",
        "Her zaman gizle",
        "Ховати завжди",
        "Luôn ẩn",
        "始终隐藏",
    ],
    "rocket-always-show": [
        "Immer anzeigen",
        "Always show",
        "Mostrar siempre",
        "Toujours afficher",
        "Mostra sempre",
        "常に表示",
        "항상 표시",
        "Zawsze pokazuj",
        "Sempre mostrar",
        "Всегда показывать",
        "Her zaman göster",
        "Показувати завжди",
        "Luôn hiển thị",
        "始终显示",
    ],
    "rocket-animation": [
        "Raketen Animation",
        "Rocket animation",
        "Animación del cohete",
        "Animation de la fusée",
        "Razzo animato",
        "ロケットのアニメーション",
        "로켓 애니메이션",
        "Animacja rakiety",
        "Animação do foguete",
        "Анимация ракеты",
        "Roket animasyonu",
        "Анімація ракети",
        "Phi thuyền",
        "火箭动画",
    ],
    "rocket-hide-queue": [
        "Bei Warteschlange ausblenden",
        "Hide when queuing",
        "Ocultar al hacer cola",
        "Masquer lors de la file d'attente",
        "Nascondi durante la coda",
        "待機中は非表示",
        "대기 중에는 숨기기",
        "Ukryj podczas czekania w kolejce",
        "Ocultar quando estiver na fila",
        "Скрыть, когда есть очередь",
        "Sıradayken gizle",
        "Не показувати у черзі",
        "Ẩn khi xếp hàng chờ",
        "排队时隐藏",
    ],
    "safari-failed-message": [
        "Ausführen von \"Better xCloud\" fehlgeschlagen. Versuche es erneut, bitte warten...",
        "Failed to run Better xCloud. Retrying, please wait...",
        "No se pudo ejecutar Better xCloud. Reintentando, por favor espera...",
        "Impossible d'exécuter Better xCloud. Nouvelle tentative, veuillez patienter...",
        "Si è verificato un errore durante l'esecuzione di Better xCloud. Nuovo tentativo, attendere...",
        "Better xCloud の実行に失敗しました。再試行中...",
        "Better xCloud 시작에 실패했습니다. 재시도중이니 잠시만 기다려 주세요.",
        "Nie udało się uruchomić Better xCloud. Ponawiam próbę...",
        "Falha ao executar o Better xCloud. Tentando novamente, aguarde...",
        "Не удалось запустить Better xCloud. Идет перезапуск, пожалуйста, подождите...",
        "Better xCloud çalıştırılamadı. Yeniden deneniyor...",
        "Не вдалий старт Better xCloud. Повторна спроба, будь ласка, зачекайте...",
        "Không thể chạy Better xCloud. Đang thử lại, vui lòng chờ...",
        "插件无法运行。正在重试，请稍候...",
    ],
    "saturation": [
        "Sättigung",
        "Saturation",
        "Saturación",
        "Saturation",
        "Saturazione",
        "彩度",
        "채도",
        "Nasycenie",
        "Saturação",
        "Насыщенность",
        "Renk doygunluğu",
        "Насиченість",
        "Độ bão hòa",
        "饱和度",
    ],
    "save": [
        "Speichern",
        "Save",
        "Guardar",
        ,
        ,
        "保存",
        "저장",
        "Zapisz",
        "Salvar",
        "Сохранить",
        "Kaydet",
        "Зберегти",
        "Lưu",
        "保存",
    ],
    "screenshot-button-position": [
        "Position des Screenshot-Buttons",
        "Screenshot button's position",
        "Posición del botón de captura de pantalla",
        "Position du bouton de capture d'écran",
        "Posizione del pulsante screenshot",
        "スクリーンショットボタンの位置",
        "스크린샷 버튼 위치",
        "Pozycja przycisku zrzutu ekranu",
        "Posição do botão de captura de tela",
        "Расположение кнопки скриншота",
        "Ekran görüntüsü düğmesi konumu",
        "Позиція кнопки скриншоту",
        "Vị trí của nút Chụp màn hình",
        "截图按钮位置",
    ],
    "separate-touch-controller": [
        "Trenne Touch-Controller & Controller #1",
        "Separate Touch controller & Controller #1",
        "Separar controlador táctil y controlador #1",
        ,
        ,
        "タッチコントローラーとコントローラー#1を分ける",
        ,
        ,
        "Separar o Controle por Toque e o Controle #1",
        "Раздельный сенсорный контроллер и контроллер #1",
        ,
        "Окремо Сенсорний контролер та Контролер #1",
        "Tách biệt Bộ điều khiển cảm ứng và Tay cầm #1",
        ,
    ],
    "separate-touch-controller-note": [
        "Touch-Controller ist Spieler 1, Controller #1 ist Spieler 2",
        "Touch controller is Player 1, Controller #1 is Player 2",
        "El controlador táctil es Jugador 1, Controlador #1 es Jugador 2",
        ,
        ,
        "タッチコントローラーがプレイヤー1、コントローラー#1がプレイヤー2に割り当てられます",
        ,
        ,
        "O Controle por Toque é o Jogador 1, o Controle #1 é o Jogador 2",
        "Сенсорный контроллер — игрок 1, контроллер #1 — игрок 2",
        ,
        "Сенсорний контролер це Гравець 1, Контролер #1 це Гравець 2",
        "Bộ điều khiển cảm ứng là Người chơi 1, Tay cầm #1 là Người chơi 2",
        ,
    ],
    "server": [
        "Server",
        "Server",
        "Servidor",
        "Serveur",
        "Server",
        "サーバー",
        "서버",
        "Serwer",
        "Servidor",
        "Сервер",
        "Sunucu",
        "Сервер",
        "Máy chủ",
        "服务器",
    ],
    "settings-reload": [
        "Seite neu laden und Änderungen anwenden",
        "Reload page to reflect changes",
        "Actualice la página para aplicar los cambios",
        "Recharger la page pour bénéficier des changements",
        "Applica e ricarica la pagina",
        "ページを更新をして設定変更を適用",
        "적용 및 페이지 새로고침",
        "Odśwież stronę, aby zastosować zmiany",
        "Recarregue a página para refletir as alterações",
        "Перезагрузить страницу, чтобы применить изменения",
        "Kaydetmek için sayfayı yenile",
        "Перезавантажте сторінку, щоб застосувати зміни",
        "Tải lại trang để áp dụng các thay đổi",
        "重新加载页面以应用更改",
    ],
    "settings-reloading": [
        "Wird neu geladen...",
        "Reloading...",
        "Recargando...",
        "Actualisation...",
        "Ricaricamento...",
        "更新中...",
        "새로고침하는 중...",
        "Ponowne ładowanie...",
        "Recarregando...",
        "Перезагрузка...",
        "Sayfa yenileniyor...",
        "Перезавантаження...",
        "Đang tải lại...",
        "正在重新加载...",
    ],
    "shortcut-keys": [
        "Shortcut-Tasten",
        "Shortcut keys",
        "Teclas de atajo",
        ,
        ,
        "ショートカットキー",
        ,
        "Skróty klawiszowe",
        "Teclas de atalho",
        "Горячие клавиши",
        "Kısayol tuşları",
        "Клавіші швидкого доступу",
        "Các phím tắt",
        "快捷键",
    ],
    "show-game-art": [
        "Poster des Spiels anzeigen",
        "Show game art",
        "Mostrar imagen del juego",
        "Afficher la couverture du jeu",
        "Mostra immagine del gioco",
        "ゲームアートを表示",
        "게임 아트 표시",
        "Pokaż okładkę gry",
        "Mostrar arte do jogo",
        "Показывать игровую обложку",
        "Oyun resmini göster",
        "Показувати ігровий арт",
        "Hiển thị ảnh game",
        "显示游戏封面",
    ],
    "show-stats-on-startup": [
        "Statistiken beim Start des Spiels anzeigen",
        "Show stats when starting the game",
        "Mostrar estadísticas al iniciar el juego",
        "Afficher les statistiques au démarrage de la partie",
        "Mostra le statistiche quando si avvia la partita",
        "ゲーム開始時に統計情報を表示",
        "게임 시작 시 통계 보여주기",
        "Pokaż statystyki podczas uruchamiania gry",
        "Mostrar estatísticas ao iniciar o jogo",
        "Показывать статистику при запуске игры",
        "Oyun başlatırken yayın durumunu göster",
        "Показувати статистику при запуску гри",
        "Hiển thị thông số khi vào game",
        "开始游戏时显示统计信息",
    ],
    "show-wait-time": [
        "Geschätzte Wartezeit anzeigen",
        "Show the estimated wait time",
        "Mostrar el tiempo de espera estimado",
        "Afficher le temps d'attente estimé",
        "Mostra una stima del tempo di attesa",
        "推定待機時間を表示",
        "예상 대기 시간 표시",
        "Pokaż szacowany czas oczekiwania",
        "Mostrar o tempo estimado de espera",
        "Показать предполагаемое время до запуска",
        "Tahminî bekleme süresini göster",
        "Показувати орієнтовний час очікування",
        "Hiển thị thời gian chờ dự kiến",
        "显示预计等待时间",
    ],
    "simplify-stream-menu": [
        "Stream-Menü vereinfachen",
        "Simplify Stream's menu",
        "Simplificar el menú del stream",
        "Simplifier le menu Stream",
        "Semplifica il menu della trasmissione",
        "ストリーミングメニューのラベルを非表示",
        "메뉴 간단히 보기",
        "Uprość menu strumienia",
        "Simplificar menu de transmissão",
        "Упростить меню потока",
        "Yayın menüsünü basitleştir",
        "Спростити меню трансляції",
        "Đơn giản hóa menu của Stream",
        "简化菜单",
    ],
    "skip-splash-video": [
        "Xbox-Logo bei Spielstart überspringen",
        "Skip Xbox splash video",
        "Saltar vídeo de presentación de Xbox",
        "Ignorer la vidéo de démarrage Xbox",
        "Salta il logo Xbox iniziale",
        "Xboxの起動画面をスキップ",
        "Xbox 스플래시 건너뛰기",
        "Pomiń wstępne intro Xbox",
        "Pular introdução do Xbox",
        "Пропустить видео с заставкой Xbox",
        "Xbox açılış ekranını atla",
        "Пропустити заставку Xbox",
        "Bỏ qua video Xbox",
        "跳过 Xbox 启动动画",
    ],
    "slow": [
        "Langsam",
        "Slow",
        "Lento",
        ,
        "Lento",
        "低速",
        "느림",
        "Wolno",
        "Lento",
        "Медленный",
        "Yavaş",
        "Повільний",
        "Chậm",
        "慢速",
    ],
    "small": [
        "Klein",
        "Small",
        "Pequeño",
        "Petite",
        "Piccolo",
        "小",
        "작게",
        "Mały",
        "Pequeno",
        "Маленький",
        "Küçük",
        "Маленький",
        "Nhỏ",
        "小",
    ],
    "smart-tv": [
        "Smart TV",
        "Smart TV",
        "Smart TV",
        ,
        "Smart TV",
        "スマートTV",
        "스마트 TV",
        "Smart TV",
        "Smart TV",
        "Smart TV",
        "Akıllı TV",
        "Smart TV",
        "TV thông minh",
        "智能电视",
    ],
    "sound": [
        "Ton",
        "Sound",
        "Sonido",
        ,
        "Suoni",
        "サウンド",
        "소리",
        "Dźwięk",
        "Som",
        "Звук",
        "Ses",
        "Звук",
        "Âm thanh",
        "声音",
    ],
    "standby": [
        "Standby",
        "Standby",
        "Modo de espera",
        ,
        "Sospendi",
        "スタンバイ",
        "대기",
        "Stan czuwania",
        "Suspenso",
        "Режим ожидания",
        "Beklemede",
        "Режим очікування",
        "Đang ở chế độ chờ",
        "待机",
    ],
    "stat-bitrate": [
        "Bitrate",
        "Bitrate",
        "Tasa de bits",
        "Bitrate",
        "Bitrate",
        "ビットレート",
        "비트레이트",
        "Bitrate",
        "Bitrate",
        "Скорость соединения",
        "Bit hızı",
        "Бітрейт",
        "Bitrate",
        "码率",
    ],
    "stat-decode-time": [
        "Dekodierzeit",
        "Decode time",
        "Tiempo de decodificación",
        "Décodage",
        "Decodifica",
        "デコード時間",
        "디코딩 시간",
        "Czas dekodowania",
        "Tempo de decodificação",
        "Время декодирования",
        "Kod çözme süresi",
        "Час декодування",
        "Thời gian giải mã",
        "解码时间",
    ],
    "stat-fps": [
        "Framerate",
        "FPS",
        "FPS",
        "FPS",
        "FPS",
        "FPS",
        "FPS",
        "FPS",
        "FPS",
        "Кадр/сек",
        "FPS",
        "Кадрів на секунду",
        "FPS",
        "帧率",
    ],
    "stat-frames-lost": [
        "Verlorene Frames",
        "Frames lost",
        "Pérdida de fotogramas",
        "Images perdues",
        "Perdita di fotogrammi",
        "フレームロス",
        "프레임 손실",
        "Utracone klatki",
        "Quadros perdidos",
        "Потери кадров",
        "Kare kaybı",
        "Кадрів втрачено",
        "Số khung hình bị mất",
        "丢帧",
    ],
    "stat-packets-lost": [
        "Paketverluste",
        "Packets lost",
        "Pérdida de paquetes",
        "Perte paquets",
        "Perdita di pacchetti",
        "パケットロス",
        "패킷 손실",
        "Utracone pakiety",
        "Pacotes perdidos",
        "Потери пакетов",
        "Paket kaybı",
        "Пакетів втрачено",
        "Số gói tin bị mất",
        "丢包",
    ],
    "stat-ping": [
        "Ping",
        "Ping",
        "Latencia",
        "Ping",
        "Ping",
        "Ping",
        "지연 시간",
        "Ping",
        "Ping",
        "Задержка соединения",
        "Gecikme",
        "Затримка",
        "Ping",
        "延迟",
    ],
    "stats": [
        "Statistiken",
        "Stats",
        "Estadísticas",
        "Stats",
        "Statistiche",
        "統計情報",
        "통계",
        "Statystyki",
        "Estatísticas",
        "Статистика",
        "Durum",
        "Статистика",
        "Các thông số",
        "统计信息",
    ],
    "stick-decay-minimum": [
        "Stick Abklingzeit Minimum",
        "Stick decay minimum",
        "Disminuir mínimamente el analógico",
        ,
        ,
        "スティックの減衰の最小値",
        ,
        "Minimalne opóźnienie drążka",
        "Mínimo decaimento do analógico",
        "Минимальная перезарядка стика",
        "Çubuğun ortalanma süresi minimumu",
        "Мінімальне згасання стіка",
        "Độ suy giảm tối thiểu của cần điều khiển",
        "最小摇杆回中延迟",
    ],
    "stick-decay-strength": [
        "Stick Abklingzeit Geschwindigkeit",
        "Stick decay strength",
        "Intensidad de decaimiento del analógico",
        ,
        ,
        "スティックの減衰の強さ",
        ,
        "Siła opóźnienia drążka",
        "Força de decaimento do analógico",
        "Скорость перезарядки стика",
        "Çubuğun ortalanma gücü",
        "Сила згасання стіка",
        "Sức mạnh độ suy giảm của cần điều khiển",
        "摇杆回中强度",
    ],
    "stream": [
        "Stream",
        "Stream",
        "Stream",
        "Stream",
        "Stream",
        "ストリーミング",
        "스트리밍",
        "Stream",
        "Transmissão",
        "Видеопоток",
        "Yayın",
        "Трансляція",
        "Stream",
        "串流",
    ],
    "stretch": [
        "Strecken",
        "Stretch",
        "Estirado",
        "Étirer",
        "Riempi",
        "引き伸ばし",
        "채우기",
        "Rozciągnij",
        "Esticar",
        "Растянуть",
        "Genişlet",
        "Розтягнути",
        "Kéo giãn",
        "拉伸",
    ],
    "support-better-xcloud": [
        "\"Better xCloud\" unterstützen",
        "Support Better xCloud",
        "Apoyar a Better xCloud",
        ,
        ,
        "Better xCloudをサポート",
        ,
        "Wesprzyj Better xCloud",
        "Suporte ao Melhor xCloud",
        "Поддержать Better xCloud",
        "Better xCloud'a destek ver",
        "Підтримати Better xCloud",
        "Ủng hộ Better xCloud",
        "赞助本插件",
    ],
    "swap-buttons": [
        "Tasten tauschen",
        "Swap buttons",
        "Intercambiar botones",
        ,
        ,
        "ボタン入れ替え",
        "버튼 바꾸기",
        "Zamień przyciski",
        "Trocar botões",
        "Поменять кнопки",
        "Düğme düzenini ters çevir",
        "Поміняти кнопки місцями",
        "Hoán đổi nút",
        "交换按钮",
    ],
    "target-resolution": [
        "Festgelegte Auflösung",
        "Target resolution",
        "Calidad de imagen",
        "Résolution cible",
        "Risoluzione prevista",
        "ターゲット解像度",
        "목표 해상도",
        "Rozdzielczość docelowa",
        "Resolução alvo",
        "Целевое разрешение",
        "Tercih edilen çözünürlük",
        "Цільова роздільна здатність",
        "Độ phân giải",
        "目标分辨率",
    ],
    "tc-all-games": [
        "Alle Spiele",
        "All games",
        "Todos los juegos",
        "Tous les jeux",
        "Tutti i giochi",
        "全てのゲームで有効",
        "모든 게임",
        "Wszystkie gry",
        "Todos os jogos",
        "Все игры",
        "Tüm oyunlar",
        "Всі ігри",
        "Tất cả các game",
        "所有游戏",
    ],
    "tc-all-white": [
        "Komplett weiß",
        "All white",
        "Todo blanco",
        "Tout blanc",
        "Tutti bianchi",
        "オールホワイト",
        "모두 하얗게",
        "Wszystkie białe",
        "Todo branco",
        "Полностью белые",
        "Hepsi beyaz",
        "Все біле",
        "Trắng hoàn toàn",
        "白色",
    ],
    "tc-availability": [
        "Verfügbarkeit",
        "Availability",
        "Disponibilidad",
        "Disponibilité",
        "Disponibilità",
        "強制的に有効化",
        "사용 여부",
        "Dostępność",
        "Disponibilidade",
        "В каких играх включить",
        "Uygunluk durumu",
        "Доступність",
        "Khả dụng",
        "启用",
    ],
    "tc-custom-layout-style": [
        "Angepasstes Layout Button Stil",
        "Custom layout's button style",
        "Estilo de botones de diseño personalizado",
        "Style personnalisé des boutons",
        "Layout dei tasti personalizzato",
        "カスタムレイアウト",
        "커스텀 레이아웃의 버튼 스타일",
        "Niestandardowy układ przycisków",
        "Estilo de botão do layout personalizado",
        "Пользовательский стиль кнопок",
        "Özelleştirilmiş düğme düzeninin biçimi",
        "Користувацький стиль кнопок",
        "Màu của bố cục tùy chọn",
        "特殊游戏按钮样式",
    ],
    "tc-muted-colors": [
        "Matte Farben",
        "Muted colors",
        "Colores apagados",
        "Couleurs adoucies",
        "Riduci intensità colori",
        "ミュートカラー",
        "저채도 색상",
        "Stonowane kolory",
        "Cores silenciadas",
        "Приглушенные цвета",
        "Yumuşak renkler",
        "Приглушені кольори",
        "Màu câm",
        "低饱和度",
    ],
    "tc-standard-layout-style": [
        "Standard Layout Button Stil",
        "Standard layout's button style",
        "Estilo de botones de diseño estándar",
        "Style standard des boutons",
        "Layout dei tasti standard",
        "標準レイアウト",
        "표준 레이아웃의 버튼 스타일",
        "Standardowy układ przycisków",
        "Estilo de botão do layout padrão",
        "Стандартный стиль кнопок",
        "Varsayılan düğme düzeninin biçimi",
        "Стандартний стиль кнопок",
        "Màu của bố cục tiêu chuẩn",
        "通用按钮样式",
    ],
    "text-size": [
        "Textgröße",
        "Text size",
        "Tamano del texto",
        "Taille du texte",
        "Dimensione del testo",
        "文字サイズ",
        "글자 크기",
        "Rozmiar tekstu",
        "Tamanho do texto",
        "Размер текста",
        "Metin boyutu",
        "Розмір тексту",
        "Cỡ chữ",
        "文字大小",
    ],
    "top-center": [
        "Oben zentriert",
        "Top-center",
        "Superior centrado",
        "En haut au centre",
        "In alto al centro",
        "上",
        "중앙 상단",
        "Wyśrodkowany na górze",
        "Superior-centralizado",
        "Сверху",
        "Orta üst",
        "Зверху праворуч",
        "Chính giữa phía trên",
        "顶部居中",
    ],
    "top-left": [
        "Oben links",
        "Top-left",
        "Superior izquierdo",
        "Haut-gauche",
        "In alto a sinistra",
        "左上",
        "좌측 상단",
        "Lewy górny róg",
        "Superior-esquerdo",
        "Левый верхний угол",
        "Sol üst",
        "Зверху ліворуч",
        "Phía trên bên trái",
        "左上角",
    ],
    "top-right": [
        "Oben rechts",
        "Top-right",
        "Superior derecho",
        "En haut à droite",
        "In alto a destra",
        "右上",
        "우측 상단",
        "Prawy górny róg",
        "Superior-direito",
        "Справа",
        "Sağ üst",
        "Зверху праворуч",
        "Phía trên bên phải",
        "右上角",
    ],
    "touch-control-layout": [
        "Touch-Steuerungslayout",
        "Touch control layout",
        "Diseño de control táctil",
        ,
        ,
        "タッチコントロールレイアウト",
        ,
        "Układ sterowania dotykowego",
        "Layout do controle por toque",
        "Расположение сенсорных кнопок",
        "Dokunmatik kontrol şeması",
        "Розташування сенсорного керування",
        "Bố cục điều khiển cảm ứng",
        "触摸控制布局",
    ],
    "touch-controller": [
        "Touch-Controller",
        "Touch controller",
        "Controles táctiles",
        "Commandes tactiles",
        "Controller Touch",
        "タッチコントローラー",
        "터치 컨트롤",
        "Sterowanie dotykiem",
        "Controle de toque",
        "Сенсорные кнопки",
        "Dokunmatik oyun kumandası",
        "Сенсорне керування",
        "Bộ điều khiển cảm ứng",
        "虚拟摇杆",
    ],
    "transparent-background": [
        "Transparenter Hintergrund",
        "Transparent background",
        "Fondo transparente",
        "Fond transparent",
        "Sfondo trasparente",
        "背景の透過",
        "투명 배경",
        "Przezroczyste tło",
        "Fundo transparente",
        "Прозрачный фон",
        "Saydam arka plan",
        "Прозоре тло",
        "Trong suốt màu nền",
        "透明背景",
    ],
    "ui": [
        "Benutzeroberfläche",
        "UI",
        "Interfaz de usuario",
        "Interface utilisateur",
        "Interfaccia",
        "UI",
        "UI",
        "Interfejs",
        "Interface",
        "Интерфейс",
        "Kullanıcı arayüzü",
        "Інтерфейс користувача",
        "Giao diện",
        "UI",
    ],
    "unknown": [
        "Unbekannt",
        "Unknown",
        "Desconocido",
        ,
        "Sconosciuto",
        "不明",
        "알 수 없음",
        "Nieznane",
        "Desconhecido",
        "Неизвестный",
        "Bilinmiyor",
        "Невідомий",
        "Không rõ",
        "未知",
    ],
    "unlimited": [
        "Unbegrenzt",
        "Unlimited",
        "Ilimitado",
        ,
        "Illimitato",
        "無制限",
        "제한없음",
        "Bez ograniczeń",
        "Ilimitado",
        "Неограничено",
        "Limitsiz",
        "Необмежено",
        "Không giới hạn",
        "无限制",
    ],
    "unmuted": [
        "Ton an",
        "Unmuted",
        "Activar sonido",
        ,
        "Microfono attivato",
        "ミュート解除",
        "음소거 해제",
        "Wyciszenie wyłączone",
        "Sem Mudo",
        "Вкл микрофон",
        "Açık",
        "Увімкнути звук",
        "Đã mở âm",
        "已取消静音",
    ],
    "use-mouse-absolute-position": [
        "Absolute Position der Maus verwenden",
        "Use mouse's absolute position",
        "Usar la posición absoluta del ratón",
        ,
        ,
        "マウスの絶対座標を使用",
        "마우스 절대위치 사용",
        "Użyj pozycji bezwzględnej myszy",
        "Usar posição absoluta do mouse",
        "Использовать абсолютное положение мыши",
        "Farenin mutlak pozisyonunu baz al",
        "Використовувати абсолютне положення миші",
        "Sử dụng vị trí tuyệt đối của chuột",
        "使用鼠标的绝对位置",
    ],
    "user-agent-profile": [
        "User-Agent Profil",
        "User-Agent profile",
        "Perfil del agente de usuario",
        "Profil de l'agent utilisateur",
        "User-Agent",
        "ユーザーエージェントプロファイル",
        "사용자 에이전트 프로파일",
        "Profil User-Agent",
        "Perfil do User-Agent",
        "Профиль устройства",
        "Kullanıcı aracısı profili",
        "Профіль User-Agent",
        "User-Agent",
        "浏览器UA伪装",
    ],
    "vertical-sensitivity": [
        "Vertikale Empfindlichkeit",
        "Vertical sensitivity",
        "Sensibilidad Vertical",
        ,
        ,
        "上下方向の感度",
        ,
        "Czułość pionowa",
        "Sensibilidade vertical",
        "Вертикальная чувствительность",
        "Dikey hassasiyet",
        "Вертикальна чутливість",
        "Độ ngạy dọc",
        "垂直灵敏度",
    ],
    "vibration-intensity": [
        "Vibrationsstärke",
        "Vibration intensity",
        "Intensidad de la vibración",
        ,
        ,
        "振動の強さ",
        "진동 세기",
        "Siła wibracji",
        "Intensidade da vibração",
        "Сила вибрации",
        "Titreşim gücü",
        "Інтенсивність вібрації",
        "Cường độ rung",
        "振动强度",
    ],
    "video": [
        "Video",
        "Video",
        "Video",
        "Vidéo",
        "Video",
        "映像",
        "비디오",
        "Obraz",
        "Vídeo",
        "Видео",
        "Görüntü",
        "Відео",
        "Hình ảnh",
        "视频",
    ],
    "visual-quality": [
        "Bildqualität",
        "Visual quality",
        "Calidad visual",
        "Qualité visuelle",
        "Profilo codec preferito",
        "画質",
        "시각적 품질",
        "Jakość grafiki",
        "Qualidade visual",
        "Качество видеопотока",
        "Görüntü kalitesi",
        "Візуальна якість",
        "Chất lượng hình ảnh",
        "画质",
    ],
    "visual-quality-high": [
        "Hoch",
        "High",
        "Alto",
        "Élevée",
        "Alta",
        "高",
        "높음",
        "Wysoka",
        "Alto",
        "Высокое",
        "Yüksek",
        "Високий",
        "Cao",
        "高",
    ],
    "visual-quality-low": [
        "Niedrig",
        "Low",
        "Bajo",
        "Basse",
        "Bassa",
        "低",
        "낮음",
        "Niska",
        "Baixo",
        "Низкое",
        "Düşük",
        "Низький",
        "Thấp",
        "低",
    ],
    "visual-quality-normal": [
        "Mittel",
        "Normal",
        "Normal",
        "Normal",
        "Normale",
        "中",
        "보통",
        "Normalna",
        "Normal",
        "Среднее",
        "Normal",
        "Нормальний",
        "Thường",
        "中",
    ],
    "volume": [
        "Lautstärke",
        "Volume",
        "Volumen",
        "Volume",
        "Volume",
        "音量",
        "음량",
        "Głośność",
        "Volume",
        "Громкость",
        "Ses düzeyi",
        "Гучність",
        "Âm lượng",
        "音量",
    ],
    "wait-time-countdown": [
        "Countdown",
        "Countdown",
        "Cuenta Regresiva",
        "Compte à rebours",
        "Countdown",
        "カウントダウン",
        "카운트다운",
        "Pozostały czas oczekiwania",
        "Contagem regressiva",
        "Время до запуска",
        "Geri sayım",
        "Зворотній відлік",
        "Đếm ngược",
        "倒计时",
    ],
    "wait-time-estimated": [
        "Geschätzte Endzeit",
        "Estimated finish time",
        "Tiempo estimado de finalización",
        "Temps estimé avant la fin",
        "Tempo residuo stimato",
        "推定完了時間",
        "예상 완료 시간",
        "Szacowany czas zakończenia",
        "Tempo estimado de conclusão",
        "Примерное время запуска",
        "Tahminî bitiş süresi",
        "Розрахунковий час завершення",
        "Thời gian hoàn thành dự kiến",
        "预计等待时间",
    ],
}

const LOCALE = Translations.getLocale();
const t = Translations.get;


const ENABLE_SAFARI_WORKAROUND = true;
if (ENABLE_SAFARI_WORKAROUND && document.readyState !== 'loading') {
    // Stop loading
    window.stop();

    // Show the reloading overlay
    const css = `
.bx-reload-overlay {
    position: fixed;
    top: 0;
    background: #000000cc;
    z-index: 9999;
    width: 100%;
    line-height: 100vh;
    color: #fff;
    text-align: center;
    font-weight: 400;
    font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    font-size: 1.3rem;
}
`;
    const $fragment = document.createDocumentFragment();
    $fragment.appendChild(CE('style', {}, css));
    $fragment.appendChild(CE('div', {'class': 'bx-reload-overlay'}, t('safari-failed-message')));

    document.documentElement.appendChild($fragment);

    // Reload the page
    window.location.reload(true);

    // Stop processing the script
    throw new Error('[Better xCloud] Executing workaround for Safari');
}

// Automatically reload the page when running into the "We are sorry..." error message
window.addEventListener('load', e => {
    setTimeout(() => {
        if (document.body.classList.contains('legacyBackground')) {
            // Has error message -> reload page
            window.stop();
            window.location.reload(true);
        }
    }, 3000);
});


const NATIVE_FETCH = window.fetch;
const SERVER_REGIONS = {};
var IS_PLAYING = false;
var STREAM_WEBRTC;
var STREAM_AUDIO_CONTEXT;
var STREAM_AUDIO_GAIN_NODE;
var $STREAM_VIDEO;
var $SCREENSHOT_CANVAS;
var GAME_TITLE_ID;
var GAME_XBOX_TITLE_ID;
var GAME_PRODUCT_ID;
var APP_CONTEXT;

window.BX_EXPOSED = {};

let IS_REMOTE_PLAYING;
let REMOTE_PLAY_CONFIG;

const HAS_TOUCH_SUPPORT = ('ontouchstart' in window || navigator.maxTouchPoints > 0);

// Credit: https://phosphoricons.com
const Icon = {
    STREAM_SETTINGS: '<g transform="matrix(.142357 0 0 .142357 -2.22021 -2.22164)" fill="none" stroke="#fff" stroke-width="16"><circle cx="128" cy="128" r="40"/><path d="M130.05 206.11h-4L94 224c-12.477-4.197-24.049-10.711-34.11-19.2l-.12-36c-.71-1.12-1.38-2.25-2-3.41L25.9 147.24a99.16 99.16 0 0 1 0-38.46l31.84-18.1c.65-1.15 1.32-2.29 2-3.41l.16-36C69.951 42.757 81.521 36.218 94 32l32 17.89h4L162 32c12.477 4.197 24.049 10.711 34.11 19.2l.12 36c.71 1.12 1.38 2.25 2 3.41l31.85 18.14a99.16 99.16 0 0 1 0 38.46l-31.84 18.1c-.65 1.15-1.32 2.29-2 3.41l-.16 36A104.59 104.59 0 0 1 162 224l-31.95-17.89z"/></g>',
    STREAM_STATS: '<path d="M1.181 24.55v-3.259c0-8.19 6.576-14.952 14.767-14.98H16c8.13 0 14.819 6.69 14.819 14.819v3.42c0 .625-.515 1.14-1.14 1.14H2.321c-.625 0-1.14-.515-1.14-1.14z"/><path d="M16 6.311v4.56M12.58 25.69l9.12-12.54m4.559 5.7h4.386m-29.266 0H5.74"/>',
    CONTROLLER: '<path d="M19.193 12.807h3.193m-13.836 0h4.257"/><path d="M10.678 10.678v4.257"/><path d="M13.061 19.193l-5.602 6.359c-.698.698-1.646 1.09-2.633 1.09-2.044 0-3.725-1.682-3.725-3.725a3.73 3.73 0 0 1 .056-.646l2.177-11.194a6.94 6.94 0 0 1 6.799-5.721h11.722c3.795 0 6.918 3.123 6.918 6.918s-3.123 6.918-6.918 6.918h-8.793z"/><path d="M18.939 19.193l5.602 6.359c.698.698 1.646 1.09 2.633 1.09 2.044 0 3.725-1.682 3.725-3.725a3.73 3.73 0 0 0-.056-.646l-2.177-11.194"/>',
    DISPLAY: '<path d="M1.238 21.119c0 1.928 1.565 3.493 3.493 3.493H27.27c1.928 0 3.493-1.565 3.493-3.493V5.961c0-1.928-1.565-3.493-3.493-3.493H4.731c-1.928 0-3.493 1.565-3.493 3.493v15.158zm19.683 8.413H11.08"/>',
    MOUSE: '<path d="M26.256 8.185c0-3.863-3.137-7-7-7h-6.512c-3.863 0-7 3.137-7 7v15.629c0 3.863 3.137 7 7 7h6.512c3.863 0 7-3.137 7-7V8.185z"/><path d="M16 13.721V6.883"/>',
    MOUSE_SETTINGS: '<g transform="matrix(1.10403 0 0 1.10403 -4.17656 -.560429)" fill="none" stroke="#fff"><g stroke-width="1.755"><path d="M24.49 16.255l.01-8.612A6.15 6.15 0 0 0 18.357 1.5h-5.714A6.15 6.15 0 0 0 6.5 7.643v13.715a6.15 6.15 0 0 0 6.143 6.143h5.714"/><path d="M15.5 12.501v-6"/></g><circle cx="48" cy="48" r="15" stroke-width="7.02" transform="matrix(.142357 0 0 .142357 17.667421 16.541885)"/><path d="M24.61 27.545h-.214l-1.711.955c-.666-.224-1.284-.572-1.821-1.025l-.006-1.922-.107-.182-1.701-.969c-.134-.678-.134-1.375 0-2.053l1.7-.966.107-.182.009-1.922c.537-.454 1.154-.803 1.82-1.029l1.708.955h.214l1.708-.955c.666.224 1.284.572 1.821 1.025l.006 1.922.107.182 1.7.968c.134.678.134 1.375 0 2.053l-1.7.966-.107.182-.009 1.922c-.536.455-1.154.804-1.819 1.029l-1.706-.955z" stroke-width=".999"/></g>',
    NEW: '<path d="M26.875 30.5H5.125c-.663 0-1.208-.545-1.208-1.208V2.708c0-.663.545-1.208 1.208-1.208h14.5l8.458 8.458v19.333c0 .663-.545 1.208-1.208 1.208z"/><path d="M19.625 1.5v8.458h8.458m-15.708 9.667h7.25"/><path d="M16 16v7.25"/>',
    COPY: '<path d="M1.498 6.772h23.73v23.73H1.498zm5.274-5.274h23.73v23.73"/>',
    TRASH: '<path d="M29.5 6.182h-27m9.818 7.363v9.818m7.364-9.818v9.818"/><path d="M27.045 6.182V29.5c0 .673-.554 1.227-1.227 1.227H6.182c-.673 0-1.227-.554-1.227-1.227V6.182m17.181 0V3.727a2.47 2.47 0 0 0-2.455-2.455h-7.364a2.47 2.47 0 0 0-2.455 2.455v2.455"/>',
    CURSOR_TEXT: '<path d="M16 7.3a5.83 5.83 0 0 1 5.8-5.8h2.9m0 29h-2.9a5.83 5.83 0 0 1-5.8-5.8"/><path d="M7.3 30.5h2.9a5.83 5.83 0 0 0 5.8-5.8V7.3a5.83 5.83 0 0 0-5.8-5.8H7.3"/><path d="M11.65 16h8.7"/>',
    QUESTION: '<g transform="matrix(.256867 0 0 .256867 -16.878964 -18.049342)"><circle cx="128" cy="180" r="12" fill="#fff"/><path d="M128 144v-8c17.67 0 32-12.54 32-28s-14.33-28-32-28-32 12.54-32 28v4" fill="none" stroke="#fff" stroke-width="16"/></g>',

    REMOTE_PLAY: '<g transform="matrix(.492308 0 0 .581818 -14.7692 -11.6364)"><clipPath id="A"><path d="M30 20h65v55H30z"/></clipPath><g clip-path="url(#A)"><g transform="matrix(.395211 0 0 .334409 11.913 7.01124)"><g transform="matrix(.555556 0 0 .555556 57.8889 -20.2417)" fill="none" stroke="#fff" stroke-width="13.88"><path d="M200 140.564c-42.045-33.285-101.955-33.285-144 0M168 165c-23.783-17.3-56.217-17.3-80 0"/></g><g transform="matrix(-.555556 0 0 -.555556 200.111 262.393)"><g transform="matrix(1 0 0 1 0 11.5642)"><path d="M200 129c-17.342-13.728-37.723-21.795-58.636-24.198C111.574 101.378 80.703 109.444 56 129" fill="none" stroke="#fff" stroke-width="13.88"/></g><path d="M168 165c-23.783-17.3-56.217-17.3-80 0" fill="none" stroke="#fff" stroke-width="13.88"/></g><g transform="matrix(.75 0 0 .75 32 32)"><path d="M24 72h208v93.881H24z" fill="none" stroke="#fff" stroke-linejoin="miter" stroke-width="9.485"/><circle cx="188" cy="128" r="12" stroke-width="10" transform="matrix(.708333 0 0 .708333 71.8333 12.8333)"/><path d="M24.358 103.5h110" fill="none" stroke="#fff" stroke-linecap="butt" stroke-width="10.282"/></g></g></g></g>',

    HAND_TAP: '<path d="M6.537 8.906c0-4.216 3.469-7.685 7.685-7.685s7.685 3.469 7.685 7.685M7.719 30.778l-4.333-7.389C3.133 22.944 3 22.44 3 21.928a2.97 2.97 0 0 1 2.956-2.956 2.96 2.96 0 0 1 2.55 1.461l2.761 4.433V8.906a2.97 2.97 0 0 1 2.956-2.956 2.97 2.97 0 0 1 2.956 2.956v8.276a2.97 2.97 0 0 1 2.956-2.956 2.97 2.97 0 0 1 2.956 2.956v2.365a2.97 2.97 0 0 1 2.956-2.956A2.97 2.97 0 0 1 29 19.547v5.32c0 3.547-1.182 5.911-1.182 5.911"/>',

    SCREENSHOT_B64: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDMyIDMyIiBmaWxsPSIjZmZmIj48cGF0aCBkPSJNMjguMzA4IDUuMDM4aC00LjI2NWwtMi4wOTctMy4xNDVhMS4yMyAxLjIzIDAgMCAwLTEuMDIzLS41NDhoLTkuODQ2YTEuMjMgMS4yMyAwIDAgMC0xLjAyMy41NDhMNy45NTYgNS4wMzhIMy42OTJBMy43MSAzLjcxIDAgMCAwIDAgOC43MzF2MTcuMjMxYTMuNzEgMy43MSAwIDAgMCAzLjY5MiAzLjY5MmgyNC42MTVBMy43MSAzLjcxIDAgMCAwIDMyIDI1Ljk2MlY4LjczMWEzLjcxIDMuNzEgMCAwIDAtMy42OTItMy42OTJ6bS02Ljc2OSAxMS42OTJjMCAzLjAzOS0yLjUgNS41MzgtNS41MzggNS41MzhzLTUuNTM4LTIuNS01LjUzOC01LjUzOCAyLjUtNS41MzggNS41MzgtNS41MzggNS41MzggMi41IDUuNTM4IDUuNTM4eiIvPjwvc3ZnPgo=',
};


class Dialog {
    constructor(options) {
        const {
            title,
            className,
            content,
            hideCloseButton,
            onClose,
            helpUrl,
        } = options;

        // Create dialog overlay
        this.$overlay = document.querySelector('.bx-dialog-overlay');
        if (!this.$overlay) {
            this.$overlay = CE('div', {'class': 'bx-dialog-overlay bx-gone'});

            // Disable right click
            this.$overlay.addEventListener('contextmenu', e => e.preventDefault());

            document.documentElement.appendChild(this.$overlay);
        }

        let $close;
        this.onClose = onClose;
        this.$dialog = CE('div', {'class': `bx-dialog ${className || ''} bx-gone`},
                this.$title = CE('h2', {}, CE('b', {}, title),
                        helpUrl && createButton({
                                icon: Icon.QUESTION,
                                style: ButtonStyle.GHOST,
                                title: t('help'),
                                url: helpUrl,
                            }),
                    ),
                this.$content = CE('div', {'class': 'bx-dialog-content'}, content),
                !hideCloseButton && ($close = CE('button', {}, t('close'))),
            );

        $close && $close.addEventListener('click', e => {
            this.hide(e);
        });

        !title && this.$title.classList.add('bx-gone');
        !content && this.$content.classList.add('bx-gone');

        // Disable right click
        this.$dialog.addEventListener('contextmenu', e => e.preventDefault());

        document.documentElement.appendChild(this.$dialog);
    }

    show(newOptions) {
        // Clear focus
        document.activeElement && document.activeElement.blur();

        if (newOptions && newOptions.title) {
            this.$title.querySelector('b').textContent = newOptions.title;
            this.$title.classList.remove('bx-gone');
        }

        this.$dialog.classList.remove('bx-gone');
        this.$overlay.classList.remove('bx-gone');

        document.body.classList.add('bx-no-scroll');
    }

    hide(e) {
        this.$dialog.classList.add('bx-gone');
        this.$overlay.classList.add('bx-gone');

        document.body.classList.remove('bx-no-scroll');

        this.onClose && this.onClose(e);
    }

    toggle() {
        this.$dialog.classList.toggle('bx-gone');
        this.$overlay.classList.toggle('bx-gone');
    }
}


class RemotePlay {
    static XCLOUD_TOKEN;
    static XHOME_TOKEN;
    static #CONSOLES;

    static #STATE_LABELS = {
        'On': t('powered-on'),
        'Off': t('powered-off'),
        'ConnectedStandby': t('standby'),
        'Unknown': t('unknown'),
    };

    static get BASE_DEVICE_INFO() {
        return {
            appInfo: {
                env: {
                    clientAppId: window.location.host,
                    clientAppType: 'browser',
                    clientAppVersion: '21.1.98',
                    clientSdkVersion: '8.5.3',
                    httpEnvironment: 'prod',
                    sdkInstallId: '',
                },
            },
            dev: {
                displayInfo: {
                    dimensions: {
                        widthInPixels: 1920,
                        heightInPixels: 1080,
                    },
                    pixelDensity: {
                        dpiX: 1,
                        dpiY: 1,
                    },
                },
                hw: {
                    make: 'Microsoft',
                    model: 'unknown',
                    sdktype: 'web',
                },
                os: {
                    name: 'windows',
                    ver: '22631.2715',
                    platform: 'desktop',
                },
                browser: {
                    browserName: 'chrome',
                    browserVersion: '119.0',
                },
            },
        };
    }

    static #dialog;
    static #$content;
    static #$consoles;

    static #initialize() {
        if (RemotePlay.#$content) {
            return;
        }

        RemotePlay.#$content = CE('div', {}, t('getting-consoles-list'));
        RemotePlay.#dialog = new Dialog({
            title: t('remote-play'),
            content: RemotePlay.#$content,
            helpUrl: 'https://better-xcloud.github.io/remote-play/',
        });

        RemotePlay.#getXhomeToken(() => {
            RemotePlay.#getConsolesList(() => {
                console.log(RemotePlay.#CONSOLES);
                RemotePlay.#renderConsoles();
            });
        });
    }

    static #renderConsoles() {
        const $fragment = document.createDocumentFragment();

        if (!RemotePlay.#CONSOLES || RemotePlay.#CONSOLES.length === 0) {
            $fragment.appendChild(CE('span', {}, t('no-consoles-found')));
        } else {
            const $settingNote = CE('p', {});

            const resolutions = [1080, 720];
            const currentResolution = getPref(Preferences.REMOTE_PLAY_RESOLUTION);
            const $resolutionSelect = CE('select', {});
            for (const resolution of resolutions) {
                const value = `${resolution}p`;

                const $option = CE('option', {'value': value}, value);
                if (currentResolution === value) {
                    $option.selected = true;
                }

                $resolutionSelect.appendChild($option);
            }
            $resolutionSelect.addEventListener('change', e => {
                const value = $resolutionSelect.value;

                $settingNote.textContent = value === '1080p' ? '✅ ' + t('can-stream-xbox-360-games') : '❌ ' + t('cant-stream-xbox-360-games');
                setPref(Preferences.REMOTE_PLAY_RESOLUTION, value);
            });
            $resolutionSelect.dispatchEvent(new Event('change'));

            const $qualitySettings = CE('div', {'class': 'bx-remote-play-settings'},
                CE('div', {},
                    CE('label', {}, t('target-resolution'), $settingNote),
                    $resolutionSelect,
                )
            );

            $fragment.appendChild($qualitySettings);
        }

        for (let con of RemotePlay.#CONSOLES) {
            let $connectButton;
            const $child = CE('div', {'class': 'bx-remote-play-device-wrapper'},
                CE('div', {'class': 'bx-remote-play-device-info'},
                    CE('div', {},
                        CE('span', {'class': 'bx-remote-play-device-name'}, con.deviceName),
                        CE('span', {'class': 'bx-remote-play-console-type'}, con.consoleType.replace('Xbox', ''))
                    ),
                    CE('div', {'class': 'bx-remote-play-power-state'}, RemotePlay.#STATE_LABELS[con.powerState]),
                ),

                // Connect button
                createButton({
                    classes: ['bx-remote-play-connect-button'],
                    label: t('console-connect'),
                    style: ButtonStyle.PRIMARY,
                    onClick: e => {
                            REMOTE_PLAY_CONFIG = {
                                serverId: con.serverId,
                            };
                            window.BX_REMOTE_PLAY_CONFIG = REMOTE_PLAY_CONFIG;

                            const url = window.location.href.substring(0, 31) + '/launch/fortnite/BT5P2X999VH2#remote-play';

                            const $pageContent = document.getElementById('PageContent');
                            const $anchor = CE('a', { href: url, class: 'bx-hidden bx-offscreen' }, '');
                            $anchor.addEventListener('click', e => {
                                setTimeout(() => {
                                    $pageContent.removeChild($anchor);
                                }, 1000);
                            });

                            $pageContent.appendChild($anchor);
                            $anchor.click();

                            RemotePlay.#dialog.hide();
                        },
                }),
            );

            $fragment.appendChild($child);
        }

        RemotePlay.#$content.parentElement.replaceChild($fragment, RemotePlay.#$content);
    }

    static detect() {
        if (!getPref(Preferences.REMOTE_PLAY_ENABLED)) {
            return;
        }

        IS_REMOTE_PLAYING = window.location.pathname.includes('/launch/') && window.location.hash.startsWith('#remote-play');
        if (IS_REMOTE_PLAYING) {
            window.BX_REMOTE_PLAY_CONFIG = REMOTE_PLAY_CONFIG;
            // Remove /launch/... from URL
            window.history.replaceState({origin: 'better-xcloud'}, '', 'https://www.xbox.com/' + location.pathname.substring(1, 6) + '/play');
        } else {
            window.BX_REMOTE_PLAY_CONFIG = null;
        }
    }

    static #getXhomeToken(callback) {
        if (RemotePlay.XHOME_TOKEN) {
            callback();
            return;
        }

        let GSSV_TOKEN;
        try {
            GSSV_TOKEN = JSON.parse(localStorage.getItem('xboxcom_xbl_user_info')).tokens['http://gssv.xboxlive.com/'].token;
        } catch (e) {
            for (let i = 0; i < localStorage.length; i++){
                const key = localStorage.key(i);
                if (!key.startsWith('Auth.User.')) {
                    continue;
                }

                const json = JSON.parse(localStorage.getItem(key));
                for (const token of json.tokens) {
                    if (!token.relyingParty.includes('gssv.xboxlive.com')) {
                        continue;
                    }

                    GSSV_TOKEN = token.tokenData.token;
                    break;
                }

                break;
            }
        }

        fetch('https://xhome.gssv-play-prod.xboxlive.com/v2/login/user', {
            method: 'POST',
            body: JSON.stringify({
                offeringId: 'xhome',
                token: GSSV_TOKEN,
            }),
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
            },
        }).then(resp => resp.json())
            .then(json => {
                RemotePlay.XHOME_TOKEN = json.gsToken;
                callback();
            });
    }

    static async #getConsolesList(callback) {
        if (RemotePlay.#CONSOLES) {
            callback();
            return;
        }

        let servers;
        if (!REMOTE_PLAY_SERVER) {
            servers = ['wus2', 'eus', 'uks']; // Possible values: wus2 (WestUS2), eus (EastUS), uks (UkSouth)
        } else {
            servers = REMOTE_PLAY_SERVER;
        }

        const options = {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${RemotePlay.XHOME_TOKEN}`,
                },
            };

        // Test servers one by one
        for (const server of servers) {
            try {
                const url = `https://${server}.gssv-play-prodxhome.xboxlive.com/v6/servers/home?mr=50`;
                const resp = await fetch(url, options);

                const json = await resp.json();
                RemotePlay.#CONSOLES = json.results;

                // Store working server
                REMOTE_PLAY_SERVER = server;

                callback();
                break;
            } catch (e) {}
        }

        // None of the servers worked
        if (!REMOTE_PLAY_SERVER) {
            RemotePlay.#CONSOLES = [];
        }
    }

    static showDialog() {
        RemotePlay.#initialize();
        RemotePlay.#dialog.show();
    }
}


class TitlesInfo {
    static #INFO = {};

    static get(titleId) {
        return TitlesInfo.#INFO[titleId];
    }

    static update(titleId, info) {
        TitlesInfo.#INFO[titleId] = TitlesInfo.#INFO[titleId] || {};
        Object.assign(TitlesInfo.#INFO[titleId], info);
    }

    static saveFromTitleInfo(titleInfo) {
        const details = titleInfo.details;
        TitlesInfo.update(details.productId, {
            titleId: titleInfo.titleId,
            xboxTitleId: details.xboxTitleId,
            // Has more than one input type -> must have touch support
            hasTouchSupport: (details.supportedInputTypes.length > 1),
        });
    }

    static saveFromCatalogInfo(catalogInfo) {
        const titleId = catalogInfo.StoreId;
        const imageHero = (catalogInfo.Image_Hero || catalogInfo.Image_Tile || {}).URL;
        TitlesInfo.update(titleId, {
            imageHero: imageHero,
        });
    }

    static hasTouchSupport(titleId) {
        const gameInfo = TitlesInfo.#INFO[titleId] || {};
        return !!gameInfo.hasTouchSupport;
    }

    static requestCatalogInfo(titleId, callback) {
        const url = `https://catalog.gamepass.com/v3/products?market=${APP_CONTEXT.marketInfo.market}&language=${APP_CONTEXT.marketInfo.locale}&hydration=RemoteHighSapphire0`;
        const appVersion = document.querySelector('meta[name=gamepass-app-version]').content;

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Ms-Cv': APP_CONTEXT.telemetryInfo.initialCv,
                'Calling-App-Name': 'Xbox Cloud Gaming Web',
                'Calling-App-Version': appVersion,
            },
            body: JSON.stringify({
                Products: [titleId],
            }),
        }).then(resp => {
            callback && callback(TitlesInfo.get(titleId));
        });
    }
}


class LoadingScreen {
    static #$bgStyle;
    static #$waitTimeBox;

    static #waitTimeInterval;
    static #orgWebTitle;

    static #secondsToString(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);

        const mDisplay = m > 0 ? `${m}m`: '';
        const sDisplay = `${s}s`.padStart(s >=0 ? 3 : 4, '0');
        return mDisplay + sDisplay;
    }

    static setup() {
        // Get titleId from location
        const match = window.location.pathname.match(/\/launch\/[^\/]+\/([\w\d]+)/);
        if (!match) {
            return;
        }

        if (!LoadingScreen.#$bgStyle) {
            const $bgStyle = createElement('style');
            document.documentElement.appendChild($bgStyle);
            LoadingScreen.#$bgStyle = $bgStyle;
        }

        const titleId = match[1];
        const titleInfo = TitlesInfo.get(titleId);
        if (titleInfo && titleInfo.imageHero) {
            LoadingScreen.#setBackground(titleInfo.imageHero);
        } else {
            TitlesInfo.requestCatalogInfo(titleId, info => {
                info && info.imageHero && LoadingScreen.#setBackground(info.imageHero);
            });
        }

        if (getPref(Preferences.UI_LOADING_SCREEN_ROCKET) === 'hide') {
            LoadingScreen.#hideRocket();
        }
    }

    static #hideRocket() {
        let $bgStyle = LoadingScreen.#$bgStyle;

        const css = `
#game-stream div[class*=RocketAnimation-module__container] > svg {
    display: none;
}
`;
        $bgStyle.textContent += css;
    }

    static #setBackground(imageUrl) {
        // Setup style tag
        let $bgStyle = LoadingScreen.#$bgStyle;

        // Limit max width to reduce image size
        imageUrl = imageUrl + '?w=1920';

        const css = `
#game-stream {
    background-image: linear-gradient(#00000033, #000000e6), url(${imageUrl}) !important;
    background-color: transparent !important;
    background-position: center center !important;
    background-repeat: no-repeat !important;
    background-size: cover !important;
}

#game-stream rect[width="800"] {
    transition: opacity 0.3s ease-in-out !important;
}
`;
        $bgStyle.textContent += css;

        const bg = new Image();
        bg.onload = e => {
            $bgStyle.textContent += `
#game-stream rect[width="800"] {
    opacity: 0 !important;
}
`;
        };
        bg.src = imageUrl;
    }

    static setupWaitTime(waitTime) {
        // Hide rocket when queing
        if (getPref(Preferences.UI_LOADING_SCREEN_ROCKET) === 'hide-queue') {
            LoadingScreen.#hideRocket();
        }

        let secondsLeft = waitTime;
        let $countDown;
        let $estimated;

        LoadingScreen.#orgWebTitle = document.title;

        const endDate = new Date();
        const timeZoneOffsetSeconds = endDate.getTimezoneOffset() * 60;
        endDate.setSeconds(endDate.getSeconds() + waitTime - timeZoneOffsetSeconds);

        let endDateStr = endDate.toISOString().slice(0, 19);
        endDateStr = endDateStr.substring(0, 10) + ' ' + endDateStr.substring(11, 19);
        endDateStr += ` (${LoadingScreen.#secondsToString(waitTime)})`;

        let estimatedWaitTime = LoadingScreen.#secondsToString(waitTime);

        let $waitTimeBox = LoadingScreen.#$waitTimeBox;
        if (!$waitTimeBox) {
            $waitTimeBox = CE('div', {'class': 'bx-wait-time-box'},
                                    CE('label', {}, t('server')),
                                    CE('span', {}, getPreferredServerRegion()),
                                    CE('label', {}, t('wait-time-estimated')),
                                    $estimated = CE('span', {}),
                                    CE('label', {}, t('wait-time-countdown')),
                                    $countDown = CE('span', {}),
                                   );

            document.documentElement.appendChild($waitTimeBox);
            LoadingScreen.#$waitTimeBox = $waitTimeBox;
        } else {
            $waitTimeBox.classList.remove('bx-gone');
            $estimated = $waitTimeBox.querySelector('.bx-wait-time-estimated');
            $countDown = $waitTimeBox.querySelector('.bx-wait-time-countdown');
        }

        $estimated.textContent = endDateStr;
        $countDown.textContent = LoadingScreen.#secondsToString(secondsLeft);
        document.title = `[${$countDown.textContent}] ${LoadingScreen.#orgWebTitle}`;

        LoadingScreen.#waitTimeInterval = setInterval(() => {
            secondsLeft--;
            $countDown.textContent = LoadingScreen.#secondsToString(secondsLeft);
            document.title = `[${$countDown.textContent}] ${LoadingScreen.#orgWebTitle}`;

            if (secondsLeft <= 0) {
                LoadingScreen.#waitTimeInterval && clearInterval(LoadingScreen.#waitTimeInterval);
                LoadingScreen.#waitTimeInterval = null;
            }
        }, 1000);
    }

    static hide() {
        LoadingScreen.#orgWebTitle && (document.title = LoadingScreen.#orgWebTitle);
        LoadingScreen.#$waitTimeBox && LoadingScreen.#$waitTimeBox.classList.add('bx-gone');

        if (LoadingScreen.#$bgStyle) {
            const $rocketBg = document.querySelector('#game-stream rect[width="800"]');
            $rocketBg && $rocketBg.addEventListener('transitionend', e => {
                LoadingScreen.#$bgStyle.textContent += `
#game-stream {
    background: #000 !important;
}
`;
            });

            LoadingScreen.#$bgStyle.textContent += `
#game-stream rect[width="800"] {
    opacity: 1 !important;
}
`;
        }

        LoadingScreen.reset();
    }

    static reset() {
        LoadingScreen.#$waitTimeBox && LoadingScreen.#$waitTimeBox.classList.add('bx-gone');
        LoadingScreen.#$bgStyle && (LoadingScreen.#$bgStyle.textContent = '');

        LoadingScreen.#waitTimeInterval && clearInterval(LoadingScreen.#waitTimeInterval);
        LoadingScreen.#waitTimeInterval = null;
    }
}


class TouchController {
    static get #EVENT_SHOW_DEFAULT_CONTROLLER() {
        return new MessageEvent('message', {
                    data: '{"content":"{\\"layoutId\\":\\"\\"}","target":"/streaming/touchcontrols/showlayoutv2","type":"Message"}',
                    origin: 'better-xcloud',
                });
    }

    static get #EVENT_HIDE_CONTROLLER() {
        return new MessageEvent('message', {
                    data: '{"content":"","target":"/streaming/touchcontrols/hide","type":"Message"}',
                    origin: 'better-xcloud',
                });
    }

    static #$bar;
    static #$style;

    static #enable = false;
    static #showing = false;
    static #dataChannel;

    static #customLayouts = {};
    static #baseCustomLayouts = {};
    static #currentLayoutId;

    static enable() {
        TouchController.#enable = true;
    }

    static disable() {
        TouchController.#enable = false;
    }

    static isEnabled() {
        return TouchController.#enable;
    }

    static #showDefault() {
        TouchController.#dispatchMessage(TouchController.#EVENT_SHOW_DEFAULT_CONTROLLER);
        TouchController.#showing = true;
    }

    static #show() {
        document.querySelector('#BabylonCanvasContainer-main').parentElement.classList.remove('bx-offscreen');
        TouchController.#showing = true;
    }

    static #hide() {
        document.querySelector('#BabylonCanvasContainer-main').parentElement.classList.add('bx-offscreen');
        TouchController.#showing = false;
    }

    static #toggleVisibility() {
        if (!TouchController.#dataChannel) {
            return;
        }

        TouchController.#showing ? TouchController.#hide() : TouchController.#show();
    }

    static #toggleBar(value) {
        TouchController.#$bar && TouchController.#$bar.setAttribute('data-showing', value);
    }

    static reset() {
        TouchController.#enable = false;
        TouchController.#showing = false;
        TouchController.#dataChannel = null;

        TouchController.#$bar && TouchController.#$bar.removeAttribute('data-showing');
        TouchController.#$style && (TouchController.#$style.textContent = '');
    }

    static #dispatchMessage(msg) {
        TouchController.#dataChannel && setTimeout(() => {
            TouchController.#dataChannel.dispatchEvent(msg);
        }, 10);
    }

    static #dispatchLayouts(data) {
        BxEvent.dispatch(window, BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED, {
            data: data,
        });
    };

    static async getCustomLayouts(xboxTitleId, retries) {
        xboxTitleId = '' + xboxTitleId;
        if (xboxTitleId in TouchController.#customLayouts) {
            TouchController.#dispatchLayouts(TouchController.#customLayouts[xboxTitleId]);
            return;
        }

        retries = retries || 1;
        if (retries > 2) {
            TouchController.#customLayouts[xboxTitleId] = null;
            // Wait for BX_EXPOSED.touch_layout_manager
            setTimeout(() => TouchController.#dispatchLayouts(null), 1000);
            return;
        }

        const baseUrl = `https://raw.githubusercontent.com/redphx/better-xcloud/gh-pages/touch-layouts${USE_DEV_TOUCH_LAYOUT ? '/dev' : ''}`;
        const url = `${baseUrl}/${xboxTitleId}.json`;

        // Get layout info
        try {
            const resp = await NATIVE_FETCH(url);
            const json = await resp.json();

            const layouts = {};

            json.layouts.forEach(async layoutName => {
                let baseLayouts = {};
                if (layoutName in TouchController.#baseCustomLayouts) {
                    baseLayouts = TouchController.#baseCustomLayouts[layoutName];
                } else {
                    try {
                        const layoutUrl = `${baseUrl}/layouts/${layoutName}.json`;
                        const resp = await NATIVE_FETCH(layoutUrl);
                        const json = await resp.json();

                        baseLayouts = json.layouts;
                        TouchController.#baseCustomLayouts[layoutName] = baseLayouts;
                    } catch (e) {}
                }

                Object.assign(layouts, baseLayouts);
            });

            json.layouts = layouts;
            TouchController.#customLayouts[xboxTitleId] = json;

            // Wait for BX_EXPOSED.touch_layout_manager
            setTimeout(() => TouchController.#dispatchLayouts(json), 1000);
        } catch (e) {
            // Retry
            TouchController.getCustomLayouts(xboxTitleId, retries + 1);
        }
    }

    static loadCustomLayout(xboxTitleId, layoutId, delay) {
        if (!window.BX_EXPOSED.touch_layout_manager) {
            return;
        }

        const layoutChanged = TouchController.#currentLayoutId !== layoutId;

        TouchController.#currentLayoutId = layoutId;
        xboxTitleId = '' + xboxTitleId;

        // Get layout data
        const layoutData = TouchController.#customLayouts[xboxTitleId];
        if (!xboxTitleId || !layoutId || !layoutData) {
            TouchController.#enable && TouchController.#showDefault();
            return;
        }

        const layout = (layoutData.layouts[layoutId] || layoutData.layouts[layoutData.default_layout]);
        if (layout) {
            // Show a toast with layout's name
            layoutChanged && Toast.show(t('touch-control-layout'), layout.name);

            setTimeout(() => {
                window.BX_EXPOSED.touch_layout_manager.changeLayoutForScope({
                    type: 'showLayout',
                    scope: xboxTitleId,
                    subscope: 'base',
                    layout: {
                        id: 'System.Standard',
                        displayName: 'System',
                        layoutFile: {
                            content: layout.content,
                        },
                    }
                });
            }, delay);
        }
    }

    static setup() {
        // Function for testing touch control
        window.BX_EXPOSED.test_touch_control = content => {
            const { touch_layout_manager } = window.BX_EXPOSED;

            touch_layout_manager && touch_layout_manager.changeLayoutForScope({
                type: 'showLayout',
                scope: '' + GAME_XBOX_TITLE_ID,
                subscope: 'base',
                layout: {
                    id: 'System.Standard',
                    displayName: 'Custom',
                    layoutFile: {
                        content: content,
                    },
                },
            });
        };

        const $fragment = document.createDocumentFragment();
        const $style = document.createElement('style');
        $fragment.appendChild($style);

        const $bar = createElement('div', {'id': 'bx-touch-controller-bar'});
        $fragment.appendChild($bar);

        document.documentElement.appendChild($fragment);

        // Setup double-tap event
        let clickTimeout;
        $bar.addEventListener('mousedown', e => {
            clickTimeout && clearTimeout(clickTimeout);
            if (clickTimeout) {
                // Double-clicked
                clickTimeout = null;
                TouchController.#toggleVisibility();
                return;
            }

            clickTimeout = setTimeout(() => {
                clickTimeout = null;
            }, 400);
        });

        TouchController.#$bar = $bar;
        TouchController.#$style = $style;

        const PREF_STYLE_STANDARD = getPref(Preferences.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD);
        const PREF_STYLE_CUSTOM = getPref(Preferences.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM);

        window.addEventListener(BxEvent.DATA_CHANNEL_CREATED, e => {
            const dataChannel = e.dataChannel;
            if (!dataChannel || dataChannel.label !== 'message') {
                return;
            }

            // Apply touch controller's style
            let filter = '';
            if (TouchController.#enable) {
                if (PREF_STYLE_STANDARD === 'white') {
                    filter = 'grayscale(1) brightness(2)';
                } else if (PREF_STYLE_STANDARD === 'muted') {
                    filter = 'sepia(0.5)';
                }
            } else if (PREF_STYLE_CUSTOM === 'muted') {
                filter = 'sepia(0.5)';
            }

            if (filter) {
                $style.textContent = `#babylon-canvas { filter: ${filter} !important; }`;
            } else {
                $style.textContent = '';
            }

            TouchController.#dataChannel = dataChannel;

            // Fix sometimes the touch controller doesn't show at the beginning
            dataChannel.addEventListener('open', e => {
                setTimeout(TouchController.#show, 1000);
            });

            let focused = false;
            dataChannel.addEventListener('message', msg => {
                if (msg.origin === 'better-xcloud' || typeof msg.data !== 'string') {
                    return;
                }

                // Dispatch a message to display generic touch controller
                if (msg.data.includes('touchcontrols/showtitledefault')) {
                    if (TouchController.#enable) {
                        if (focused) {
                            TouchController.getCustomLayouts(GAME_XBOX_TITLE_ID);
                        } else {
                            TouchController.#showDefault();
                        }
                    }
                    return;
                }

                // Load custom touch layout
                try {
                    if (msg.data.includes('/titleinfo')) {
                        const json = JSON.parse(JSON.parse(msg.data).content);
                        TouchController.#toggleBar(json.focused);

                        focused = json.focused;
                        if (!json.focused) {
                            TouchController.#show();
                        }

                        GAME_XBOX_TITLE_ID = parseInt(json.titleid, 16);
                    }
                } catch (e) {
                    console.log(e);
                }
            });
        });
    }
}


class Toast {
    static #$wrapper;
    static #$msg;
    static #$status;

    static #timeout;
    static #DURATION = 3000;

    static show(msg, status) {
        Toast.#timeout && clearTimeout(Toast.#timeout);
        Toast.#timeout = setTimeout(Toast.#hide, Toast.#DURATION);

        Toast.#$msg.textContent = msg;

        if (status) {
            Toast.#$status.classList.remove('bx-gone');
            Toast.#$status.textContent = status;
        } else {
            Toast.#$status.classList.add('bx-gone');
        }

        const classList = Toast.#$wrapper.classList;
        classList.remove('bx-offscreen', 'bx-hide');
        classList.add('bx-show');
    }

    static #hide() {
        Toast.#timeout = null;

        const classList = Toast.#$wrapper.classList;
        classList.remove('bx-show');
        classList.add('bx-hide');
    }

    static setup() {
        Toast.#$wrapper = CE('div', {'class': 'bx-toast bx-offscreen'},
                                        Toast.#$msg = CE('span', {'class': 'bx-toast-msg'}),
                                        Toast.#$status = CE('span', {'class': 'bx-toast-status'}));

        Toast.#$wrapper.addEventListener('transitionend', e => {
            const classList = Toast.#$wrapper.classList;
            if (classList.contains('bx-hide')) {
                classList.remove('bx-offscreen', 'bx-hide');
                classList.add('bx-offscreen');
            }
        });

        document.documentElement.appendChild(Toast.#$wrapper);
    }
}


class SettingElement {
    static TYPE_OPTIONS = 'options';
    static TYPE_MULTIPLE_OPTIONS = 'multiple-options';
    static TYPE_NUMBER = 'number';
    static TYPE_NUMBER_STEPPER = 'number-stepper';
    static TYPE_CHECKBOX = 'checkbox';

    static #renderOptions(key, setting, currentValue, onChange) {
        const $control = CE('select');
        for (let value in setting.options) {
            const label = setting.options[value];

            const $option = CE('option', {value: value}, label);
            $control.appendChild($option);
        }

        $control.value = currentValue;
        onChange && $control.addEventListener('change', e => {
            const value = (setting.type && setting.type === 'number') ? parseInt(e.target.value) : e.target.value;
            onChange(e, value);
        });

        // Custom method
        $control.setValue = value => {
            $control.value = value;
        };

        return $control;
    }

    static #renderMultipleOptions(key, setting, currentValue, onChange, params) {
        const $control = CE('select', {'multiple': true});
        if (params && params.size) {
            $control.setAttribute('size', params.size);
        }

        for (let value in setting.multiple_options) {
            const label = setting.multiple_options[value];

            const $option = CE('option', {value: value}, label);
            $option.selected = currentValue.indexOf(value) > -1;

            $option.addEventListener('mousedown', function(e) {
                e.preventDefault();
                e.target.selected = !e.target.selected;

                const $parent = e.target.parentElement;
                $parent.focus();
                $parent.dispatchEvent(new Event('change'));
            });

            $control.appendChild($option);
        }

        $control.addEventListener('mousedown', function(e) {
            const self = this;
            const orgScrollTop = self.scrollTop;
            setTimeout(() => (self.scrollTop = orgScrollTop), 0);
        });

        $control.addEventListener('mousemove', e => e.preventDefault());

        onChange && $control.addEventListener('change', e => {
            const values = Array.from(e.target.selectedOptions).map(e => e.value);
            onChange(e, values);
        });

        return $control;
    }

    static #renderNumber(key, setting, currentValue, onChange) {
        const $control = CE('input', {'type': 'number', 'min': setting.min, 'max': setting.max});
        $control.value = currentValue;
        onChange && $control.addEventListener('change', e => {
            let value = Math.max(setting.min, Math.min(setting.max, parseInt(e.target.value)));
            e.target.value = value;

            onChange(e, value);
        });

        return $control;
    }

    static #renderCheckbox(key, setting, currentValue, onChange) {
        const $control = CE('input', {'type': 'checkbox'});
        $control.checked = currentValue;

        onChange && $control.addEventListener('change', e => {
            onChange(e, e.target.checked);
        });

        return $control;
    }

    static #renderNumberStepper(key, setting, value, onChange, options={}) {
        options = options || {};
        options.suffix = options.suffix || '';
        options.disabled = !!options.disabled;
        options.hideSlider = !!options.hideSlider;

        let $text, $decBtn, $incBtn, $range;

        const MIN = setting.min;
        const MAX = setting.max;
        const STEPS = Math.max(setting.steps || 1, 1);

        const $wrapper = CE('div', {'class': 'bx-number-stepper'},
                            $decBtn = CE('button', {'data-type': 'dec'}, '-'),
                            $text = CE('span', {}, value + options.suffix),
                            $incBtn = CE('button', {'data-type': 'inc'}, '+'),
                           );

        if (!options.disabled && !options.hideSlider) {
            $range = CE('input', {'type': 'range', 'min': MIN, 'max': MAX, 'value': value, 'step': STEPS});
            $range.addEventListener('input', e => {
                value = parseInt(e.target.value);

                $text.textContent = value + options.suffix;
                onChange && onChange(e, value);
            });
            $wrapper.appendChild($range);

            if (options.ticks || options.exactTicks) {
                const markersId = `markers-${key}`;
                const $markers = CE('datalist', {'id': markersId});
                $range.setAttribute('list', markersId);

                if (options.exactTicks) {
                    let start = Math.max(Math.floor(MIN / options.exactTicks), 1) * options.exactTicks;

                    if (start === MIN) {
                        start += options.exactTicks;
                    }

                    for (let i = start; i < MAX; i += options.exactTicks) {
                        $markers.appendChild(CE('option', {'value': i}));
                    }
                } else {
                    for (let i = MIN + options.ticks; i < MAX; i += options.ticks) {
                        $markers.appendChild(CE('option', {'value': i}));
                    }
                }
                $wrapper.appendChild($markers);
            }
        }

        if (options.disabled) {
            $incBtn.disabled = true;
            $incBtn.classList.add('bx-hidden');

            $decBtn.disabled = true;
            $decBtn.classList.add('bx-hidden');
            return $wrapper;
        }

        let interval;
        let isHolding = false;

        const onClick = e => {
            if (isHolding) {
                e.preventDefault();
                isHolding = false;

                return;
            }

            const btnType = e.target.getAttribute('data-type');
            if (btnType === 'dec') {
                value = Math.max(MIN, value - STEPS);
            } else {
                value = Math.min(MAX, value + STEPS);
            }

            $text.textContent = value + options.suffix;
            $range && ($range.value = value);

            isHolding = false;
            onChange && onChange(e, value);
        }

        const onMouseDown = e => {
            isHolding = true;

            const args = arguments;
            interval = setInterval(() => {
                const event = new Event('click');
                event.arguments = args;

                e.target.dispatchEvent(event);
            }, 200);
        };

        const onMouseUp = e => {
            clearInterval(interval);
            isHolding = false;
        };

        // Custom method
        $wrapper.setValue = value => {
            $text.textContent = value + options.suffix;
            $range && ($range.value = value);
        };

        $decBtn.addEventListener('click', onClick);
        $decBtn.addEventListener('mousedown', onMouseDown);
        $decBtn.addEventListener('mouseup', onMouseUp);
        $decBtn.addEventListener('touchstart', onMouseDown);
        $decBtn.addEventListener('touchend', onMouseUp);

        $incBtn.addEventListener('click', onClick);
        $incBtn.addEventListener('mousedown', onMouseDown);
        $incBtn.addEventListener('mouseup', onMouseUp);
        $incBtn.addEventListener('touchstart', onMouseDown);
        $incBtn.addEventListener('touchend', onMouseUp);

        return $wrapper;
    }

    static #METHOD_MAP = {
        [SettingElement.TYPE_OPTIONS]: SettingElement.#renderOptions,
        [SettingElement.TYPE_MULTIPLE_OPTIONS]: SettingElement.#renderMultipleOptions,
        [SettingElement.TYPE_NUMBER]: SettingElement.#renderNumber,
        [SettingElement.TYPE_NUMBER_STEPPER]: SettingElement.#renderNumberStepper,
        [SettingElement.TYPE_CHECKBOX]: SettingElement.#renderCheckbox,
    };

    static render(type, key, setting, currentValue, onChange, options) {
        const method = SettingElement.#METHOD_MAP[type];
        const $control = method(...Array.from(arguments).slice(1));
        $control.id = `bx_setting_${key}`;

        return $control;
    }
}


const GamepadKey = {};
GamepadKey[GamepadKey.A = 0] = 'A';
GamepadKey[GamepadKey.B = 1] = 'B';
GamepadKey[GamepadKey.X = 2] = 'X';
GamepadKey[GamepadKey.Y = 3] = 'Y';
GamepadKey[GamepadKey.LB = 4] = 'LB';
GamepadKey[GamepadKey.RB = 5] = 'RB';
GamepadKey[GamepadKey.LT = 6] = 'LT';
GamepadKey[GamepadKey.RT = 7] = 'RT';
GamepadKey[GamepadKey.SELECT = 8] = 'SELECT';
GamepadKey[GamepadKey.START = 9] = 'START';
GamepadKey[GamepadKey.L3 = 10] = 'L3';
GamepadKey[GamepadKey.R3 = 11] = 'R3';
GamepadKey[GamepadKey.UP = 12] = 'UP';
GamepadKey[GamepadKey.DOWN = 13] = 'DOWN';
GamepadKey[GamepadKey.LEFT = 14] = 'LEFT';
GamepadKey[GamepadKey.RIGHT = 15] = 'RIGHT';
GamepadKey[GamepadKey.HOME = 16] = 'HOME';

GamepadKey[GamepadKey.LS_UP = 100] = 'LS_UP';
GamepadKey[GamepadKey.LS_DOWN = 101] = 'LS_DOWN';
GamepadKey[GamepadKey.LS_LEFT = 102] = 'LS_LEFT';
GamepadKey[GamepadKey.LS_RIGHT = 103] = 'LS_RIGHT';
GamepadKey[GamepadKey.RS_UP = 200] = 'RS_UP';
GamepadKey[GamepadKey.RS_DOWN = 201] = 'RS_DOWN';
GamepadKey[GamepadKey.RS_LEFT = 202] = 'RS_LEFT';
GamepadKey[GamepadKey.RS_RIGHT = 203] = 'RS_RIGHT';


const GamepadKeyName = {
    [GamepadKey.A]: ['A', '⇓'],
    [GamepadKey.B]: ['B', '⇒'],
    [GamepadKey.X]: ['X', '⇐'],
    [GamepadKey.Y]: ['Y', '⇑'],

    [GamepadKey.LB]: ['LB', '↘'],
    [GamepadKey.RB]: ['RB', '↙'],
    [GamepadKey.LT]: ['LT', '↖'],
    [GamepadKey.RT]: ['RT', '↗'],

    [GamepadKey.SELECT]: ['Select', '⇺'],
    [GamepadKey.START]: ['Start', '⇻'],
    [GamepadKey.HOME]: ['Home', ''],

    [GamepadKey.UP]: ['D-Pad Up', '≻'],
    [GamepadKey.DOWN]: ['D-Pad Down', '≽'],
    [GamepadKey.LEFT]: ['D-Pad Left', '≺'],
    [GamepadKey.RIGHT]: ['D-Pad Right', '≼'],

    [GamepadKey.L3]: ['L3', '↺'],
    [GamepadKey.LS_UP]: ['Left Stick Up', '↾'],
    [GamepadKey.LS_DOWN]: ['Left Stick Down', '⇂'],
    [GamepadKey.LS_LEFT]: ['Left Stick Left', '↼'],
    [GamepadKey.LS_RIGHT]: ['Left Stick Right', '⇀'],

    [GamepadKey.R3]: ['R3', '↻'],
    [GamepadKey.RS_UP]: ['Right Stick Up', '↿'],
    [GamepadKey.RS_DOWN]: ['Right Stick Down', '⇃'],
    [GamepadKey.RS_LEFT]: ['Right Stick Left', '↽'],
    [GamepadKey.RS_RIGHT]: ['Right Stick Right', '⇁'],
};


const GamepadStick = {
    LEFT: 0,
    RIGHT: 1,
};

const MouseButtonCode = {
    LEFT_CLICK: 'Mouse0',
    RIGHT_CLICK: 'Mouse2',
    MIDDLE_CLICK: 'Mouse1',
};

const MouseMapTo = {};
MouseMapTo[MouseMapTo.OFF = 0] = 'OFF';
MouseMapTo[MouseMapTo.LS = 1] = 'LS';
MouseMapTo[MouseMapTo.RS = 2] = 'RS';


const WheelCode = {
    SCROLL_UP: 'ScrollUp',
    SCROLL_DOWN: 'ScrollDown',
    SCROLL_LEFT: 'ScrollLeft',
    SCROLL_RIGHT: 'ScrollRight',
};


class KeyHelper {
    static #NON_PRINTABLE_KEYS = {
        'Backquote': '`',

        // Mouse buttons
        [MouseButtonCode.LEFT_CLICK]: 'Left Click',
        [MouseButtonCode.RIGHT_CLICK]: 'Right Click',
        [MouseButtonCode.MIDDLE_CLICK]: 'Middle Click',

        [WheelCode.SCROLL_UP]: 'Scroll Up',
        [WheelCode.SCROLL_DOWN]: 'Scroll Down',
        [WheelCode.SCROLL_LEFT]: 'Scroll Left',
        [WheelCode.SCROLL_RIGHT]: 'Scroll Right',
    };

    static getKeyFromEvent(e) {
        let code;
        let name;

        if (e.type.startsWith('key')) {
            code = e.code;
        } else if (e.type.startsWith('mouse')) {
            code = 'Mouse' + e.button;
        } else if (e.type === 'wheel') {
            if (e.deltaY < 0) {
                code = WheelCode.SCROLL_UP;
            } else if (e.deltaY > 0) {
                code = WheelCode.SCROLL_DOWN;
            } else if (e.deltaX < 0) {
                code = WheelCode.SCROLL_LEFT;
            } else {
                code = WheelCode.SCROLL_RIGHT;
            }
        }

        if (code) {
            name = KeyHelper.codeToKeyName(code);
        }

        return code ? {code, name} : null;
    }

    static codeToKeyName(code) {
        return (
            KeyHelper.#NON_PRINTABLE_KEYS[code]
            ||
            (code.startsWith('Key') && code.substring(3))
            ||
            (code.startsWith('Digit') && code.substring(5))
            ||
            (code.startsWith('Numpad') && ('Numpad ' + code.substring(6)))
            ||
            (code.startsWith('Arrow') && ('Arrow ' + code.substring(5)))
            ||
            (code.endsWith('Lock') && (code.replace('Lock', ' Lock')))
            ||
            (code.endsWith('Left') && ('Left ' + code.replace('Left', '')))
            ||
            (code.endsWith('Right') && ('Right ' + code.replace('Right', '')))
            ||
            code
        );
    }
}


class MkbPreset {
    static get KEY_MOUSE_MAP_TO() { return 'map_to'; }

    static get KEY_MOUSE_SENSITIVITY_X() { return 'sensitivity_x'; }
    static get KEY_MOUSE_SENSITIVITY_Y() { return 'sensitivity_y'; }

    static get KEY_MOUSE_DEADZONE_COUNTERWEIGHT() { return 'deadzone_counterweight'; }

    static get KEY_MOUSE_STICK_DECAY_STRENGTH() { return 'stick_decay_strength'; }
    static get KEY_MOUSE_STICK_DECAY_MIN() { return 'stick_decay_min'; }

    static MOUSE_SETTINGS = {
        [MkbPreset.KEY_MOUSE_MAP_TO]: {
            label: t('map-mouse-to'),
            type: SettingElement.TYPE_OPTIONS,
            default: MouseMapTo[MouseMapTo.RS],
            options: {
                [MouseMapTo[MouseMapTo.RS]]: t('right-stick'),
                [MouseMapTo[MouseMapTo.LS]]: t('left-stick'),
                [MouseMapTo[MouseMapTo.OFF]]: t('off'),
            },
        },

        [MkbPreset.KEY_MOUSE_SENSITIVITY_Y]: {
            label: t('horizontal-sensitivity'),
            type: SettingElement.TYPE_NUMBER_STEPPER,
            default: 50,
            min: 1,
            max: 200,

            params: {
                suffix: '%',
                exactTicks: 20,
            },
        },

        [MkbPreset.KEY_MOUSE_SENSITIVITY_X]: {
            label: t('vertical-sensitivity'),
            type: SettingElement.TYPE_NUMBER_STEPPER,
            default: 50,
            min: 1,
            max: 200,

            params: {
                suffix: '%',
                exactTicks: 20,
            },
        },

        [MkbPreset.KEY_MOUSE_DEADZONE_COUNTERWEIGHT]: {
            label: t('deadzone-counterweight'),
            type: SettingElement.TYPE_NUMBER_STEPPER,
            default: 20,
            min: 1,
            max: 100,

            params: {
                suffix: '%',
                exactTicks: 10,
            },
        },

        [MkbPreset.KEY_MOUSE_STICK_DECAY_STRENGTH]: {
            label: t('stick-decay-strength'),
            type: SettingElement.TYPE_NUMBER_STEPPER,
            default: 18,
            min: 10,
            max: 100,

            params: {
                suffix: '%',
                exactTicks: 10,
            },
        },

        [MkbPreset.KEY_MOUSE_STICK_DECAY_MIN]: {
            label: t('stick-decay-minimum'),
            type: SettingElement.TYPE_NUMBER_STEPPER,
            default: 6,
            min: 1,
            max: 10,

            params: {
                suffix: '%',
            },
        },
    };

    static DEFAULT_PRESET = {
        'mapping': {
            // Use "e.code" value from https://keyjs.dev
            [GamepadKey.UP]: ['ArrowUp'],
            [GamepadKey.DOWN]: ['ArrowDown'],
            [GamepadKey.LEFT]: ['ArrowLeft'],
            [GamepadKey.RIGHT]: ['ArrowRight'],

            [GamepadKey.LS_UP]: ['KeyW'],
            [GamepadKey.LS_DOWN]: ['KeyS'],
            [GamepadKey.LS_LEFT]: ['KeyA'],
            [GamepadKey.LS_RIGHT]: ['KeyD'],

            [GamepadKey.RS_UP]: ['KeyI'],
            [GamepadKey.RS_DOWN]: ['KeyK'],
            [GamepadKey.RS_LEFT]: ['KeyJ'],
            [GamepadKey.RS_RIGHT]: ['KeyL'],

            [GamepadKey.A]: ['Space', 'KeyE'],
            [GamepadKey.X]: ['KeyR'],
            [GamepadKey.B]: ['ControlLeft', 'Backspace'],
            [GamepadKey.Y]: ['KeyV'],

            [GamepadKey.START]: ['Enter'],
            [GamepadKey.SELECT]: ['Tab'],

            [GamepadKey.LB]: ['KeyC', 'KeyG'],
            [GamepadKey.RB]: ['KeyQ'],

            [GamepadKey.HOME]: ['Backquote'],

            [GamepadKey.RT]: [MouseButtonCode.LEFT_CLICK],
            [GamepadKey.LT]: [MouseButtonCode.RIGHT_CLICK],

            [GamepadKey.L3]: ['ShiftLeft'],
            [GamepadKey.R3]: ['KeyF'],
        },

        'mouse': {
            [MkbPreset.KEY_MOUSE_MAP_TO]: MouseMapTo[MouseMapTo.RS],
            [MkbPreset.KEY_MOUSE_SENSITIVITY_X]: 50,
            [MkbPreset.KEY_MOUSE_SENSITIVITY_Y]: 50,
            [MkbPreset.KEY_MOUSE_DEADZONE_COUNTERWEIGHT]: 20,
            [MkbPreset.KEY_MOUSE_STICK_DECAY_STRENGTH]: 18,
            [MkbPreset.KEY_MOUSE_STICK_DECAY_MIN]: 6,
        },
    };

    static convert(preset) {
        const obj = {
            'mapping': {},
            'mouse': Object.assign({}, preset.mouse),
        };

        for (const buttonIndex in preset.mapping) {
            for (const keyName of preset.mapping[buttonIndex]) {
                obj.mapping[keyName] = parseInt(buttonIndex);
            }
        }

        // Pre-calculate mouse's sensitivities
        const mouse = obj.mouse;
        mouse[MkbPreset.KEY_MOUSE_SENSITIVITY_X] *= MkbHandler.DEFAULT_PANNING_SENSITIVITY;
        mouse[MkbPreset.KEY_MOUSE_SENSITIVITY_Y] *= MkbHandler.DEFAULT_PANNING_SENSITIVITY;
        mouse[MkbPreset.KEY_MOUSE_DEADZONE_COUNTERWEIGHT] *= MkbHandler.DEFAULT_DEADZONE_COUNTERWEIGHT;
        mouse[MkbPreset.KEY_MOUSE_STICK_DECAY_STRENGTH] *= 0.01;
        mouse[MkbPreset.KEY_MOUSE_STICK_DECAY_MIN] *= 0.01;

        const mouseMapTo = MouseMapTo[mouse[MkbPreset.KEY_MOUSE_MAP_TO]];
        if (typeof mouseMapTo !== 'undefined') {
            mouse[MkbPreset.KEY_MOUSE_MAP_TO] = mouseMapTo;
        } else {
            mouse[MkbPreset.KEY_MOUSE_MAP_TO] = MkbPreset.MOUSE_SETTINGS[MkbPreset.KEY_MOUSE_MAP_TO].default;
        }

        console.log(obj);
        return obj;
    }
}


class LocalDb {
    static #instance;
    static get INSTANCE() {
        if (!LocalDb.#instance) {
            LocalDb.#instance = new LocalDb();
        }

        return LocalDb.#instance;
    }

    static get DB_NAME() { return 'BetterXcloud'; }
    static get DB_VERSION() { return 1; }
    static get TABLE_PRESETS() { return 'mkb_presets'; }

    #DB;

    #open() {
        return new Promise((resolve, reject) => {
            if (this.#DB) {
                resolve();
                return;
            }

            const request = window.indexedDB.open(LocalDb.DB_NAME, LocalDb.DB_VERSION);
            request.onupgradeneeded = e => {
                const db = e.target.result;

                switch (e.oldVersion) {
                    case 0: {
                        const presets = db.createObjectStore(LocalDb.TABLE_PRESETS, {keyPath: 'id', autoIncrement: true});
                        presets.createIndex('name_idx', 'name');
                        break;
                    }
                }
            };

            request.onerror = e => {
                console.log(e);
                alert(e.target.error.message);
                reject && reject();
            };

            request.onsuccess = e => {
                this.#DB = e.target.result;
                resolve();
            };
        });
    }

    #table(name, type) {
        const transaction = this.#DB.transaction(name, type || 'readonly');
        const table = transaction.objectStore(name);

        return new Promise(resolve => resolve(table));
    }

    // Convert IndexDB method to Promise
    #call(method) {
        const table = arguments[1];
        return new Promise(resolve => {
            const request = method.call(table, ...Array.from(arguments).slice(2));
            request.onsuccess = e => {
                resolve([table, e.target.result]);
            };
        });
    }

    #count(table) {
        return this.#call(table.count, ...arguments);
    }

    #add(table, data) {
        return this.#call(table.add, ...arguments);
    }

    #put(table, data) {
        return this.#call(table.put, ...arguments);
    }

    #delete(table, data) {
        return this.#call(table.delete, ...arguments);
    }

    #get(table) {
        return this.#call(table.get, ...arguments);
    }

    #getAll(table) {
        return this.#call(table.getAll, ...arguments);
    }

    newPreset(name, data) {
        return this.#open()
            .then(() => this.#table(LocalDb.TABLE_PRESETS, 'readwrite'))
            .then(table => this.#add(table, {name, data}))
            .then(([table, id]) => new Promise(resolve => resolve(id)));
    }

    updatePreset(preset) {
        return this.#open()
            .then(() => this.#table(LocalDb.TABLE_PRESETS, 'readwrite'))
            .then(table => this.#put(table, preset))
            .then(([table, id]) => new Promise(resolve => resolve(id)));
    }

    deletePreset(id) {
        return this.#open()
            .then(() => this.#table(LocalDb.TABLE_PRESETS, 'readwrite'))
            .then(table => this.#delete(table, id))
            .then(([table, id]) => new Promise(resolve => resolve(id)));
    }

    getPreset(id) {
        return this.#open()
            .then(() => this.#table(LocalDb.TABLE_PRESETS, 'readwrite'))
            .then(table => this.#get(table, id))
            .then(([table, preset]) => new Promise(resolve => resolve(preset)));
    }

    getPresets() {
        return this.#open()
            .then(() => this.#table(LocalDb.TABLE_PRESETS, 'readwrite'))
            .then(table => this.#count(table))
            .then(([table, count]) => {
                if (count > 0) {
                    return new Promise(resolve => {
                        this.#getAll(table)
                            .then(([table, items]) => {
                                const presets = {};
                                items.forEach(item => (presets[item.id] = item));
                                resolve(presets);
                            });
                    });
                }

                // Create "Default" preset when the table is empty
                const preset = {
                    name: t('default'),
                    data: MkbPreset.DEFAULT_PRESET,
                }

                return new Promise(resolve => {
                    this.#add(table, preset)
                        .then(([table, id]) => {
                            preset.id = id;
                            setPref(Preferences.MKB_DEFAULT_PRESET_ID, id);

                            resolve({[id]: preset});
                        });
                });
            });
    }
}


/*
This class uses some code from Yuzu emulator to handle mouse's movements
Source: https://github.com/yuzu-emu/yuzu-mainline/blob/master/src/input_common/drivers/mouse.cpp
*/
class MkbHandler {
    static #instance;
    static get INSTANCE() {
        if (!MkbHandler.#instance) {
            MkbHandler.#instance = new MkbHandler();
        }

        return MkbHandler.#instance;
    }

    #CURRENT_PRESET_DATA = MkbPreset.convert(MkbPreset.DEFAULT_PRESET);

    static get DEFAULT_PANNING_SENSITIVITY() { return 0.0010; }
    static get DEFAULT_STICK_SENSITIVITY() { return 0.0006; }
    static get DEFAULT_DEADZONE_COUNTERWEIGHT() { return 0.01; }
    static get MAXIMUM_STICK_RANGE() { return 1.1; }

    #VIRTUAL_GAMEPAD = {
            id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)',
            index: 3,
            connected: false,
            hapticActuators: null,
            mapping: 'standard',

            axes: [0, 0, 0, 0],
            buttons: new Array(17).fill(null).map(() => ({pressed: false, value: 0})),
            timestamp: performance.now(),
        };
    #nativeGetGamepads = window.navigator.getGamepads.bind(window.navigator);

    #enabled = false;

    #prevWheelCode = null;
    #wheelStoppedTimeout;

    #detectMouseStoppedTimeout;
    #allowStickDecaying = false;

    #$message;

    #STICK_MAP;
    #LEFT_STICK_X = [];
    #LEFT_STICK_Y = [];
    #RIGHT_STICK_X = [];
    #RIGHT_STICK_Y = [];

    constructor() {
        this.#STICK_MAP = {
            [GamepadKey.LS_LEFT]: [this.#LEFT_STICK_X, 0, -1],
            [GamepadKey.LS_RIGHT]: [this.#LEFT_STICK_X, 0, 1],
            [GamepadKey.LS_UP]: [this.#LEFT_STICK_Y, 1, -1],
            [GamepadKey.LS_DOWN]: [this.#LEFT_STICK_Y, 1, 1],

            [GamepadKey.RS_LEFT]: [this.#RIGHT_STICK_X, 2, -1],
            [GamepadKey.RS_RIGHT]: [this.#RIGHT_STICK_X, 2, 1],
            [GamepadKey.RS_UP]: [this.#RIGHT_STICK_Y, 3, -1],
            [GamepadKey.RS_DOWN]: [this.#RIGHT_STICK_Y, 3, 1],
        };
    }

    #patchedGetGamepads = () => {
        const gamepads = this.#nativeGetGamepads();
        gamepads[this.#VIRTUAL_GAMEPAD.index] = this.#VIRTUAL_GAMEPAD;

        return gamepads;
    }

    #getVirtualGamepad = () => this.#VIRTUAL_GAMEPAD;

    #updateStick(stick, x, y) {
        const virtualGamepad = this.#getVirtualGamepad();
        virtualGamepad.axes[stick * 2] = x;
        virtualGamepad.axes[stick * 2 + 1] = y;

        virtualGamepad.timestamp = performance.now();
    }

    #getStickAxes(stick) {
        const virtualGamepad = this.#getVirtualGamepad();
        return {
            x: virtualGamepad.axes[stick * 2],
            y: virtualGamepad.axes[stick * 2 + 1],
        };
    }

    #vectorLength = (x, y) => Math.sqrt(x ** 2 + y ** 2);

    #disableContextMenu = e => e.preventDefault();

    #resetGamepad = () => {
        const gamepad = this.#getVirtualGamepad();

        // Reset axes
        gamepad.axes = [0, 0, 0, 0];

        // Reset buttons
        for (const button of gamepad.buttons) {
            button.pressed = false;
            button.value = 0;
        }

        gamepad.timestamp = performance.now();
    }

    #pressButton = (buttonIndex, pressed) => {
        const virtualGamepad = this.#getVirtualGamepad();

        if (buttonIndex >= 100) {
            let [valueArr, axisIndex, fullValue] = this.#STICK_MAP[buttonIndex];

            // Remove old index of the array
            for (let i = valueArr.length - 1; i >= 0; i--) {
                if (valueArr[i] === buttonIndex) {
                    valueArr.splice(i, 1);
                }
            }

            pressed && valueArr.push(buttonIndex);

            let value;
            if (valueArr.length) {
                // Get value of the last key of the axis
                value = this.#STICK_MAP[valueArr[valueArr.length - 1]][2];
            } else {
                value = 0;
            }

            virtualGamepad.axes[axisIndex] = value;
        } else {
            virtualGamepad.buttons[buttonIndex].pressed = pressed;
            virtualGamepad.buttons[buttonIndex].value = pressed ? 1 : 0;
        }

        virtualGamepad.timestamp = performance.now();
    }

    #onKeyboardEvent = (e) => {
        const isKeyDown = e.type === 'keydown';

        // Toggle MKB feature
        if (isKeyDown && e.code === 'F9') {
            e.preventDefault();
            this.toggle();
            return;
        }

        const buttonIndex = this.#CURRENT_PRESET_DATA.mapping[e.code];
        if (typeof buttonIndex === 'undefined') {
            return;
        }

        // Ignore repeating keys
        if (e.repeat) {
            return;
        }

        e.preventDefault();
        this.#pressButton(buttonIndex, isKeyDown);
    }

    #onMouseEvent = e => {
        const isMouseDown = e.type === 'mousedown';
        const key = KeyHelper.getKeyFromEvent(e);
        if (!key) {
            return;
        }

        const buttonIndex = this.#CURRENT_PRESET_DATA.mapping[key.code];
        if (typeof buttonIndex === 'undefined') {
            return;
        }

        e.preventDefault();
        this.#pressButton(buttonIndex, isMouseDown);
    }

    #onWheelEvent = e => {
        const key = KeyHelper.getKeyFromEvent(e);
        if (!key) {
            return;
        }

        const buttonIndex = this.#CURRENT_PRESET_DATA.mapping[key.code];
        if (typeof buttonIndex === 'undefined') {
            return;
        }

        e.preventDefault();

        if (this.#prevWheelCode === null || this.#prevWheelCode === key.code) {
            this.#wheelStoppedTimeout && clearTimeout(this.#wheelStoppedTimeout);
            this.#pressButton(buttonIndex, true);
        }

        this.#wheelStoppedTimeout = setTimeout(e => {
            this.#prevWheelCode = null;
            this.#pressButton(buttonIndex, false);
        }, 20);
    }

    #decayStick = e => {
        if (!this.#allowStickDecaying) {
            return;
        }

        const mouseMapTo = this.#CURRENT_PRESET_DATA.mouse[MkbPreset.KEY_MOUSE_MAP_TO];
        if (mouseMapTo === MouseMapTo.OFF) {
            return;
        }

        const analog = mouseMapTo === MouseMapTo.LS ? GamepadStick.LEFT : GamepadStick.RIGHT;

        const virtualGamepad = this.#getVirtualGamepad();
        let { x, y } = this.#getStickAxes(analog);
        const length = this.#vectorLength(x, y);

        const clampedLength = Math.min(1.0, length);
        const decayStrength = this.#CURRENT_PRESET_DATA.mouse[MkbPreset.KEY_MOUSE_STICK_DECAY_STRENGTH];
        const decay = 1 - clampedLength * clampedLength * decayStrength;
        const minDecay = this.#CURRENT_PRESET_DATA.mouse[MkbPreset.KEY_MOUSE_STICK_DECAY_MIN];
        const clampedDecay = Math.min(1 - minDecay, decay);

        x *= clampedDecay;
        y *= clampedDecay;

        const deadzoneCounterweight = 20 * MkbHandler.DEFAULT_DEADZONE_COUNTERWEIGHT;
        if (Math.abs(x) <= deadzoneCounterweight && Math.abs(y) <= deadzoneCounterweight) {
            x = 0;
            y = 0;
        }

        if (this.#allowStickDecaying) {
            this.#updateStick(analog, x, y);

            (x !== 0 || y !== 0) && requestAnimationFrame(this.#decayStick);
        }
    }

    #onMouseStopped = e => {
        this.#allowStickDecaying = true;
        requestAnimationFrame(this.#decayStick);
    }

    #onMouseMoveEvent = e => {
        // TODO: optimize this
        const mouseMapTo = this.#CURRENT_PRESET_DATA.mouse[MkbPreset.KEY_MOUSE_MAP_TO];
        if (mouseMapTo === MouseMapTo.OFF) {
            // Ignore mouse movements
            return;
        }

        this.#allowStickDecaying = false;
        this.#detectMouseStoppedTimeout && clearTimeout(this.#detectMouseStoppedTimeout);
        this.#detectMouseStoppedTimeout = setTimeout(this.#onMouseStopped.bind(this, e), 100);

        const deltaX = e.movementX;
        const deltaY = e.movementY;

        const deadzoneCounterweight = this.#CURRENT_PRESET_DATA.mouse[MkbPreset.KEY_MOUSE_DEADZONE_COUNTERWEIGHT];

        let x = deltaX * this.#CURRENT_PRESET_DATA.mouse[MkbPreset.KEY_MOUSE_SENSITIVITY_X];
        let y = deltaY * this.#CURRENT_PRESET_DATA.mouse[MkbPreset.KEY_MOUSE_SENSITIVITY_Y];

        let length = this.#vectorLength(x, y);
        if (length !== 0 && length < deadzoneCounterweight) {
            x *= deadzoneCounterweight / length;
            y *= deadzoneCounterweight / length;
        } else if (length > MkbHandler.MAXIMUM_STICK_RANGE) {
            x *= MkbHandler.MAXIMUM_STICK_RANGE / length;
            y *= MkbHandler.MAXIMUM_STICK_RANGE / length;
        }

        const analog = mouseMapTo === MouseMapTo.LS ? GamepadStick.LEFT : GamepadStick.RIGHT;
        this.#updateStick(analog, x, y);
    }

    toggle = () => {
        this.#enabled = !this.#enabled;
        this.#enabled ? document.pointerLockElement && this.start() : this.stop();

        Toast.show(t('mouse-and-keyboard'), t(this.#enabled ? 'enabled' : 'disabled'));

        if (this.#enabled) {
            !document.pointerLockElement && this.#waitForPointerLock(true);
        } else {
            this.#waitForPointerLock(false);
            document.pointerLockElement && document.exitPointerLock();
        }
    }

    #getCurrentPreset = () => {
        return new Promise(resolve => {
            const presetId = getPref(Preferences.MKB_DEFAULT_PRESET_ID, 0);
            LocalDb.INSTANCE.getPreset(presetId).then(preset => {
                resolve(preset ? preset : MkbPreset.DEFAULT_PRESET);
            });
        });
    }

    refreshPresetData = () => {
        this.#getCurrentPreset().then(preset => {
            this.#CURRENT_PRESET_DATA = MkbPreset.convert(preset.data);
            this.#resetGamepad();
        });
    }

    #onPointerLockChange = e => {
        if (this.#enabled && !document.pointerLockElement) {
            this.stop();
            this.#waitForPointerLock(true);
        }
    }

    #onPointerLockError = e => {
        console.log(e);
        this.stop();
    }

    #onActivatePointerLock = () => {
        if (!document.pointerLockElement) {
            document.body.requestPointerLock();
        }

        this.#waitForPointerLock(false);
        this.start();
    }

    #waitForPointerLock = (wait) => {
        this.#$message && this.#$message.classList.toggle('bx-gone', !wait);
    }

    #onStreamMenuShown = () => {
        this.#enabled && this.#waitForPointerLock(false);
    }

    #onStreamMenuHidden = () => {
        this.#enabled && this.#waitForPointerLock(true);
    }

    init = () => {
        this.refreshPresetData();
        this.#enabled = true;

        window.addEventListener('keydown', this.#onKeyboardEvent);

        document.addEventListener('pointerlockchange', this.#onPointerLockChange);
        document.addEventListener('pointerlockerror', this.#onPointerLockError);

        this.#$message = CE('div', {'class': 'bx-mkb-pointer-lock-msg bx-gone'},
                createButton({
                    icon: Icon.MOUSE_SETTINGS,
                    onClick: e => {
                        e.preventDefault();
                        e.stopPropagation();

                        showStreamSettings('mkb');
                    },
                }),
                CE('div', {},
                    CE('p', {}, t('mkb-click-to-activate')),
                    CE('p', {}, t('press-key-to-toggle-mkb')({key: 'F9'})),
                ),
            );

        this.#$message.addEventListener('click', this.#onActivatePointerLock);
        document.documentElement.appendChild(this.#$message);

        window.addEventListener(BxEvent.STREAM_MENU_SHOWN, this.#onStreamMenuShown);
        window.addEventListener(BxEvent.STREAM_MENU_HIDDEN, this.#onStreamMenuHidden);

        this.#waitForPointerLock(true);
    }

    destroy = () => {
        this.#enabled = false;
        this.stop();

        this.#waitForPointerLock(false);
        document.pointerLockElement && document.exitPointerLock();

        window.removeEventListener('keydown', this.#onKeyboardEvent);

        document.removeEventListener('pointerlockchange', this.#onPointerLockChange);
        document.removeEventListener('pointerlockerror', this.#onPointerLockError);

        window.removeEventListener(BxEvent.STREAM_MENU_SHOWN, this.#onStreamMenuShown);
        window.removeEventListener(BxEvent.STREAM_MENU_HIDDEN, this.#onStreamMenuHidden);
    }

    start = () => {
        window.navigator.getGamepads = this.#patchedGetGamepads;

        this.#resetGamepad();

        window.addEventListener('keyup', this.#onKeyboardEvent);

        window.addEventListener('mousemove', this.#onMouseMoveEvent);
        window.addEventListener('mousedown', this.#onMouseEvent);
        window.addEventListener('mouseup', this.#onMouseEvent);
        window.addEventListener('wheel', this.#onWheelEvent);
        window.addEventListener('contextmenu', this.#disableContextMenu);

        // Dispatch "gamepadconnected" event
        const virtualGamepad = this.#getVirtualGamepad();
        virtualGamepad.connected = true;
        virtualGamepad.timestamp = performance.now();

        BxEvent.dispatch(window, 'gamepadconnected', {
                gamepad: virtualGamepad,
            });
    }

    stop = () => {

        // Dispatch "gamepaddisconnected" event
        const virtualGamepad = this.#getVirtualGamepad();
        virtualGamepad.connected = false;
        virtualGamepad.timestamp = performance.now();

        BxEvent.dispatch(window, 'gamepaddisconnected', {
                gamepad: virtualGamepad,
            });

        window.navigator.getGamepads = this.#nativeGetGamepads;

        this.#resetGamepad();

        window.removeEventListener('keyup', this.#onKeyboardEvent);

        window.removeEventListener('mousemove', this.#onMouseMoveEvent);
        window.removeEventListener('mousedown', this.#onMouseEvent);
        window.removeEventListener('mouseup', this.#onMouseEvent);
        window.removeEventListener('wheel', this.#onWheelEvent);
        window.removeEventListener('contextmenu', this.#disableContextMenu);
    }

    static setupEvents() {
        window.addEventListener(BxEvent.STREAM_PLAYING, e => {
            // Enable MKB
            if (getPref(Preferences.MKB_ENABLED) && (!ENABLE_NATIVE_MKB_BETA || !window.NATIVE_MKB_TITLES.includes(GAME_PRODUCT_ID))) {
                console.log('Emulate MKB');
                MkbHandler.INSTANCE.init();
            }
        });
    }
}


class MkbRemapper {
    get #BUTTON_ORDERS() {
        return [
            GamepadKey.UP,
            GamepadKey.DOWN,
            GamepadKey.LEFT,
            GamepadKey.RIGHT,

            GamepadKey.A,
            GamepadKey.B,
            GamepadKey.X,
            GamepadKey.Y,

            GamepadKey.LB,
            GamepadKey.RB,
            GamepadKey.LT,
            GamepadKey.RT,

            GamepadKey.SELECT,
            GamepadKey.START,
            GamepadKey.HOME,

            GamepadKey.L3,
            GamepadKey.LS_UP,
            GamepadKey.LS_DOWN,
            GamepadKey.LS_LEFT,
            GamepadKey.LS_RIGHT,

            GamepadKey.R3,
            GamepadKey.RS_UP,
            GamepadKey.RS_DOWN,
            GamepadKey.RS_LEFT,
            GamepadKey.RS_RIGHT,
        ];
    };

    static #instance;
    static get INSTANCE() {
        if (!MkbRemapper.#instance) {
            MkbRemapper.#instance = new MkbRemapper();
        }

        return MkbRemapper.#instance;
    };

    #STATE = {
        currentPresetId: 0,
        presets: [],

        editingPresetData: {},

        isEditing: false,
    };

    #$ = {
        wrapper: null,
        presetSelects: null,
        activateButton: null,

        currentBindingKey: null,

        allKeyElements: [],
        allMouseElements: [],
    };

    constructor() {
        this.#STATE.currentPresetId = getPref(Preferences.MKB_DEFAULT_PRESET_ID);

        this.bindingDialog = new Dialog({
            className: 'bx-binding-dialog',
            content: CE('div', {},
                        CE('p', {}, t('press-to-bind')),
                        CE('i', {}, t('press-esc-to-cancel')),
                       ),
            hideCloseButton: true,
        });
    }

    #clearEventListeners = () => {
        window.removeEventListener('keydown', this.#onKeyDown);
        window.removeEventListener('mousedown', this.#onMouseDown);
        window.removeEventListener('wheel', this.#onWheel);
    };

    #bindKey = ($elm, key) => {
        const buttonIndex = parseInt($elm.getAttribute('data-button-index'));
        const keySlot = parseInt($elm.getAttribute('data-key-slot'));

        // Ignore if bind the save key to the same element
        if ($elm.getAttribute('data-key-code') === key.code) {
            return;
        }

        // Unbind duplicated keys
        for (const $otherElm of this.#$.allKeyElements) {
            if ($otherElm.getAttribute('data-key-code') === key.code) {
                this.#unbindKey($otherElm);
            }
        }

        this.#STATE.editingPresetData.mapping[buttonIndex][keySlot] = key.code;
        $elm.textContent = key.name;
        $elm.setAttribute('data-key-code', key.code);
    }

    #unbindKey = $elm => {
        const buttonIndex = parseInt($elm.getAttribute('data-button-index'));
        const keySlot = parseInt($elm.getAttribute('data-key-slot'));

        // Remove key from preset
        this.#STATE.editingPresetData.mapping[buttonIndex][keySlot] = null;
        $elm.textContent = '';
        $elm.removeAttribute('data-key-code');
    }

    #onWheel = e => {
        e.preventDefault();
        this.#clearEventListeners();

        this.#bindKey(this.#$.currentBindingKey, KeyHelper.getKeyFromEvent(e));
        setTimeout(() => this.bindingDialog.hide(), 200);
    };

    #onMouseDown = e => {
        e.preventDefault();
        this.#clearEventListeners();

        this.#bindKey(this.#$.currentBindingKey, KeyHelper.getKeyFromEvent(e));
        setTimeout(() => this.bindingDialog.hide(), 200);
    };

    #onKeyDown = e => {
        e.preventDefault();
        e.stopPropagation();
        this.#clearEventListeners();

        if (e.code !== 'Escape') {
            this.#bindKey(this.#$.currentBindingKey, KeyHelper.getKeyFromEvent(e));
        }

        setTimeout(() => this.bindingDialog.hide(), 200);
    };

    #onBindingKey = e => {
        if (!this.#STATE.isEditing || e.button !== 0) {
            return;
        }

        console.log(e);

        this.#$.currentBindingKey = e.target;

        window.addEventListener('keydown', this.#onKeyDown);
        window.addEventListener('mousedown', this.#onMouseDown);
        window.addEventListener('wheel', this.#onWheel);

        this.bindingDialog.show({title: e.target.getAttribute('data-prompt')});
    };

    #onContextMenu = e => {
        e.preventDefault();
        if (!this.#STATE.isEditing) {
            return;
        }

        this.#unbindKey(e.target);
    };

    #getPreset = presetId => {
        return this.#STATE.presets[presetId];
    }

    #getCurrentPreset = () => {
        return this.#getPreset(this.#STATE.currentPresetId);
    }

    #switchPreset = presetId => {
        presetId = parseInt(presetId);

        this.#STATE.currentPresetId = presetId;
        const presetData = this.#getCurrentPreset().data;

        for (const $elm of this.#$.allKeyElements) {
            const buttonIndex = $elm.getAttribute('data-button-index');
            const keySlot = $elm.getAttribute('data-key-slot');

            const buttonKeys = presetData.mapping[buttonIndex];
            if (buttonKeys && buttonKeys[keySlot]) {
                $elm.textContent = KeyHelper.codeToKeyName(buttonKeys[keySlot]);
                $elm.setAttribute('data-key-code', buttonKeys[keySlot]);
            } else {
                $elm.textContent = '';
                $elm.removeAttribute('data-key-code');
            }
        }

        for (const key in this.#$.allMouseElements) {
            const $elm = this.#$.allMouseElements[key];
            let value = presetData.mouse[key];
            if (typeof value === 'undefined') {
                value = MkbPreset.MOUSE_SETTINGS[key].default;
            }

            $elm.setValue && $elm.setValue(value);
        }

        // Update state of Activate button
        const activated = getPref(Preferences.MKB_DEFAULT_PRESET_ID) === this.#STATE.currentPresetId;
        this.#$.activateButton.disabled = activated;
        this.#$.activateButton.querySelector('span').textContent = activated ? t('activated') : t('activate');
    }

    #refresh() {
        // Clear presets select
        while (this.#$.presetsSelect.firstChild) {
            this.#$.presetsSelect.removeChild(this.#$.presetsSelect.firstChild);
        }

        LocalDb.INSTANCE.getPresets()
            .then(presets => {
                this.#STATE.presets = presets;
                const $fragment = document.createDocumentFragment();

                let defaultPresetId;
                if (this.#STATE.currentPresetId === 0) {
                    this.#STATE.currentPresetId = parseInt(Object.keys(presets)[0]);

                    defaultPresetId = this.#STATE.currentPresetId;
                    setPref(Preferences.MKB_DEFAULT_PRESET_ID, defaultPresetId);
                    MkbHandler.INSTANCE.refreshPresetData();
                } else {
                    defaultPresetId = getPref(Preferences.MKB_DEFAULT_PRESET_ID);
                }

                for (let id in presets) {
                    id = parseInt(id);

                    const preset = presets[id];
                    let name = preset.name;
                    if (id === defaultPresetId) {
                        name = `🎮 ` + name;
                    }

                    const $options = CE('option', {value: id}, name);
                    $options.selected = id === this.#STATE.currentPresetId;

                    $fragment.appendChild($options);
                };

                this.#$.presetsSelect.appendChild($fragment);

                // Update state of Activate button
                const activated = defaultPresetId === this.#STATE.currentPresetId;
                this.#$.activateButton.disabled = activated;
                this.#$.activateButton.querySelector('span').textContent = activated ? t('activated') : t('activate');

                !this.#STATE.isEditing && this.#switchPreset(this.#STATE.currentPresetId);
            });
    }

    #toggleEditing = force => {
        this.#STATE.isEditing = typeof force !== 'undefined' ? force : !this.#STATE.isEditing;
        this.#$.wrapper.classList.toggle('bx-editing', this.#STATE.isEditing);

        if (this.#STATE.isEditing) {
            this.#STATE.editingPresetData = structuredClone(this.#getCurrentPreset().data);
        } else {
            this.#STATE.editingPresetData = {};
        }


        const childElements = this.#$.wrapper.querySelectorAll('select, button, input');
        for (const $elm of childElements) {
            if ($elm.parentElement.parentElement.classList.contains('bx-mkb-action-buttons')) {
                continue;
            }

            let disable = !this.#STATE.isEditing;

            if ($elm.parentElement.classList.contains('bx-mkb-preset-tools')) {
                disable = !disable;
            }

            $elm.disabled = disable;
        }
    }

    render() {
        this.#$.wrapper = CE('div', {'class': 'bx-mkb-settings'});

        this.#$.presetsSelect = CE('select', {});
        this.#$.presetsSelect.addEventListener('change', e => {
            this.#switchPreset(e.target.value);
        });

        const promptNewName = (value) => {
            let newName = '';
            while (!newName) {
                newName = prompt(t('prompt-preset-name'), value);
                if (newName === null) {
                    return false;
                }
                newName = newName.trim();
            }

            return newName ? newName : false;
        };

        const $header = CE('div', {'class': 'bx-mkb-preset-tools'},
                this.#$.presetsSelect,
                // Rename button
                createButton({
                    title: t('rename'),
                    icon: Icon.CURSOR_TEXT,
                    onClick: e => {
                        const preset = this.#getCurrentPreset();

                        let newName = promptNewName(preset.name);
                        if (!newName || newName === preset.name) {
                            return;
                        }

                        // Update preset with new name
                        preset.name = newName;
                        LocalDb.INSTANCE.updatePreset(preset).then(id => this.#refresh());
                    },
                }),

                // New button
                createButton({
                      icon: Icon.NEW,
                      title: t('new'),
                      onClick: e => {
                          let newName = promptNewName('');
                          if (!newName) {
                              return;
                          }

                          // Create new preset selected name
                          LocalDb.INSTANCE.newPreset(newName, MkbPreset.DEFAULT_PRESET).then(id => {
                              this.#STATE.currentPresetId = id;
                              this.#refresh();
                          });
                      },
                    }),

                // Copy button
                createButton({
                        icon: Icon.COPY,
                        title: t('copy'),
                        onClick: e => {
                            const preset = this.#getCurrentPreset();

                            let newName = promptNewName(`${preset.name} (2)`);
                            if (!newName) {
                                return;
                            }

                            // Create new preset selected name
                            LocalDb.INSTANCE.newPreset(newName, preset.data).then(id => {
                                this.#STATE.currentPresetId = id;
                                this.#refresh();
                            });
                        },
                    }),

                // Delete button
                createButton({
                        icon: Icon.TRASH,
                        style: ButtonStyle.DANGER,
                        title: t('delete'),
                        onClick: e => {
                            if (!confirm(t('confirm-delete-preset'))) {
                                return;
                            }

                            LocalDb.INSTANCE.deletePreset(this.#STATE.currentPresetId).then(id => {
                                this.#STATE.currentPresetId = 0;
                                this.#refresh();
                            });
                        },
                    }),
            );

        this.#$.wrapper.appendChild($header);

        const $rows = CE('div', {'class': 'bx-mkb-settings-rows'},
                CE('i', {'class': 'bx-mkb-note'}, t('right-click-to-unbind')),
            );

        // Render keys
        const keysPerButton = 2;
        for (const buttonIndex of this.#BUTTON_ORDERS) {
            const [buttonName, buttonPrompt] = GamepadKeyName[buttonIndex];

            let $elm;
            const $fragment = document.createDocumentFragment();
            for (let i = 0; i < keysPerButton; i++) {
                $elm = CE('button', {
                        'data-prompt': buttonPrompt,
                        'data-button-index': buttonIndex,
                        'data-key-slot': i,
                    }, ' ');

                $elm.addEventListener('mouseup', this.#onBindingKey);
                $elm.addEventListener('contextmenu', this.#onContextMenu);

                $fragment.appendChild($elm);
                this.#$.allKeyElements.push($elm);
            }

            const $keyRow = CE('div', {'class': 'bx-mkb-key-row'},
                    CE('label', {'title': buttonName}, buttonPrompt),
                    $fragment,
                );

            $rows.appendChild($keyRow);
        }

        $rows.appendChild(CE('i', {'class': 'bx-mkb-note'}, t('mkb-adjust-ingame-settings')),);

        // Render mouse settings
        const $mouseSettings = document.createDocumentFragment();
        for (const key in MkbPreset.MOUSE_SETTINGS) {
            const setting = MkbPreset.MOUSE_SETTINGS[key];
            const value = setting.default;

            let $elm;
            const onChange = (e, value) => {
                this.#STATE.editingPresetData.mouse[key] = value;
            };
            const $row = CE('div', {'class': 'bx-quick-settings-row'},
                    CE('label', {'for': `bx_setting_${key}`}, setting.label),
                    $elm = SettingElement.render(setting.type, key, setting, value, onChange, setting.params),
                );

            $mouseSettings.appendChild($row);
            this.#$.allMouseElements[key] = $elm;
        }

        $rows.appendChild($mouseSettings);
        this.#$.wrapper.appendChild($rows);

        // Render action buttons
        const $actionButtons = CE('div', {'class': 'bx-mkb-action-buttons'},
                CE('div', {},
                   // Edit button
                   createButton({
                           label: t('edit'),
                           onClick: e => this.#toggleEditing(true),
                   }),

                   // Activate button
                   this.#$.activateButton = createButton({
                           label: t('activate'),
                           style: ButtonStyle.PRIMARY,
                           onClick: e => {
                               setPref(Preferences.MKB_DEFAULT_PRESET_ID, this.#STATE.currentPresetId);
                               MkbHandler.INSTANCE.refreshPresetData();

                               this.#refresh();
                           },
                       }),
                ),

                CE('div', {},
                   // Cancel button
                   createButton({
                           label: t('cancel'),
                           style: ButtonStyle.GHOST,
                           onClick: e => {
                               // Restore preset
                               this.#switchPreset(this.#STATE.currentPresetId);
                               this.#toggleEditing(false);
                           },
                       }),

                   // Save button
                   createButton({
                           label: t('save'),
                           style: ButtonStyle.PRIMARY,
                           onClick: e => {
                               const updatedPreset = structuredClone(this.#getCurrentPreset());
                               updatedPreset.data = this.#STATE.editingPresetData;

                               LocalDb.INSTANCE.updatePreset(updatedPreset).then(id => {
                                   // If this is the default preset => refresh preset data
                                   if (id === getPref(Preferences.MKB_DEFAULT_PRESET_ID)) {
                                       MkbHandler.INSTANCE.refreshPresetData();
                                   }

                                   this.#toggleEditing(false);
                                   this.#refresh();
                               });
                           },
                       }),
                ),
            );

        this.#$.wrapper.appendChild($actionButtons);

        this.#toggleEditing(false);
        this.#refresh();
        return this.#$.wrapper;
    }
}


class GamepadHandler {
    static #BUTTON_A = 0;
    static #BUTTON_B = 1;
    static #BUTTON_X = 2;
    static #BUTTON_Y = 3;

    static #BUTTON_UP = 12;
    static #BUTTON_DOWN = 13;
    static #BUTTON_LEFT = 14;
    static #BUTTON_RIGHT = 15;

    static #BUTTON_LB = 4;
    static #BUTTON_LT = 6;
    static #BUTTON_RB = 5;
    static #BUTTON_RT = 7;

    static #BUTTON_SELECT = 8;
    static #BUTTON_START = 9;
    static #BUTTON_HOME = 16;

    static #isPolling = false;
    static #pollingInterval;
    static #isHoldingHome = false;
    static #buttonsCache = [];
    static #buttonsStatus = [];

    static #emulatedGamepads = [null, null, null, null];
    static #nativeGetGamepads = window.navigator.getGamepads.bind(window.navigator);

    static #cloneGamepad(gamepad) {
        const buttons = Array(gamepad.buttons.length).fill({pressed: false, value: 0});
        buttons[GamepadHandler.#BUTTON_HOME] = {
            pressed: true,
            value: 0,
        };

        return {
            timestamp: gamepad.timestamp,
            id: gamepad.id,
            index: gamepad.index,
            connected: gamepad.connected,
            mapping: gamepad.mapping,
            axes: [0, 0, 0, 0],
            buttons: buttons,
        };
    }

    static #customGetGamepads() {
        return GamepadHandler.#emulatedGamepads;
    }

    static #isPressed(buttonIndex) {
        return !GamepadHandler.#buttonsCache[buttonIndex] && GamepadHandler.#buttonsStatus[buttonIndex];
    }

    static #poll() {
        // Move the buttons status from the previous frame to the cache
        GamepadHandler.#buttonsCache = GamepadHandler.#buttonsStatus.slice(0);
        // Clear the buttons status
        GamepadHandler.#buttonsStatus = [];

        const pressed = [];
        const timestamps = [0, 0, 0, 0];
        GamepadHandler.#nativeGetGamepads().forEach(gamepad => {
            if (!gamepad || gamepad.mapping !== 'standard' || !gamepad.buttons) {
                return;
            }

            gamepad.buttons.forEach((button, index) => {
                // Only add the newly pressed button to the array (holding doesn't count)
                if (button.pressed) {
                    timestamps[index] = gamepad.timestamp;
                    pressed[index] = true;
                }
            });
        });

        GamepadHandler.#buttonsStatus = pressed;
        GamepadHandler.#isHoldingHome = !!pressed[GamepadHandler.#BUTTON_HOME];

        if (GamepadHandler.#isHoldingHome) {
            // Update timestamps
            GamepadHandler.#emulatedGamepads.forEach(gamepad => {
                gamepad && (gamepad.timestamp = timestamps[gamepad.index]);
            });

            // Patch getGamepads()
            window.navigator.getGamepads = GamepadHandler.#customGetGamepads;

            // Check pressed button
            if (GamepadHandler.#isPressed(GamepadHandler.#BUTTON_RB)) {
                takeScreenshot();
            } else if (GamepadHandler.#isPressed(GamepadHandler.#BUTTON_SELECT)) {
                StreamStats.toggle();
            }
        } else {
            // Restore to native getGamepads()
            window.navigator.getGamepads = GamepadHandler.#nativeGetGamepads;
        }
    }

    static initialSetup() {
        window.addEventListener('gamepadconnected', e => {
            const gamepad = e.gamepad;
            console.log('Gamepad connected', gamepad);

            GamepadHandler.#emulatedGamepads[gamepad.index] = GamepadHandler.#cloneGamepad(gamepad);
            if (IS_PLAYING) {
                GamepadHandler.startPolling();
            }
        });

        window.addEventListener('gamepaddisconnected', e => {
            console.log('Gamepad disconnected', e.gamepad);
            GamepadHandler.#emulatedGamepads[e.gamepad.index] = null;

            // No gamepads left
            const noGamepads = GamepadHandler.#nativeGetGamepads().every(gamepad => gamepad === null);
            if (noGamepads) {
                GamepadHandler.stopPolling();
            }
        });
    }

    static startPolling() {
        if (GamepadHandler.#isPolling) {
            return;
        }

        GamepadHandler.stopPolling();

        GamepadHandler.#isPolling = true;
        GamepadHandler.#pollingInterval = setInterval(GamepadHandler.#poll, 50);
    }

    static stopPolling() {
        GamepadHandler.#isPolling = false;
        GamepadHandler.#isHoldingHome = false;
        GamepadHandler.#pollingInterval && clearInterval(GamepadHandler.#pollingInterval);
        GamepadHandler.#pollingInterval = null;
    }
}


class VibrationManager {
    static #playDeviceVibration(data) {
        // console.log(+new Date, data);

        const intensity = Math.min(100, data.leftMotorPercent + data.rightMotorPercent / 2) * window.BX_VIBRATION_INTENSITY;
        if (intensity === 0 || intensity === 100) {
            // Stop vibration
            window.navigator.vibrate(intensity ? data.durationMs : 0);
            return;
        }

        const pulseDuration = 200;
        const onDuration = Math.floor(pulseDuration * intensity / 100);
        const offDuration = pulseDuration - onDuration;

        const repeats = Math.ceil(data.durationMs / pulseDuration);

        const pulses = Array(repeats).fill([onDuration, offDuration]).flat();
        // console.log(pulses);

        window.navigator.vibrate(pulses);
    }

    static supportControllerVibration() {
        return Gamepad.prototype.hasOwnProperty('vibrationActuator');
    }

    static supportDeviceVibration() {
        return !!window.navigator.vibrate;
    }

    static updateGlobalVars() {
        window.BX_ENABLE_CONTROLLER_VIBRATION = VibrationManager.supportControllerVibration() ? getPref(Preferences.CONTROLLER_ENABLE_VIBRATION) : false;
        window.BX_VIBRATION_INTENSITY = getPref(Preferences.CONTROLLER_VIBRATION_INTENSITY) / 100;

        if (!VibrationManager.supportDeviceVibration()) {
            window.BX_ENABLE_DEVICE_VIBRATION = false;
            return;
        }

        // Stop vibration
        window.navigator.vibrate(0);

        const value = getPref(Preferences.CONTROLLER_DEVICE_VIBRATION);
        let enabled;

        if (value === 'on') {
            enabled = true;
        } else if (value === 'auto') {
            enabled = true;
            const gamepads = window.navigator.getGamepads();
            for (const gamepad of gamepads) {
                if (gamepad) {
                    enabled = false;
                    break;
                }
            }
        } else {
            enabled = false;
        }

        window.BX_ENABLE_DEVICE_VIBRATION = enabled;
    }

    static initialSetup() {
        window.addEventListener('gamepadconnected', VibrationManager.updateGlobalVars);
        window.addEventListener('gamepaddisconnected', VibrationManager.updateGlobalVars);

        VibrationManager.updateGlobalVars();

        window.addEventListener(BxEvent.DATA_CHANNEL_CREATED, e => {
            const dataChannel = e.dataChannel;
            if (!dataChannel || dataChannel.label !== 'input') {
                return;
            }

            const VIBRATION_DATA_MAP = {
                'gamepadIndex': 8,
                'leftMotorPercent': 8,
                'rightMotorPercent': 8,
                'leftTriggerMotorPercent': 8,
                'rightTriggerMotorPercent': 8,
                'durationMs': 16,
                // 'delayMs': 16,
                // 'repeat': 8,
            };

            dataChannel.addEventListener('message', e => {
                if (!window.BX_ENABLE_DEVICE_VIBRATION) {
                    return;
                }

                if (typeof e !== 'object' || !(e.data instanceof ArrayBuffer)) {
                    return;
                }

                const dataView = new DataView(e.data);
                let offset = 0;

                let messageType;
                if (dataView.byteLength === 13) { // version >= 8
                    messageType = dataView.getUint16(offset, true);
                    offset += Uint16Array.BYTES_PER_ELEMENT;
                } else {
                    messageType = dataView.getUint8(offset);
                    offset += Uint8Array.BYTES_PER_ELEMENT;
                }

                if (!(messageType & 128)) { // Vibration
                    return;
                }

                const vibrationType = dataView.getUint8(offset);
                offset += Uint8Array.BYTES_PER_ELEMENT;

                if (vibrationType !== 0) { // FourMotorRumble
                    return;
                }

                const data = {};
                for (const key in VIBRATION_DATA_MAP) {
                    if (VIBRATION_DATA_MAP[key] === 16) {
                        data[key] = dataView.getUint16(offset, true);
                        offset += Uint16Array.BYTES_PER_ELEMENT;
                    } else {
                        data[key] = dataView.getUint8(offset);
                        offset += Uint8Array.BYTES_PER_ELEMENT;
                    }
                }

                VibrationManager.#playDeviceVibration(data);
            });
        });
    }
}


class MouseCursorHider {
    static #timeout;
    static #cursorVisible = true;

    static show() {
        document.body && (document.body.style.cursor = 'unset');
        MouseCursorHider.#cursorVisible = true;
    }

    static hide() {
        document.body && (document.body.style.cursor = 'none');
        MouseCursorHider.#timeout = null;
        MouseCursorHider.#cursorVisible = false;
    }

    static onMouseMove(e) {
        // Toggle cursor
        !MouseCursorHider.#cursorVisible && MouseCursorHider.show();
        // Setup timeout
        MouseCursorHider.#timeout && clearTimeout(MouseCursorHider.#timeout);
        MouseCursorHider.#timeout = setTimeout(MouseCursorHider.hide, 3000);
    }

    static start() {
        MouseCursorHider.show();
        document.addEventListener('mousemove', MouseCursorHider.onMouseMove);
    }

    static stop() {
        MouseCursorHider.#timeout && clearTimeout(MouseCursorHider.#timeout);
        document.removeEventListener('mousemove', MouseCursorHider.onMouseMove);
        MouseCursorHider.show();
    }
}


class StreamBadges {
    static get BADGE_PLAYTIME() { return 'playtime'; };
    static get BADGE_BATTERY() { return 'battery'; };
    static get BADGE_IN() { return 'in'; };
    static get BADGE_OUT() { return 'out'; };

    static get BADGE_SERVER() { return 'server'; };
    static get BADGE_VIDEO() { return 'video'; };
    static get BADGE_AUDIO() { return 'audio'; };

    static get BADGE_BREAK() { return 'break'; };

    static ipv6 = false;
    static resolution = null;
    static video = null;
    static audio = null;
    static fps = 0;
    static region = '';

    static startBatteryLevel = 100;
    static startTimestamp = 0;

    static #cachedDoms = {};

    static #interval;
    static get #REFRESH_INTERVAL() { return 3000; };

    static #renderBadge(name, value, color) {
        if (name === StreamBadges.BADGE_BREAK) {
            return CE('div', {'style': 'display: block'});
        }

        let $badge;
        if (StreamBadges.#cachedDoms[name]) {
            $badge = StreamBadges.#cachedDoms[name];
            $badge.lastElementChild.textContent = value;
            return $badge;
        }

        $badge = CE('div', {'class': 'bx-badge'},
                    CE('span', {'class': 'bx-badge-name'}, t(`badge-${name}`)),
                    CE('span', {'class': 'bx-badge-value', 'style': `background-color: ${color}`}, value));

        if (name === StreamBadges.BADGE_BATTERY) {
            $badge.classList.add('bx-badge-battery');
        }

        StreamBadges.#cachedDoms[name] = $badge;
        return $badge;
    }

    static async #updateBadges(forceUpdate) {
        if (!forceUpdate && !document.querySelector('.bx-badges')) {
            StreamBadges.#stop();
            return;
        }

        // Playtime
        let now = +new Date;
        const diffSeconds = Math.ceil((now - StreamBadges.startTimestamp) / 1000);
        const playtime = StreamBadges.#secondsToHm(diffSeconds);

        // Battery
        let batteryLevel = '100%';
        let batteryLevelInt = 100;
        let isCharging = false;
        if (navigator.getBattery) {
            try {
                const bm = await navigator.getBattery();
                isCharging = bm.charging;
                batteryLevelInt = Math.round(bm.level * 100);
                batteryLevel = `${batteryLevelInt}%`;

                if (batteryLevelInt != StreamBadges.startBatteryLevel) {
                    const diffLevel = Math.round(batteryLevelInt - StreamBadges.startBatteryLevel);
                    const sign = diffLevel > 0 ? '+' : '';
                    batteryLevel += ` (${sign}${diffLevel}%)`;
                }
            } catch(e) {}
        }

        const stats = await STREAM_WEBRTC.getStats();
        let totalIn = 0;
        let totalOut = 0;
        stats.forEach(stat => {
            if (stat.type === 'candidate-pair' && stat.packetsReceived > 0 && stat.state === 'succeeded') {
                totalIn += stat.bytesReceived;
                totalOut += stat.bytesSent;
            }
        });

        const badges = {
            [StreamBadges.BADGE_IN]: totalIn ? StreamBadges.#humanFileSize(totalIn) : null,
            [StreamBadges.BADGE_OUT]: totalOut ? StreamBadges.#humanFileSize(totalOut) : null,
            [StreamBadges.BADGE_PLAYTIME]: playtime,
            [StreamBadges.BADGE_BATTERY]: batteryLevel,
        };

        for (let name in badges) {
            const value = badges[name];
            if (value === null) {
                continue;
            }

            const $elm = StreamBadges.#cachedDoms[name];
            $elm && ($elm.lastElementChild.textContent = value);

            if (name === StreamBadges.BADGE_BATTERY) {
                // Show charging status
                $elm.setAttribute('data-charging', isCharging);

                if (StreamBadges.startBatteryLevel === 100 && batteryLevelInt === 100) {
                    $elm.style.display = 'none';
                } else {
                    $elm.style = '';
                }
            }
        }
    }

    static #stop() {
        StreamBadges.#interval && clearInterval(StreamBadges.#interval);
        StreamBadges.#interval = null;
    }

    static #secondsToHm(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor(seconds % 3600 / 60) + 1;

        const hDisplay = h > 0 ? `${h}h`: '';
        const mDisplay = m > 0 ? `${m}m`: '';
        return hDisplay + mDisplay;
    }

    // https://stackoverflow.com/a/20732091
    static #humanFileSize(size) {
        let i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
        return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
    }

    static async render() {
        // Video
        let video = '';
        if (StreamBadges.resolution) {
            video = `${StreamBadges.resolution.height}p`;
        }

        if (StreamBadges.video) {
            video && (video += '/');
            video += StreamBadges.video.codec;
            if (StreamBadges.video.profile) {
                const profile = StreamBadges.video.profile;

                let quality = profile;
                if (profile.startsWith('4d')) {
                    quality = t('visual-quality-high');
                } else if (profile.startsWith('42e')) {
                    quality = t('visual-quality-normal');
                } else if (profile.startsWith('420')) {
                    quality = t('visual-quality-low');
                }

                video += ` (${quality})`;
            }
        }

        // Audio
        let audio;
        if (StreamBadges.audio) {
            audio = StreamBadges.audio.codec;
            const bitrate = StreamBadges.audio.bitrate / 1000;
            audio += ` (${bitrate} kHz)`;
        }

        // Battery
        let batteryLevel = '';
        if (navigator.getBattery) {
            batteryLevel = '100%';
        }

        // Server + Region
        let server = StreamBadges.region;
        server += '@' + (StreamBadges.ipv6 ? 'IPv6' : 'IPv4');

        const BADGES = [
            [StreamBadges.BADGE_PLAYTIME, '1m', '#ff004d'],
            [StreamBadges.BADGE_BATTERY, batteryLevel, '#00b543'],
            [StreamBadges.BADGE_IN, StreamBadges.#humanFileSize(0), '#29adff'],
            [StreamBadges.BADGE_OUT, StreamBadges.#humanFileSize(0), '#ff77a8'],
            [StreamBadges.BADGE_BREAK],
            [StreamBadges.BADGE_SERVER, server, '#ff6c24'],
            video ? [StreamBadges.BADGE_VIDEO, video, '#742f29'] : null,
            audio ? [StreamBadges.BADGE_AUDIO, audio, '#5f574f'] : null,
        ];

        const $wrapper = createElement('div', {'class': 'bx-badges'});
        BADGES.forEach(item => item && $wrapper.appendChild(StreamBadges.#renderBadge(...item)));

        await StreamBadges.#updateBadges(true);
        StreamBadges.#stop();
        StreamBadges.#interval = setInterval(StreamBadges.#updateBadges, StreamBadges.#REFRESH_INTERVAL);

        return $wrapper;
    }

    static setupEvents() {
        window.addEventListener(BxEvent.STREAM_PLAYING, e => {
            const $video = e.$video;

            StreamBadges.resolution = {width: $video.videoWidth, height: $video.videoHeight};
            StreamBadges.startTimestamp = +new Date;

            // Get battery level
            try {
                navigator.getBattery && navigator.getBattery().then(bm => {
                    StreamBadges.startBatteryLevel = Math.round(bm.level * 100);
                });
            } catch(e) {}
        });
    }
}


class StreamStats {
    static get PING() { return 'ping'; }
    static get FPS() { return 'fps'; }
    static get BITRATE() { return 'btr'; }
    static get DECODE_TIME() { return 'dt'; }
    static get PACKETS_LOST() { return 'pl'; }
    static get FRAMES_LOST() { return 'fl'; }

    static #interval;
    static #updateInterval = 1000;

    static #$container;
    static #$fps;
    static #$ping;
    static #$dt;
    static #$pl;
    static #$fl;
    static #$br;

    static #lastStat;

    static #quickGlanceObserver;

    static start(glancing=false) {
        if (!StreamStats.isHidden() || (glancing && StreamStats.isGlancing())) {
            return;
        }

        StreamStats.#$container.classList.remove('bx-gone');
        StreamStats.#$container.setAttribute('data-display', glancing ? 'glancing' : 'fixed');

        StreamStats.#interval = setInterval(StreamStats.update, StreamStats.#updateInterval);
    }

    static stop(glancing=false) {
        if (glancing && !StreamStats.isGlancing()) {
            return;
        }

        clearInterval(StreamStats.#interval);
        StreamStats.#interval = null;
        StreamStats.#lastStat = null;

        if (StreamStats.#$container) {
            StreamStats.#$container.removeAttribute('data-display');
            StreamStats.#$container.classList.add('bx-gone');
        }
    }

    static toggle() {
        if (StreamStats.isGlancing()) {
            StreamStats.#$container.setAttribute('data-display', 'fixed');
        } else {
            StreamStats.isHidden() ? StreamStats.start() : StreamStats.stop();
        }
    }

    static onStoppedPlaying() {
        StreamStats.stop();
        StreamStats.quickGlanceStop();
        StreamStats.hideSettingsUi();
    }

    static isHidden = () => StreamStats.#$container && StreamStats.#$container.classList.contains('bx-gone');
    static isGlancing = () => StreamStats.#$container && StreamStats.#$container.getAttribute('data-display') === 'glancing';

    static quickGlanceSetup() {
        if (StreamStats.#quickGlanceObserver) {
            return;
        }

        const $uiContainer = document.querySelector('div[data-testid=ui-container]');
        StreamStats.#quickGlanceObserver = new MutationObserver((mutationList, observer) => {
            for (let record of mutationList) {
                if (record.attributeName && record.attributeName === 'aria-expanded') {
                    const expanded = record.target.ariaExpanded;
                    if (expanded === 'true') {
                        StreamStats.isHidden() && StreamStats.start(true);
                    } else {
                        StreamStats.stop(true);
                    }
                }
            }
        });

        StreamStats.#quickGlanceObserver.observe($uiContainer, {
            attributes: true,
            attributeFilter: ['aria-expanded'],
            subtree: true,
        });
    }

    static quickGlanceStop() {
        StreamStats.#quickGlanceObserver && StreamStats.#quickGlanceObserver.disconnect();
        StreamStats.#quickGlanceObserver = null;
    }

    static update() {
        if (StreamStats.isHidden() || !STREAM_WEBRTC) {
            StreamStats.onStoppedPlaying();
            return;
        }

        const PREF_STATS_CONDITIONAL_FORMATTING = getPref(Preferences.STATS_CONDITIONAL_FORMATTING);
        STREAM_WEBRTC.getStats().then(stats => {
            stats.forEach(stat => {
                let grade = '';
                if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
                    // FPS
                    StreamStats.#$fps.textContent = stat.framesPerSecond || 0;

                    // Packets Lost
                    const packetsLost = stat.packetsLost;
                    const packetsReceived = stat.packetsReceived;
                    const packetsLostPercentage = (packetsLost * 100 / ((packetsLost + packetsReceived) || 1)).toFixed(2);
                    StreamStats.#$pl.textContent = packetsLostPercentage === '0.00' ? packetsLost : `${packetsLost} (${packetsLostPercentage}%)`;

                    // Frames Dropped
                    const framesDropped = stat.framesDropped;
                    const framesReceived = stat.framesReceived;
                    const framesDroppedPercentage = (framesDropped * 100 / ((framesDropped + framesReceived) || 1)).toFixed(2);
                    StreamStats.#$fl.textContent = framesDroppedPercentage === '0.00' ? framesDropped : `${framesDropped} (${framesDroppedPercentage}%)`;

                    if (StreamStats.#lastStat) {
                        const lastStat = StreamStats.#lastStat;
                        // Bitrate
                        const timeDiff = stat.timestamp - lastStat.timestamp;
                        const bitrate = 8 * (stat.bytesReceived - lastStat.bytesReceived) / timeDiff / 1000;
                        StreamStats.#$br.textContent = `${bitrate.toFixed(2)} Mbps`;

                        // Decode time
                        const totalDecodeTimeDiff = stat.totalDecodeTime - lastStat.totalDecodeTime;
                        const framesDecodedDiff = stat.framesDecoded - lastStat.framesDecoded;
                        const currentDecodeTime = totalDecodeTimeDiff / framesDecodedDiff * 1000;
                        StreamStats.#$dt.textContent = `${currentDecodeTime.toFixed(2)}ms`;

                        if (PREF_STATS_CONDITIONAL_FORMATTING) {
                            grade = (currentDecodeTime > 12) ? 'bad' : (currentDecodeTime > 9) ? 'ok' : (currentDecodeTime > 6) ? 'good' : '';
                        }
                        StreamStats.#$dt.setAttribute('data-grade', grade);
                    }

                    StreamStats.#lastStat = stat;
                } else if (stat.type === 'candidate-pair' && stat.packetsReceived > 0 && stat.state === 'succeeded') {
                    // Round Trip Time
                    const roundTripTime = typeof stat.currentRoundTripTime !== 'undefined' ? stat.currentRoundTripTime * 1000 : '???';
                    StreamStats.#$ping.textContent = roundTripTime;

                    if (PREF_STATS_CONDITIONAL_FORMATTING) {
                        grade = (roundTripTime > 100) ? 'bad' : (roundTripTime > 75) ? 'ok' : (roundTripTime > 40) ? 'good' : '';
                    }
                    StreamStats.#$ping.setAttribute('data-grade', grade);
                }
            });
        });
    }

    static refreshStyles() {
        const PREF_ITEMS = getPref(Preferences.STATS_ITEMS);
        const PREF_POSITION = getPref(Preferences.STATS_POSITION);
        const PREF_TRANSPARENT = getPref(Preferences.STATS_TRANSPARENT);
        const PREF_OPACITY = getPref(Preferences.STATS_OPACITY);
        const PREF_TEXT_SIZE = getPref(Preferences.STATS_TEXT_SIZE);

        const $container = StreamStats.#$container;
        $container.setAttribute('data-stats', '[' + PREF_ITEMS.join('][') + ']');
        $container.setAttribute('data-position', PREF_POSITION);
        $container.setAttribute('data-transparent', PREF_TRANSPARENT);
        $container.style.opacity = PREF_OPACITY + '%';
        $container.style.fontSize = PREF_TEXT_SIZE;
    }

    static hideSettingsUi() {
        if (StreamStats.isGlancing() && !getPref(Preferences.STATS_QUICK_GLANCE)) {
            StreamStats.stop();
        }
    }

    static render() {
        if (StreamStats.#$container) {
            return;
        }

        const STATS = {
            [StreamStats.PING]: [t('stat-ping'), StreamStats.#$ping = CE('span', {}, '0')],
            [StreamStats.FPS]: [t('stat-fps'), StreamStats.#$fps = CE('span', {}, '0')],
            [StreamStats.BITRATE]: [t('stat-bitrate'), StreamStats.#$br = CE('span', {}, '0 Mbps')],
            [StreamStats.DECODE_TIME]: [t('stat-decode-time'), StreamStats.#$dt = CE('span', {}, '0ms')],
            [StreamStats.PACKETS_LOST]: [t('stat-packets-lost'), StreamStats.#$pl = CE('span', {}, '0')],
            [StreamStats.FRAMES_LOST]: [t('stat-frames-lost'), StreamStats.#$fl = CE('span', {}, '0')],
        };

        const $barFragment = document.createDocumentFragment();
        for (let statKey in STATS) {
            const $div = CE('div', {'class': `bx-stat-${statKey}`, title: STATS[statKey][0]}, CE('label', {}, statKey.toUpperCase()), STATS[statKey][1]);
            $barFragment.appendChild($div);
        }

        StreamStats.#$container = CE('div', {'class': 'bx-stats-bar bx-gone'}, $barFragment);
        document.documentElement.appendChild(StreamStats.#$container);

        StreamStats.refreshStyles();
    }

    static getServerStats() {
        STREAM_WEBRTC && STREAM_WEBRTC.getStats().then(stats => {
            const allVideoCodecs = {};
            let videoCodecId;

            const allAudioCodecs = {};
            let audioCodecId;

            const allCandidates = {};
            let candidateId;

            stats.forEach(stat => {
                if (stat.type == 'codec') {
                    const mimeType = stat.mimeType.split('/');
                    if (mimeType[0] === 'video') {
                        // Store all video stats
                        allVideoCodecs[stat.id] = stat;
                    } else if (mimeType[0] === 'audio') {
                        // Store all audio stats
                        allAudioCodecs[stat.id] = stat;
                    }
                } else if (stat.type === 'inbound-rtp' && stat.packetsReceived > 0) {
                    // Get the codecId of the video/audio track currently being used
                    if (stat.kind === 'video') {
                        videoCodecId = stat.codecId;
                    } else if (stat.kind === 'audio') {
                        audioCodecId = stat.codecId;
                    }
                } else if (stat.type === 'candidate-pair' && stat.packetsReceived > 0 && stat.state === 'succeeded') {
                    candidateId = stat.remoteCandidateId;
                } else if (stat.type === 'remote-candidate') {
                    allCandidates[stat.id] = stat.address;
                }
            });

            // Get video codec from codecId
            if (videoCodecId) {
                const videoStat = allVideoCodecs[videoCodecId];
                const video = {
                    codec: videoStat.mimeType.substring(6),
                };

                if (video.codec === 'H264') {
                    const match = /profile-level-id=([0-9a-f]{6})/.exec(videoStat.sdpFmtpLine);
                    video.profile = match ? match[1] : null;
                }

                StreamBadges.video = video;
            }

            // Get audio codec from codecId
            if (audioCodecId) {
                const audioStat = allAudioCodecs[audioCodecId];
                StreamBadges.audio = {
                    codec: audioStat.mimeType.substring(6),
                    bitrate: audioStat.clockRate,
                }
            }

            // Get server type
            if (candidateId) {
                console.log('candidate', candidateId, allCandidates);
                StreamBadges.ipv6 = allCandidates[candidateId].includes(':');
            }

            if (getPref(Preferences.STATS_SHOW_WHEN_PLAYING)) {
                StreamStats.start();
            }
        });
    }

    static setupEvents() {
        window.addEventListener(BxEvent.STREAM_PLAYING, e => {
            const PREF_STATS_QUICK_GLANCE = getPref(Preferences.STATS_QUICK_GLANCE);
            const PREF_STATS_SHOW_WHEN_PLAYING = getPref(Preferences.STATS_SHOW_WHEN_PLAYING);

            StreamStats.getServerStats();
            // Setup Stat's Quick Glance mode
            if (PREF_STATS_QUICK_GLANCE) {
                StreamStats.quickGlanceSetup();
                // Show stats bar
                !PREF_STATS_SHOW_WHEN_PLAYING && StreamStats.start(true);
            }
        });
    }
}

class UserAgent {
    static get PROFILE_EDGE_WINDOWS() { return 'edge-windows'; }
    static get PROFILE_SAFARI_MACOS() { return 'safari-macos'; }
    static get PROFILE_SMARTTV_TIZEN() { return 'smarttv-tizen'; }
    static get PROFILE_DEFAULT() { return 'default'; }
    static get PROFILE_CUSTOM() { return 'custom'; }

    static #USER_AGENTS = {
        [UserAgent.PROFILE_EDGE_WINDOWS]: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.188',
        [UserAgent.PROFILE_SAFARI_MACOS]: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5.2 Safari/605.1.1',
        [UserAgent.PROFILE_SMARTTV_TIZEN]: 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 7.0) AppleWebKit/537.36 (KHTML, like Gecko) 94.0.4606.31/7.0 TV Safari/537.36',
    }

    static getDefault() {
        return window.navigator.orgUserAgent || window.navigator.userAgent;
    }

    static get(profile) {
        const defaultUserAgent = UserAgent.getDefault();
        if (profile === UserAgent.PROFILE_CUSTOM) {
            return getPref(Preferences.USER_AGENT_CUSTOM, '');
        }

        return UserAgent.#USER_AGENTS[profile] || defaultUserAgent;
    }

    static isSafari(mobile=false) {
        const userAgent = (UserAgent.getDefault() || '').toLowerCase();
        let result = userAgent.includes('safari') && !userAgent.includes('chrom');

        if (result && mobile) {
            result = userAgent.includes('mobile');
        }

        return result;
    }

    static spoof() {
        const profile = getPref(Preferences.USER_AGENT_PROFILE);
        if (profile === UserAgent.PROFILE_DEFAULT) {
            return;
        }

        const defaultUserAgent = window.navigator.userAgent;
        const userAgent = UserAgent.get(profile) || defaultUserAgent;

        // Clear data of navigator.userAgentData, force xCloud to detect browser based on navigator.userAgent
        Object.defineProperty(window.navigator, 'userAgentData', {});

        // Override navigator.userAgent
        window.navigator.orgUserAgent = window.navigator.userAgent;
        Object.defineProperty(window.navigator, 'userAgent', {
            value: userAgent,
        });

        return userAgent;
    }
}


class PreloadedState {
    static override() {
        Object.defineProperty(window, '__PRELOADED_STATE__', {
            configurable: true,
            get: () => {
                // Override User-Agent
                const userAgent = UserAgent.spoof();
                if (userAgent) {
                    this._state.appContext.requestInfo.userAgent = userAgent;
                }

                return this._state;
            },
            set: state => {
                this._state = state;
                APP_CONTEXT = structuredClone(state.appContext);

                // Get a list of touch-supported games
                if (getPref(Preferences.STREAM_TOUCH_CONTROLLER) === 'all') {
                    let titles = {};
                    try {
                        titles = state.xcloud.titles.data.titles;
                    } catch (e) {}

                    for (let id in titles) {
                        TitlesInfo.saveFromTitleInfo(titles[id].data);
                    }
                }
            }
        });
    }
}


class Preferences {
    static get LAST_UPDATE_CHECK() { return 'version_last_check'; }
    static get LATEST_VERSION() { return 'version_latest'; }
    static get CURRENT_VERSION() { return 'version_current'; }

    static get BETTER_XCLOUD_LOCALE() { return 'bx_locale'};

    static get SERVER_REGION() { return 'server_region'; }
    static get PREFER_IPV6_SERVER() { return 'prefer_ipv6_server'; }
    static get STREAM_TARGET_RESOLUTION() { return 'stream_target_resolution'; }
    static get STREAM_PREFERRED_LOCALE() { return 'stream_preferred_locale'; }
    static get STREAM_CODEC_PROFILE() { return 'stream_codec_profile'; }

    static get USER_AGENT_PROFILE() { return 'user_agent_profile'; }
    static get USER_AGENT_CUSTOM() { return 'user_agent_custom'; }
    static get STREAM_SIMPLIFY_MENU() { return 'stream_simplify_menu'; }

    static get STREAM_TOUCH_CONTROLLER() { return 'stream_touch_controller'; }
    static get STREAM_TOUCH_CONTROLLER_STYLE_STANDARD() { return 'stream_touch_controller_style_standard'; }
    static get STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM() { return 'stream_touch_controller_style_custom'; }

    static get STREAM_DISABLE_FEEDBACK_DIALOG() { return 'stream_disable_feedback_dialog'; }

    static get LOCAL_CO_OP_ENABLED() { return 'local_co_op_enabled'; }
    // static get LOCAL_CO_OP_SEPARATE_TOUCH_CONTROLLER() { return 'local_co_op_separate_touch_controller'; }

    static get CONTROLLER_ENABLE_SHORTCUTS() { return 'controller_enable_shortcuts'; }
    static get CONTROLLER_ENABLE_VIBRATION() { return 'controller_enable_vibration'; }
    static get CONTROLLER_DEVICE_VIBRATION() { return 'controller_device_vibration'; }
    static get CONTROLLER_VIBRATION_INTENSITY() { return 'controller_vibration_intensity'; }

    static get MKB_ENABLED() { return 'mkb_enabled'; }
    static get MKB_HIDE_IDLE_CURSOR() { return 'mkb_hide_idle_cursor';}
    static get MKB_ABSOLUTE_MOUSE() { return 'mkb_absolute_mouse'; }
    static get MKB_DEFAULT_PRESET_ID() { return 'mkb_default_preset_id'; }

    static get SCREENSHOT_BUTTON_POSITION() { return 'screenshot_button_position'; }
    static get BLOCK_TRACKING() { return 'block_tracking'; }
    static get BLOCK_SOCIAL_FEATURES() { return 'block_social_features'; }
    static get SKIP_SPLASH_VIDEO() { return 'skip_splash_video'; }
    static get HIDE_DOTS_ICON() { return 'hide_dots_icon'; }
    static get REDUCE_ANIMATIONS() { return 'reduce_animations'; }

    static get UI_LOADING_SCREEN_GAME_ART() { return 'ui_loading_screen_game_art'; }
    static get UI_LOADING_SCREEN_WAIT_TIME() { return 'ui_loading_screen_wait_time'; }
    static get UI_LOADING_SCREEN_ROCKET() { return 'ui_loading_screen_rocket'; }

    static get UI_LAYOUT() { return 'ui_layout'; }

    static get VIDEO_CLARITY() { return 'video_clarity'; }
    static get VIDEO_RATIO() { return 'video_ratio' }
    static get VIDEO_BRIGHTNESS() { return 'video_brightness'; }
    static get VIDEO_CONTRAST() { return 'video_contrast'; }
    static get VIDEO_SATURATION() { return 'video_saturation'; }

    static get AUDIO_MIC_ON_PLAYING() { return 'audio_mic_on_playing'; }
    static get AUDIO_ENABLE_VOLUME_CONTROL() { return 'audio_enable_volume_control'; }
    static get AUDIO_VOLUME() { return 'audio_volume'; }

    static get STATS_ITEMS() { return 'stats_items'; };
    static get STATS_SHOW_WHEN_PLAYING() { return 'stats_show_when_playing'; }
    static get STATS_QUICK_GLANCE() { return 'stats_quick_glance'; }
    static get STATS_POSITION() { return 'stats_position'; }
    static get STATS_TEXT_SIZE() { return 'stats_text_size'; }
    static get STATS_TRANSPARENT() { return 'stats_transparent'; }
    static get STATS_OPACITY() { return 'stats_opacity'; }
    static get STATS_CONDITIONAL_FORMATTING() { return 'stats_conditional_formatting'; }

    static get REMOTE_PLAY_ENABLED() { return 'xhome_enabled'; }
    static get REMOTE_PLAY_RESOLUTION() { return 'xhome_resolution'; }

    static get GAME_FORTNITE_FORCE_CONSOLE() { return 'game_fortnite_force_console'; }

    // Deprecated
    static get DEPRECATED_CONTROLLER_SUPPORT_LOCAL_CO_OP() { return 'controller_local_co_op'; }

    static SETTINGS = {
        [Preferences.LAST_UPDATE_CHECK]: {
            'default': 0,
        },
        [Preferences.LATEST_VERSION]: {
            'default': '',
        },
        [Preferences.CURRENT_VERSION]: {
            'default': '',
        },
        [Preferences.BETTER_XCLOUD_LOCALE]: {
            'default': localStorage.getItem('better_xcloud_locale') || 'en-US',
            'options': {
                'de-DE': 'Deutsch',
                'en-US': 'English (United States)',
                'es-ES': 'espa\xf1ol (Espa\xf1a)',
                'fr-FR': 'fran\xe7ais',
                'it-IT': 'italiano',
                'ja-JP': '\u65e5\u672c\u8a9e',
                'ko-KR': '\ud55c\uad6d\uc5b4',
                'pl-PL': 'polski',
                'pt-BR': 'portugu\xeas (Brasil)',
                'ru-RU': '\u0440\u0443\u0441\u0441\u043a\u0438\u0439',
                'tr-TR': 'T\xfcrk\xe7e',
                'uk-UA': 'українська',
                'vi-VN': 'Tiếng Việt',
                'zh-CN': '\u4e2d\u6587(\u7b80\u4f53)',
            },
        },
        [Preferences.SERVER_REGION]: {
            'default': 'default',
        },
        [Preferences.STREAM_PREFERRED_LOCALE]: {
            'default': 'default',
            'options': {
                'default': t('default'),
                'ar-SA': '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',
                'cs-CZ': '\u010de\u0161tina',
                'da-DK': 'dansk',
                'de-DE': 'Deutsch',
                'el-GR': '\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac',
                'en-GB': 'English (United Kingdom)',
                'en-US': 'English (United States)',
                'es-ES': 'espa\xf1ol (Espa\xf1a)',
                'es-MX': 'espa\xf1ol (Latinoam\xe9rica)',
                'fi-FI': 'suomi',
                'fr-FR': 'fran\xe7ais',
                'he-IL': '\u05e2\u05d1\u05e8\u05d9\u05ea',
                'hu-HU': 'magyar',
                'it-IT': 'italiano',
                'ja-JP': '\u65e5\u672c\u8a9e',
                'ko-KR': '\ud55c\uad6d\uc5b4',
                'nb-NO': 'norsk bokm\xe5l',
                'nl-NL': 'Nederlands',
                'pl-PL': 'polski',
                'pt-BR': 'portugu\xeas (Brasil)',
                'pt-PT': 'portugu\xeas (Portugal)',
                'ru-RU': '\u0440\u0443\u0441\u0441\u043a\u0438\u0439',
                'sk-SK': 'sloven\u010dina',
                'sv-SE': 'svenska',
                'tr-TR': 'T\xfcrk\xe7e',
                'zh-CN': '\u4e2d\u6587(\u7b80\u4f53)',
                'zh-TW': '\u4e2d\u6587 (\u7e41\u9ad4)',
            },
        },
        [Preferences.STREAM_TARGET_RESOLUTION]: {
            'default': '1080p',
            'options': {
                'auto': t('default'),
                '1080p': '1080p',
                '720p': '720p',
            },
        },
        [Preferences.STREAM_CODEC_PROFILE]: {
            'default': 'default',
            'options': (() => {
                const options = {
                    'default': t('default'),
                };

                if (!('getCapabilities' in RTCRtpReceiver) || typeof RTCRtpTransceiver === 'undefined' || !('setCodecPreferences' in RTCRtpTransceiver.prototype)) {
                    return options;
                }

                let hasLowCodec = false;
                let hasNormalCodec = false;
                let hasHighCodec = false;

                const codecs = RTCRtpReceiver.getCapabilities('video').codecs;
                for (let codec of codecs) {
                    if (codec.mimeType.toLowerCase() !== 'video/h264' || !codec.sdpFmtpLine) {
                        continue;
                    }

                    const fmtp = codec.sdpFmtpLine.toLowerCase();
                    if (!hasHighCodec && fmtp.includes('profile-level-id=4d')) {
                        hasHighCodec = true;
                    } else if (!hasNormalCodec && fmtp.includes('profile-level-id=42e')) {
                        hasNormalCodec = true;
                    } else if (!hasLowCodec && fmtp.includes('profile-level-id=420')) {
                        hasLowCodec = true;
                    }
                }

                if (hasLowCodec) {
                    if (!hasNormalCodec && !hasHighCodec) {
                        options.default = `${t('visual-quality-low')} (${t('default')})`;
                    } else {
                        options.low = t('visual-quality-low');
                    }
                }
                if (hasNormalCodec) {
                    if (!hasLowCodec && !hasHighCodec) {
                        options.default = `${t('visual-quality-normal')} (${t('default')})`;
                    } else {
                        options.normal = t('visual-quality-normal');
                    }
                }
                if (hasHighCodec) {
                    if (!hasLowCodec && !hasNormalCodec) {
                        options.default = `${t('visual-quality-high')} (${t('default')})`;
                    } else {
                        options.high = t('visual-quality-high');
                    }
                }

                return options;
            })(),
            'ready': () => {
                const setting = Preferences.SETTINGS[Preferences.STREAM_CODEC_PROFILE]
                const options = setting.options;
                const keys = Object.keys(options);

                if (keys.length <= 1) { // Unsupported
                    setting.unsupported = true;
                    setting.note = '⚠️ ' + t('browser-unsupported-feature');
                } else {
                    // Set default value to the best codec profile
                    // setting.default = keys[keys.length - 1];
                }
            },
        },
        [Preferences.PREFER_IPV6_SERVER]: {
            'default': false,
        },
        [Preferences.SCREENSHOT_BUTTON_POSITION]: {
            'default': 'bottom-left',
            'options': {
                'bottom-left': t('bottom-left'),
                'bottom-right': t('bottom-right'),
                'none': t('disable'),
            },
        },
        [Preferences.SKIP_SPLASH_VIDEO]: {
            'default': false,
        },
        [Preferences.HIDE_DOTS_ICON]: {
            'default': false,
        },
        [Preferences.STREAM_TOUCH_CONTROLLER]: {
            'default': 'all',
            'options': {
                'default': t('default'),
                'all': t('tc-all-games'),
                'off': t('off'),
            },
            'unsupported': !HAS_TOUCH_SUPPORT,
            'ready': () => {
                const setting = Preferences.SETTINGS[Preferences.STREAM_TOUCH_CONTROLLER];
                if (setting.unsupported) {
                    setting.default = 'off';
                }
            },
        },
        [Preferences.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD]: {
            'default': 'default',
            'options': {
                'default': t('default'),
                'white': t('tc-all-white'),
                'muted': t('tc-muted-colors'),
            },
            'unsupported': !HAS_TOUCH_SUPPORT,
        },
        [Preferences.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM]: {
            'default': 'default',
            'options': {
                'default': t('default'),
                'muted': t('tc-muted-colors'),
            },
            'unsupported': !HAS_TOUCH_SUPPORT,
        },
        [Preferences.STREAM_SIMPLIFY_MENU]: {
            'default': false,
        },
        [Preferences.MKB_HIDE_IDLE_CURSOR]: {
            'default': false,
        },
        [Preferences.STREAM_DISABLE_FEEDBACK_DIALOG]: {
            'default': false,
        },

        [Preferences.LOCAL_CO_OP_ENABLED]: {
            'default': false,
            'note': CE('a', {
                           href: 'https://github.com/redphx/better-xcloud/discussions/275',
                           target: '_blank',
                       }, t('enable-local-co-op-support-note')),
        },

        /*
        [Preferences.LOCAL_CO_OP_SEPARATE_TOUCH_CONTROLLER]: {
            'default': false,
            'note': t('separate-touch-controller-note'),
        },
        */

        [Preferences.CONTROLLER_ENABLE_SHORTCUTS]: {
            'default': false,
        },

        [Preferences.CONTROLLER_ENABLE_VIBRATION]: {
            'default': true,
        },

        [Preferences.CONTROLLER_DEVICE_VIBRATION]: {
            'default': 'off',
            'options': {
                'on': t('on'),
                'auto': t('device-vibration-not-using-gamepad'),
                'off': t('off'),
            },
        },

        [Preferences.CONTROLLER_VIBRATION_INTENSITY]: {
            'type':  SettingElement.TYPE_NUMBER_STEPPER,
            'default': 100,
            'min': 0,
            'max': 100,
            'steps': 10,
            'params': {
                suffix: '%',
                ticks: 10,
            },
        },

        [Preferences.MKB_ENABLED]: {
            'default': false,
            'unsupported': (() => {
                    const userAgent = (window.navigator.orgUserAgent || window.navigator.userAgent || '').toLowerCase();
                    return userAgent.match(/(android|iphone|ipad)/) ? t('browser-unsupported-feature') : false;
                })(),
            'ready': () => {
                const pref = Preferences.SETTINGS[Preferences.MKB_ENABLED];

                let note;
                let url;
                if (pref.unsupported) {
                    note = t('browser-unsupported-feature');
                    url = 'https://github.com/redphx/better-xcloud/issues/206#issuecomment-1920475657';
                } else {
                    note = t('mkb-disclaimer');
                    url = 'https://better-xcloud.github.io/mouse-and-keyboard/#disclaimer';
                }

                Preferences.SETTINGS[Preferences.MKB_ENABLED].note = CE('a', {
                        href: url,
                        target: '_blank',
                    }, '⚠️ ' + note);
            },
        },

        [Preferences.MKB_DEFAULT_PRESET_ID]: {
            'default': 0,
        },

        [Preferences.MKB_ABSOLUTE_MOUSE]: {
            'default': false,
        },

        [Preferences.REDUCE_ANIMATIONS]: {
            'default': false,
        },

        [Preferences.UI_LOADING_SCREEN_GAME_ART]: {
            'default': true,
        },
        [Preferences.UI_LOADING_SCREEN_WAIT_TIME]: {
            'default': true,
        },
        [Preferences.UI_LOADING_SCREEN_ROCKET]: {
            'default': 'show',
            'options': {
                'show': t('rocket-always-show'),
                'hide-queue': t('rocket-hide-queue'),
                'hide': t('rocket-always-hide'),
            },
        },
        [Preferences.UI_LAYOUT]: {
            'default': 'default',
            'options': {
                'default': t('default'),
                'tv': t('smart-tv'),
            },
        },

        [Preferences.BLOCK_SOCIAL_FEATURES]: {
            'default': false,
        },
        [Preferences.BLOCK_TRACKING]: {
            'default': false,
        },
        [Preferences.USER_AGENT_PROFILE]: {
            'default': 'default',
            'options': {
                [UserAgent.PROFILE_DEFAULT]: t('default'),
                [UserAgent.PROFILE_EDGE_WINDOWS]: 'Edge + Windows',
                [UserAgent.PROFILE_SAFARI_MACOS]: 'Safari + macOS',
                [UserAgent.PROFILE_SMARTTV_TIZEN]: 'Samsung Smart TV',
                [UserAgent.PROFILE_CUSTOM]: t('custom'),
            },
        },
        [Preferences.USER_AGENT_CUSTOM]: {
            'default': '',
        },
        [Preferences.VIDEO_CLARITY]: {
            'type': SettingElement.TYPE_NUMBER_STEPPER,
            'default': 0,
            'min': 0,
            'max': 5,
            'params': {
                hideSlider: true,
            },
        },
        [Preferences.VIDEO_RATIO]: {
            'default': '16:9',
            'options': {
                '16:9': '16:9',
                '21:9': '21:9',
                '16:10': '16:10',
                '4:3': '4:3',

                'fill': t('stretch'),
                //'cover': 'Cover',
            },
        },
        [Preferences.VIDEO_SATURATION]: {
            'type': SettingElement.TYPE_NUMBER_STEPPER,
            'default': 100,
            'min': 50,
            'max': 150,
            'params': {
                suffix: '%',
                ticks: 25,
            },
        },
        [Preferences.VIDEO_CONTRAST]: {
            'type': SettingElement.TYPE_NUMBER_STEPPER,
            'default': 100,
            'min': 50,
            'max': 150,
            'params': {
                suffix: '%',
                ticks: 25,
            },
        },
        [Preferences.VIDEO_BRIGHTNESS]: {
            'type': SettingElement.TYPE_NUMBER_STEPPER,
            'default': 100,
            'min': 50,
            'max': 150,
            'params': {
                suffix: '%',
                ticks: 25,
            },
        },

        [Preferences.AUDIO_MIC_ON_PLAYING]: {
            'default': false,
        },
        [Preferences.AUDIO_ENABLE_VOLUME_CONTROL]: {
            'default': false,
        },
        [Preferences.AUDIO_VOLUME]: {
            'type': SettingElement.TYPE_NUMBER_STEPPER,
            'default': 100,
            'min': 0,
            'max': 600,
            'params': {
                suffix: '%',
                ticks: 100,
            },
        },


        [Preferences.STATS_ITEMS]: {
            'default': [StreamStats.PING, StreamStats.FPS, StreamStats.BITRATE, StreamStats.DECODE_TIME, StreamStats.PACKETS_LOST, StreamStats.FRAMES_LOST],
            'multiple_options': {
                [StreamStats.PING]: `${StreamStats.PING.toUpperCase()}: ${t('stat-ping')}`,
                [StreamStats.FPS]: `${StreamStats.FPS.toUpperCase()}: ${t('stat-fps')}`,
                [StreamStats.BITRATE]: `${StreamStats.BITRATE.toUpperCase()}: ${t('stat-bitrate')}`,
                [StreamStats.DECODE_TIME]: `${StreamStats.DECODE_TIME.toUpperCase()}: ${t('stat-decode-time')}`,
                [StreamStats.PACKETS_LOST]: `${StreamStats.PACKETS_LOST.toUpperCase()}: ${t('stat-packets-lost')}`,
                [StreamStats.FRAMES_LOST]: `${StreamStats.FRAMES_LOST.toUpperCase()}: ${t('stat-frames-lost')}`,
            },
            'params': {
                size: 6,
            },
        },
        [Preferences.STATS_SHOW_WHEN_PLAYING]: {
            'default': false,
        },
        [Preferences.STATS_QUICK_GLANCE]: {
            'default': true,
        },
        [Preferences.STATS_POSITION]: {
            'default': 'top-right',
            'options': {
                'top-left': t('top-left'),
                'top-center': t('top-center'),
                'top-right': t('top-right'),
            },
        },
        [Preferences.STATS_TEXT_SIZE]: {
            'default': '0.9rem',
            'options': {
                '0.9rem': t('small'),
                '1.0rem': t('normal'),
                '1.1rem': t('large'),
            },
        },
        [Preferences.STATS_TRANSPARENT]: {
            'default': false,
        },
        [Preferences.STATS_OPACITY]: {
            'type':  SettingElement.TYPE_NUMBER_STEPPER,
            'default': 80,
            'min': 50,
            'max': 100,
            'params': {
                suffix: '%',
                ticks: 10,
            },
        },
        [Preferences.STATS_CONDITIONAL_FORMATTING]: {
            'default': false,
        },

        [Preferences.REMOTE_PLAY_ENABLED]: {
            'default': false,
        },

        [Preferences.REMOTE_PLAY_RESOLUTION]: {
            'default': '1080p',
            'options': {
                '1080p': '1080p',
                '720p': '720p',
            },
        },

        [Preferences.GAME_FORTNITE_FORCE_CONSOLE]: {
            'default': false,
            'note': t('fortnite-allow-stw-mode'),
        },

        // Deprecated
        [Preferences.DEPRECATED_CONTROLLER_SUPPORT_LOCAL_CO_OP]: {
            'default': false,
            'migrate': function(savedPrefs, value) {
                this.set(Preferences.LOCAL_CO_OP_ENABLED, value);
                savedPrefs[Preferences.LOCAL_CO_OP_ENABLED] = value;
            },
        },
    }

    #storage = localStorage;
    #key = 'better_xcloud';
    #prefs = {};

    constructor() {
        let savedPrefs = this.#storage.getItem(this.#key);
        if (savedPrefs == null) {
            savedPrefs = '{}';
        }
        savedPrefs = JSON.parse(savedPrefs);

        for (let settingId in Preferences.SETTINGS) {
            const setting = Preferences.SETTINGS[settingId];
            setting.ready && setting.ready.call(this);

            if (setting.migrate && settingId in savedPrefs) {
                setting.migrate.call(this, savedPrefs, savedPrefs[settingId]);
            }
        }

        for (let settingId in Preferences.SETTINGS) {
            const setting = Preferences.SETTINGS[settingId];
            if (!setting) {
                alert(`Undefined setting key: ${settingId}`);
                console.log('Undefined setting key');
                continue;
            }

            // Ignore deprecated settings
            if (setting.migrate) {
                continue;
            }

            if (settingId in savedPrefs) {
                this.#prefs[settingId] = this.#validateValue(settingId, savedPrefs[settingId]);
            } else {
                this.#prefs[settingId] = setting.default;
            }
        }
    }

    #validateValue(key, value) {
        const config = Preferences.SETTINGS[key];
        if (!config) {
            return value;
        }

        if (typeof value === 'undefined' || value === null) {
            value = config.default;
        }

        if ('min' in config) {
            value = Math.max(config.min, value);
        }

        if ('max' in config) {
            value = Math.min(config.max, value);
        }

        if ('options' in config && !(value in config.options)) {
            value = config.default;
        } else if ('multiple_options' in config) {
            if (value.length) {
                const validOptions = Object.keys(config.multiple_options);
                value.forEach((item, idx) => {
                    (validOptions.indexOf(item) === -1) && value.splice(idx, 1);
                });
            }

            if (!value.length) {
                value = config.default;
            }
        }

        return value;
    }

    get(key) {
        if (typeof key === 'undefined') {
            debugger;
            return;
        }

        // Return default value if the feature is not supported
        if (Preferences.SETTINGS[key].unsupported) {
            return Preferences.SETTINGS[key].default;
        }

        if (!(key in this.#prefs)) {
            this.#prefs[key] = this.#validateValue(key, null);
        }

        return this.#prefs[key];
    }

    set(key, value) {
        value = this.#validateValue(key, value);

        this.#prefs[key] = value;
        this.#updateStorage();
    }

    #updateStorage() {
        this.#storage.setItem(this.#key, JSON.stringify(this.#prefs));
    }

    toElement(key, onChange, overrideParams={}) {
        const setting = Preferences.SETTINGS[key];
        let currentValue = this.get(key);

        let $control;
        let type;
        if ('type' in setting) {
            type = setting.type;
        } else if ('options' in setting) {
            type = SettingElement.TYPE_OPTIONS;
        } else if ('multiple_options' in setting) {
            type = SettingElement.TYPE_MULTIPLE_OPTIONS;
        } else if (typeof setting.default === 'number') {
            type = SettingElement.TYPE_NUMBER;
        } else {
            type = SettingElement.TYPE_CHECKBOX;
        }

        const params = Object.assign(overrideParams, setting.params || {});
        if (params.disabled) {
            currentValue = Preferences.SETTINGS[key].default;
        }

        $control = SettingElement.render(type, key, setting, currentValue, (e, value) => {
                this.set(key, value);
                onChange && onChange(e, value);
            }, params);

        return $control;
    }

    toNumberStepper(key, onChange, options={}) {
        return SettingElement.render(SettingElement.TYPE_NUMBER_STEPPER, key, Preferences.SETTINGS[key], this.get(key), (e, value) => {
                this.set(key, value);
                onChange && onChange(e, value);
            }, options);
    }
}


const PREFS = new Preferences();
const getPref = PREFS.get.bind(PREFS);
const setPref = PREFS.set.bind(PREFS);


class Patcher {
    static #PATCHES = {
        // Disable ApplicationInsights.track() function
        disableAiTrack: function(funcStr) {
            const text = '.track=function(';
            const index = funcStr.indexOf(text);
            if (index === -1) {
                return false;
            }

            if (funcStr.substring(0, index + 200).includes('"AppInsightsCore')) {
                return false;
            }

            return funcStr.substring(0, index) + '.track=function(e){},!!function(' + funcStr.substring(index + text.length);
        },

        // Set disableTelemetry() to true
        disableTelemetry: function(funcStr) {
            const text = '.disableTelemetry=function(){return!1}';
            if (!funcStr.includes(text)) {
                return false;
            }

            return funcStr.replace(text, '.disableTelemetry=function(){return!0}');
        },

        // Set TV layout
        tvLayout: function(funcStr) {
            const text = '?"tv":"default"';
            if (!funcStr.includes(text)) {
                return false;
            }

            return funcStr.replace(text, '?"tv":"tv"');
        },

        // Replace "/direct-connect" with "/play"
        remotePlayDirectConnectUrl: function(funcStr) {
            const index = funcStr.indexOf('/direct-connect');
            if (index === -1) {
                return false;
            }

            return funcStr.replace(funcStr.substring(index - 9, index + 15), 'https://www.xbox.com/play');
        },

        remotePlayKeepAlive: function(funcStr) {
            if (!funcStr.includes('onServerDisconnectMessage(e){')) {
                return false;
            }

            funcStr = funcStr.replace('onServerDisconnectMessage(e){', `onServerDisconnectMessage(e) {
                const msg = JSON.parse(e);
                if (msg.reason === 'WarningForBeingIdle' && !window.location.pathname.includes('/launch/')) {
                    try {
                        this.sendKeepAlive();
                        return;
                    } catch (ex) { console.log(ex); }
                }
            `);

            return funcStr;
        },

        // Enable Remote Play feature
        remotePlayConnectMode: function(funcStr) {
            const text = 'connectMode:"cloud-connect"';
            if (!funcStr.includes(text)) {
                return false;
            }

            return funcStr.replace(text, `connectMode:window.BX_REMOTE_PLAY_CONFIG?"xhome-connect":"cloud-connect",remotePlayServerId:(window.BX_REMOTE_PLAY_CONFIG&&window.BX_REMOTE_PLAY_CONFIG.serverId)||''`);
        },

        // Disable trackEvent() function
        disableTrackEvent: function(funcStr) {
            const text = 'this.trackEvent=';
            if (!funcStr.includes(text)) {
                return false;
            }

            return funcStr.replace(text, 'this.trackEvent=e=>{},this.uwuwu=');
        },

        // Block WebRTC stats collector
        blockWebRtcStatsCollector: function(funcStr) {
            const text = 'this.intervalMs=0,';
            if (!funcStr.includes(text)) {
                return false;
            }

            return funcStr.replace(text, 'false,' + text);
        },

        enableXcloudLogger: function(funcStr) {
            const text = '}log(e,t,n){';
            if (!funcStr.includes(text)) {
                return false;
            }

            funcStr = funcStr.replaceAll(text, text + 'console.log(arguments);');
            return funcStr;
        },

        enableConsoleLogging: function(funcStr) {
            const text = 'static isConsoleLoggingAllowed(){';
            if (!funcStr.includes(text)) {
                return false;
            }

            funcStr = funcStr.replaceAll(text, text + 'return true;');
            return funcStr;
        },

        // Control controller vibration
        playVibration: function(funcStr) {
            const text = '}playVibration(e){';
            if (!funcStr.includes(text)) {
                return false;
            }

            const newCode = `
if (!window.BX_ENABLE_CONTROLLER_VIBRATION) {
    return void(0);
}
if (window.BX_VIBRATION_INTENSITY && window.BX_VIBRATION_INTENSITY < 1) {
    e.leftMotorPercent = e.leftMotorPercent * window.BX_VIBRATION_INTENSITY;
    e.rightMotorPercent = e.rightMotorPercent * window.BX_VIBRATION_INTENSITY;
    e.leftTriggerMotorPercent = e.leftTriggerMotorPercent * window.BX_VIBRATION_INTENSITY;
    e.rightTriggerMotorPercent = e.rightTriggerMotorPercent * window.BX_VIBRATION_INTENSITY;
}
`;

            VibrationManager.updateGlobalVars();
            funcStr = funcStr.replaceAll(text, text + newCode);
            return funcStr;
        },

        // Override website's settings
        overrideSettings: function(funcStr) {
            const index = funcStr.indexOf(',EnableStreamGate:');
            if (index === -1) {
                return false;
            }

            // Find the next "},"
            const endIndex = funcStr.indexOf('},', index);

            const newSettings = [
                // 'EnableStreamGate: false',
                'PwaPrompt: false',
            ];

            // Enable native Mouse and Keyboard support
            if (ENABLE_NATIVE_MKB_BETA) {
                newSettings.push('EnableMouseAndKeyboard: true');
                newSettings.push('ShowMouseKeyboardSetting: true');

                if (getPref(Preferences.MKB_ABSOLUTE_MOUSE)) {
                    newSettings.push('EnableAbsoluteMouse: true');
                }
            }

            const newCode = newSettings.join(',');

            funcStr = funcStr.substring(0, endIndex) + ',' + newCode + funcStr.substring(endIndex);
            return funcStr;
        },

        mkbIsMouseAndKeyboardTitle: function(funcStr) {
            const text = 'isMouseAndKeyboardTitle:()=>';
            if (!funcStr.includes(text)) {
                return false;
            }

            return funcStr.replace(text, `isMouseAndKeyboardTitle:()=>(function(e) { return e && e.details ? window.NATIVE_MKB_TITLES.includes(e.details.productId) : true; }),uwuwu:()=>`);
        },

        mkbMouseAndKeyboardEnabled: function(funcStr) {
            const text = 'get mouseAndKeyboardEnabled(){';
            if (!funcStr.includes(text)) {
                return false;
            }
            return funcStr.replace(text, 'get mouseAndKeyboardEnabled() {return this._titleSupportsMouseAndKeyboard;');
        },

        disableGamepadDisconnectedScreen: function(funcStr) {
            const index = funcStr.indexOf('"GamepadDisconnected_Title",');
            if (index === -1) {
                return false;
            }

            const constIndex = funcStr.indexOf('const', index - 30);
            funcStr = funcStr.substring(0, constIndex) + 'e.onClose();return null;' + funcStr.substring(constIndex);
            return funcStr;
        },

        patchUpdateInputConfigurationAsync: function(funcStr) {
            const text = 'async updateInputConfigurationAsync(e){';
            if (!funcStr.includes(text)) {
                return false;
            }

            const newCode = 'e.enableTouchInput = true;';

            funcStr = funcStr.replace(text, text + newCode);
            return funcStr;
        },

        // Add patches that are only needed when start playing
        loadingEndingChunks: function(funcStr) {
            const text = 'Symbol("ChatSocketPlugin")';
            if (!funcStr.includes(text)) {
                return false;
            }

            console.log('[Better xCloud] Remaining patches:', Patcher.#PATCH_ORDERS);
            Patcher.#PATCH_ORDERS = Patcher.#PATCH_ORDERS.concat(Patcher.#PLAYING_PATCH_ORDERS);
            Patcher.#cleanupPatches();

            return funcStr;
        },

        // Disable StreamGate
        disableStreamGate: function(funcStr) {
            const index = funcStr.indexOf('case"partially-ready":');
            if (index === -1) {
                return false;
            }

            const bracketIndex = funcStr.indexOf('=>{', index - 150) + 3;

            funcStr = funcStr.substring(0, bracketIndex) + 'return 0;' + funcStr.substring(bracketIndex);
            return funcStr;
        },

        exposeTouchLayoutManager: function(funcStr) {
            const text = 'this._perScopeLayoutsStream=new';
            if (!funcStr.includes(text)) {
                return false;
            }

            funcStr = funcStr.replace(text, 'window.BX_EXPOSED["touch_layout_manager"] = this,' + text);
            return funcStr;
        },

        supportLocalCoOp: function(funcStr) {
            const text = 'this.gamepadMappingsToSend=[],';
            if (!funcStr.includes(text)) {
                return false;
            }

            const patchFunc = () => {
                let match;
                let onGamepadChangedStr = this.onGamepadChanged.toString();

                // match = onGamepadChangedStr.match(/onGamepadChanged\((?<type>\w+),(?<index>\w+),(?<wasAdded>\w+)\)/);

                onGamepadChangedStr = onGamepadChangedStr.replaceAll('0', 'arguments[1]');
                eval(`this.onGamepadChanged = function ${onGamepadChangedStr}`);

                let onGamepadInputStr = this.onGamepadInput.toString();

                match = onGamepadInputStr.match(/(\w+\.GamepadIndex)/);
                if (match) {
                    const gamepadIndexVar = match[0];
                    onGamepadInputStr = onGamepadInputStr.replace('this.gamepadStates.get(', `this.gamepadStates.get(${gamepadIndexVar},`);
                    eval(`this.onGamepadInput = function ${onGamepadInputStr}`);
                    console.log('[Better xCloud] ✅ Successfully patched local co-op support');
                } else {
                    console.log('[Better xCloud] ❌ Unable to patch local co-op support');
                }
            }

            let patchFuncStr = patchFunc.toString();
            patchFuncStr = patchFuncStr.substring(7, patchFuncStr.length - 1);

            const newCode = `true; ${patchFuncStr}; true,`;

            funcStr = funcStr.replace(text, text + newCode);
            return funcStr;
        },

        forceFortniteConsole: function(funcStr) {
            const text = 'sendTouchInputEnabledMessage(e){';
            if (!funcStr.includes(text)) {
                return false;
            }

            const newCode = `window.location.pathname.includes('/launch/fortnite/') && (e = false);`;

            funcStr = funcStr.replace(text, text + newCode);
            return funcStr;
        },
    };

    static #PATCH_ORDERS = [
        getPref(Preferences.BLOCK_TRACKING) && [
            'disableAiTrack',
            'disableTelemetry',
        ],

        ['disableStreamGate'],

        getPref(Preferences.UI_LAYOUT) === 'tv' && ['tvLayout'],

        ENABLE_XCLOUD_LOGGER && [
            'enableConsoleLogging',
            'enableXcloudLogger',
        ],

        getPref(Preferences.LOCAL_CO_OP_ENABLED) && ['supportLocalCoOp'],

        getPref(Preferences.BLOCK_TRACKING) && [
            'blockWebRtcStatsCollector',
            'disableTrackEvent',
        ],

        getPref(Preferences.REMOTE_PLAY_ENABLED) && [
            'remotePlayDirectConnectUrl',
            'remotePlayKeepAlive',
        ],

        [
            'overrideSettings',
            ENABLE_NATIVE_MKB_BETA && 'mkbIsMouseAndKeyboardTitle',
            HAS_TOUCH_SUPPORT && 'patchUpdateInputConfigurationAsync',
        ],

        getPref(Preferences.GAME_FORTNITE_FORCE_CONSOLE) && ['forceFortniteConsole'],
    ];

    // Only when playing
    static #PLAYING_PATCH_ORDERS = [
        getPref(Preferences.REMOTE_PLAY_ENABLED) && ['remotePlayConnectMode'],

        ['playVibration'],
        getPref(Preferences.STREAM_TOUCH_CONTROLLER) === 'all' && ['exposeTouchLayoutManager'],

        ENABLE_XCLOUD_LOGGER && ['enableConsoleLogging'],

        [
            'disableGamepadDisconnectedScreen',
            ENABLE_NATIVE_MKB_BETA && 'mkbMouseAndKeyboardEnabled',
        ],
    ];

    static #patchFunctionBind() {
        const nativeBind = Function.prototype.bind;
        Function.prototype.bind = function() {
            let valid = false;
            if (this.name.length <= 2 && arguments.length === 2 && arguments[0] === null) {
                if (arguments[1] === 0 || (typeof arguments[1] === 'function')) {
                    valid = true;
                }
            }

            if (!valid) {
                return nativeBind.apply(this, arguments);
            }

            if (typeof arguments[1] === 'function') {
                console.log('[Better xCloud] Restored Function.prototype.bind()');
                Function.prototype.bind = nativeBind;
            }

            const orgFunc = this;
            const newFunc = (a, item) => {
                if (Patcher.length() === 0) {
                    orgFunc(a, item);
                    return;
                }

                Patcher.patch(item);
                orgFunc(a, item);
            }

            return nativeBind.apply(newFunc, arguments);
        };
    }

    static length() { return Patcher.#PATCH_ORDERS.length; };

    static patch(item) {
        // console.log('patch', '-----');
        let patchName;
        let appliedPatches;

        for (let id in item[1]) {
            if (Patcher.#PATCH_ORDERS.length <= 0) {
                return;
            }

            appliedPatches = [];
            const func = item[1][id];
            let funcStr = func.toString();

            for (let groupIndex = 0; groupIndex < Patcher.#PATCH_ORDERS.length; groupIndex++) {
                const group = Patcher.#PATCH_ORDERS[groupIndex];
                let modified = false;

                for (let patchIndex = 0; patchIndex < group.length; patchIndex++) {
                    const patchName = group[patchIndex];
                    if (appliedPatches.indexOf(patchName) > -1) {
                        continue;
                    }

                    const patchedFuncStr = Patcher.#PATCHES[patchName].call(null, funcStr);
                    if (!patchedFuncStr) {
                        // Only stop if the first patch is failed
                        if (patchIndex === 0) {
                            break;
                        } else {
                            continue;
                        }
                    }

                    modified = true;
                    funcStr = patchedFuncStr;

                    console.log(`[Better xCloud] Applied "${patchName}" patch`);
                    appliedPatches.push(patchName);

                    // Remove patch from group
                    group.splice(patchIndex, 1);
                    patchIndex--;
                }

                // Apply patched functions
                if (modified) {
                    item[1][id] = eval(funcStr);
                }

                // Remove empty group
                if (!group.length) {
                    Patcher.#PATCH_ORDERS.splice(groupIndex, 1);
                    groupIndex--;
                }
            }
        }
    }

    // Remove disabled patches
    static #cleanupPatches() {
        for (let groupIndex = Patcher.#PATCH_ORDERS.length - 1; groupIndex >= 0; groupIndex--) {
            const group = Patcher.#PATCH_ORDERS[groupIndex];
            if (group === false) {
                Patcher.#PATCH_ORDERS.splice(groupIndex, 1);
                continue;
            }

            for (let patchIndex = group.length - 1; patchIndex >= 0; patchIndex--) {
                const patchName = group[patchIndex];
                if (!Patcher.#PATCHES[patchName]) {
                    // Remove disabled patch
                    group.splice(patchIndex, 1);
                }
            }

            // Remove empty group
            if (!group.length) {
                Patcher.#PATCH_ORDERS.splice(groupIndex, 1);
            }
        }
    }

    static initialize() {
        if (window.location.pathname.includes('/play/')) {
            Patcher.#PATCH_ORDERS = Patcher.#PATCH_ORDERS.concat(Patcher.#PLAYING_PATCH_ORDERS);
        } else {
            Patcher.#PATCH_ORDERS.push(['loadingEndingChunks']);
        }

        Patcher.#cleanupPatches();
        Patcher.#patchFunctionBind();
    }
}


function checkForUpdate() {
    const CHECK_INTERVAL_SECONDS = 4 * 3600; // check every 4 hours

    const currentVersion = getPref(Preferences.CURRENT_VERSION);
    const lastCheck = getPref(Preferences.LAST_UPDATE_CHECK);
    const now = Math.round((+new Date) / 1000);

    if (currentVersion === SCRIPT_VERSION && now - lastCheck < CHECK_INTERVAL_SECONDS) {
        return;
    }

    // Start checking
    setPref(Preferences.LAST_UPDATE_CHECK, now);
    fetch('https://api.github.com/repos/redphx/better-xcloud/releases/latest')
        .then(response => response.json())
        .then(json => {
            // Store the latest version
            setPref(Preferences.LATEST_VERSION, json.tag_name.substring(1));
            setPref(Preferences.CURRENT_VERSION, SCRIPT_VERSION);
        });
}


class MouseHoldEvent {
    #isHolding = false;
    #timeout;

    #$elm;
    #callback;
    #duration;

    #onMouseDown = function(e) {
        const _this = this;
        this.#isHolding = false;

        this.#timeout && clearTimeout(this.#timeout);
        this.#timeout = setTimeout(() => {
            _this.#isHolding = true;
            _this.#callback();
        }, this.#duration);
    };

    #onMouseUp = e => {
        this.#timeout && clearTimeout(this.#timeout);
        this.#timeout = null;

        if (this.#isHolding) {
            e.preventDefault();
            e.stopPropagation();
        }
        this.#isHolding = false;
    };

    #addEventListeners = () => {
        this.#$elm.addEventListener('mousedown', this.#onMouseDown.bind(this));
        this.#$elm.addEventListener('click', this.#onMouseUp.bind(this));

        this.#$elm.addEventListener('touchstart', this.#onMouseDown.bind(this));
        this.#$elm.addEventListener('touchend', this.#onMouseUp.bind(this));
    }

    #clearEventLiseners = () => {
        this.#$elm.removeEventListener('mousedown', this.#onMouseDown);
        this.#$elm.removeEventListener('click', this.#onMouseUp);

        this.#$elm.removeEventListener('touchstart', this.#onMouseDown);
        this.#$elm.removeEventListener('touchend', this.#onMouseUp);
    }

    constructor($elm, callback, duration=1000) {
        this.#$elm = $elm;
        this.#callback = callback;
        this.#duration = duration;

        this.#addEventListeners();
        $elm.clearMouseHoldEventListeners = this.#clearEventLiseners;
    }
}


function addCss() {
    let css = `
:root {
    --bx-title-font: Bahnschrift, Arial, Helvetica, sans-serif;
    --bx-title-font-semibold: Bahnschrift Semibold, Arial, Helvetica, sans-serif;
    --bx-normal-font: "Segoe UI", Arial, Helvetica, sans-serif;
    --bx-monospaced-font: Consolas, "Courier New", Courier, monospace;
    --bx-promptfont-font: promptfont;

    --bx-button-height: 36px;

    --bx-default-button-color: #2d3036;
    --bx-default-button-hover-color: #515863;
    --bx-default-button-disabled-color: #8e8e8e;

    --bx-primary-button-color: #008746;
    --bx-primary-button-hover-color: #04b358;
    --bx-primary-button-disabled-color: #448262;

    --bx-danger-button-color: #c10404;
    --bx-danger-button-hover-color: #e61d1d;
    --bx-danger-button-disabled-color: #a26c6c;

    --bx-toast-z-index: 9999;
    --bx-dialog-z-index: 9101;
    --bx-dialog-overlay-z-index: 9100;
    --bx-stats-bar-z-index: 9001;
    --bx-stream-settings-z-index: 9000;
    --bx-mkb-pointer-lock-msg-z-index: 8999;
    --bx-screenshot-z-index: 8888;
    --bx-touch-controller-bar-z-index: 5555;
    --bx-wait-time-box-z-index: 100;
}

@font-face {
    font-family: 'promptfont';
    src: url('https://redphx.github.io/better-xcloud/fonts/promptfont.otf');
}

/* Fix Stream menu buttons not hiding */
div[class^=HUDButton-module__hiddenContainer] ~ div:not([class^=HUDButton-module__hiddenContainer]) {
    opacity: 0;
    pointer-events: none !important;
    position: absolute;
    top: -9999px;
    left: -9999px;
}

a.bx-button {
    display: inline-block;
}

.bx-button {
    background-color: var(--bx-default-button-color);
    user-select: none;
    -webkit-user-select: none;
    color: #fff;
    font-family: var(--bx-title-font-semibold);
    font-size: 14px;
    border: none;
    font-weight: 400;
    height: var(--bx-button-height);
    border-radius: 4px;
    padding: 0 8px;
    text-transform: uppercase;
    cursor: pointer;
    overflow: hidden;
}

.bx-button:focus {
    outline: none !important;
}

.bx-button:hover, .bx-button.bx-focusable:focus {
    background-color: var(--bx-default-button-hover-color);
}

.bx-button:disabled {
    cursor: default;
    background-color: var(--bx-default-button-disabled-color);
}

.bx-button.bx-ghost {
    background-color: transparent;
}

.bx-button.bx-ghost:hover, .bx-button.bx-ghost.bx-focusable:focus {
    background-color: var(--bx-default-button-hover-color);
}

.bx-button.bx-primary {
    background-color: var(--bx-primary-button-color);
}

.bx-button.bx-primary:hover, .bx-button.bx-primary.bx-focusable:focus {
    background-color: var(--bx-primary-button-hover-color);
}

.bx-button.bx-primary:disabled {
    background-color: var(--bx-primary-button-disabled-color);
}

.bx-button.bx-danger {
    background-color: var(--bx-danger-button-color);
}

.bx-button.bx-danger:hover, .bx-button.bx-danger.bx-focusable:focus {
    background-color: var(--bx-danger-button-hover-color);
}

.bx-button.bx-danger:disabled {
    background-color: var(--bx-danger-button-disabled-color);
}

.bx-button svg {
    display: inline-block;
    width: 16px;
    height: var(--bx-button-height);
}

.bx-button svg:not(:only-child) {
    margin-right: 4px;
}

.bx-button span {
    display: inline-block;
    height: calc(var(--bx-button-height) - 2px);
    line-height: var(--bx-button-height);
    vertical-align: middle;
    color: #fff;
    overflow: hidden;
    white-space: nowrap;
}

.bx-remote-play-button {
    height: auto;
    margin-right: 8px !important;
}

.bx-remote-play-button svg {
    width: 28px;
    height: 46px;
}

.bx-settings-button {
    line-height: 30px;
    font-size: 14px;
    text-transform: none;
}

.bx-settings-button[data-update-available]::after {
    content: ' 🌟';
}

.bx-remote-play-button, .bx-settings-button {
    position: relative;
}

.bx-remote-play-button::after, .bx-settings-button::after {
    border: 2px solid transparent;
    border-radius: 4px;
}

.bx-remote-play-button:focus::after, .bx-settings-button:focus::after {
    content: '';
    border-color: white;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
}

.better_xcloud_settings {
    background-color: #151515;
    user-select: none;
    -webkit-user-select: none;
    color: #fff;
    font-family: var(--bx-normal-font);
}

.bx-full-width {
    width: 100% !important;
}

.bx-full-height {
    height: 100% !important;
}

.bx-no-scroll {
    overflow: hidden !important;
}

.bx-gone {
    display: none !important;
}

.bx-offscreen {
    position: absolute !important;
    top: -9999px !important;
    left: -9999px !important;
    visibility: hidden !important;
}

.bx-hidden {
    visibility: hidden !important;
}

.bx-no-margin {
    margin: 0 !important;
}

.bx-no-padding {
    padding: 0 !important;
}

.bx-settings-wrapper {
    width: 450px;
    margin: auto;
    padding: 12px 6px;
}

@media screen and (max-width: 450px) {
    .bx-settings-wrapper {
        width: 100%;
    }
}

.bx-settings-wrapper *:focus {
    outline: none !important;
}

.bx-settings-wrapper .bx-settings-title-wrapper {
    display: flex;
    margin-bottom: 10px;
    align-items: center;
}

.bx-settings-wrapper a.bx-settings-title {
    font-family: var(--bx-title-font);
    font-size: 1.4rem;
    text-decoration: none;
    font-weight: bold;
    display: block;
    color: #5dc21e;
    flex: 1;
}

.bx-settings-group-label {
    font-weight: bold;
    display: block;
    font-size: 1.1rem;
}

@media (hover: hover) {
    .bx-settings-wrapper a.bx-settings-title:hover {
        color: #83f73a;
    }
}

.bx-settings-wrapper a.bx-settings-title:focus {
    color: #83f73a;
}

.bx-settings-wrapper a.bx-settings-update {
    display: block;
    color: #ff834b;
    text-decoration: none;
    margin-bottom: px;
    text-align: center;
    background: #222;
    border-radius: 4px;
    padding: 4px;
}

@media (hover: hover) {
    .bx-settings-wrapper a.bx-settings-update:hover {
        color: #ff9869;
        text-decoration: underline;
    }
}

.bx-settings-wrapper a.bx-settings-update:focus {
    color: #ff9869;
    text-decoration: underline;
}

.bx-settings-row {
    display: flex;
    margin-bottom: 8px;
    padding: 2px 4px;
}

.bx-settings-row label {
    flex: 1;
    align-self: center;
    margin-bottom: 0;
    padding-left: 10px;
}

.bx-settings-group-label b, .bx-settings-row label b {
    display: block;
    font-size: 12px;
    font-style: italic;
    font-weight: normal;
    color: #828282;
}

@media not (hover: hover) {
    .bx-settings-row:focus-within {
       background-color: #242424;
    }
}

.bx-settings-row input {
    align-self: center;
}

.bx-settings-wrapper .bx-button.bx-primary {
    margin-top: 8px;
}

.bx-settings-app-version {
    margin-top: 10px;
    text-align: center;
    color: #747474;
    font-size: 12px;
}

.bx-donation-link {
    display: block;
    text-align: center;
    text-decoration: none;
    height: 20px;
    line-height: 20px;
    font-size: 14px;
    margin-top: 10px;
    color: #5dc21e;
}

.bx-donation-link:hover {
    color: #6dd72b;
}

.bx-settings-custom-user-agent {
    display: block;
    width: 100%;
}

div[class*=StreamMenu-module__menuContainer] > div[class*=Menu-module] {
    overflow: visible;
}

.bx-badges {
    position: absolute;
    margin-left: 0px;
    user-select: none;
    -webkit-user-select: none;
}

.bx-badge {
    border: none;
    display: inline-block;
    line-height: 24px;
    color: #fff;
    font-family: var(--bx-title-font-semibold);
    font-size: 14px;
    font-weight: 400;
    margin: 0 8px 8px 0;
    box-shadow: 0px 0px 6px #000;
    border-radius: 4px;
}

.bx-badge-name {
    background-color: #2d3036;
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px 0 0 4px;
    text-transform: uppercase;
}

.bx-badge-value {
    background-color: grey;
    display: inline-block;
    padding: 2px 8px;
    border-radius: 0 4px 4px 0;
}

.bx-badge-battery[data-charging=true] span:first-of-type::after {
    content: ' ⚡️';
}

.bx-screenshot-button {
    display: none;
    opacity: 0;
    position: fixed;
    bottom: 0;
    box-sizing: border-box;
    width: 16vh;
    height: 16vh;
    max-width: 128px;
    max-height: 128px;
    padding: 2vh;
    padding: 24px 24px 12px 12px;
    background-size: cover;
    background-repeat: no-repeat;
    background-origin: content-box;
    filter: drop-shadow(0 0 2px #000000B0);
    transition: opacity 0.1s ease-in-out 0s, padding 0.1s ease-in 0s;
    z-index: var(--bx-screenshot-z-index);

    /* Credit: https://phosphoricons.com */
    background-image: url(${Icon.SCREENSHOT_B64});
}

.bx-screenshot-button[data-showing=true] {
    opacity: 0.9;
}

.bx-screenshot-button[data-capturing=true] {
    padding: 1vh;
}

.bx-screenshot-canvas {
    display: none;
}

.bx-stats-bar {
    display: block;
    user-select: none;
    -webkit-user-select: none;
    position: fixed;
    top: 0;
    background-color: #000;
    color: #fff;
    font-family: var(--bx-monospaced-font);
    font-size: 0.9rem;
    padding-left: 8px;
    z-index: var(--bx-stats-bar-z-index);
    text-wrap: nowrap;
}

.bx-stats-bar > div {
    display: none;
    margin-right: 8px;
    border-right: 1px solid #fff;
    padding-right: 8px;
}

.bx-stats-bar[data-stats*="[fps]"] > .bx-stat-fps,
.bx-stats-bar[data-stats*="[ping]"] > .bx-stat-ping,
.bx-stats-bar[data-stats*="[btr]"] > .bx-stat-btr,
.bx-stats-bar[data-stats*="[dt]"] > .bx-stat-dt,
.bx-stats-bar[data-stats*="[pl]"] > .bx-stat-pl,
.bx-stats-bar[data-stats*="[fl]"] > .bx-stat-fl {
    display: inline-block;
}

.bx-stats-bar[data-stats$="[fps]"] > .bx-stat-fps,
.bx-stats-bar[data-stats$="[ping]"] > .bx-stat-ping,
.bx-stats-bar[data-stats$="[btr]"] > .bx-stat-btr,
.bx-stats-bar[data-stats$="[dt]"] > .bx-stat-dt,
.bx-stats-bar[data-stats$="[pl]"] > .bx-stat-pl,
.bx-stats-bar[data-stats$="[fl]"] > .bx-stat-fl {
    margin-right: 0;
    border-right: none;
}

.bx-stats-bar[data-display=glancing]::before {
    content: '👀 ';
    vertical-align: middle;
}

.bx-stats-bar[data-position=top-left] {
    left: 0;
    border-radius: 0 0 4px 0;
}

.bx-stats-bar[data-position=top-right] {
    right: 0;
    border-radius: 0 0 0 4px;
}

.bx-stats-bar[data-position=top-center] {
    transform: translate(-50%, 0);
    left: 50%;
    border-radius: 0 0 4px 4px;
}

.bx-stats-bar[data-transparent=true] {
    background: none;
    filter: drop-shadow(1px 0 0 #000000f0) drop-shadow(-1px 0 0 #000000f0) drop-shadow(0 1px 0 #000000f0) drop-shadow(0 -1px 0 #000000f0);
}

.bx-stats-bar label {
    margin: 0 8px 0 0;
    font-family: var(--bx-title-font);
    font-size: inherit;
    font-weight: bold;
    vertical-align: middle;
    cursor: help;
}

.bx-stats-bar span {
    min-width: 60px;
    display: inline-block;
    text-align: right;
    vertical-align: middle;
}

.bx-stats-bar span[data-grade=good] {
    color: #6bffff;
}

.bx-stats-bar span[data-grade=ok] {
    color: #fff16b;
}

.bx-stats-bar span[data-grade=bad] {
    color: #ff5f5f;
}

.bx-stats-bar span:first-of-type {
    min-width: 22px;
}

.bx-dialog-overlay {
    position: fixed;
    inset: 0;
    z-index: var(--bx-dialog-overlay-z-index);
    background: black;
    opacity: 50%;
}

.bx-dialog {
    display: flex;
    flex-flow: column;
    max-height: 90vh;
    position: fixed;
    top: 50%;
    left: 50%;
    margin-right: -50%;
    transform: translate(-50%, -50%);
    min-width: 420px;
    padding: 20px;
    border-radius: 8px;
    z-index: var(--bx-dialog-z-index);
    background: #1a1b1e;
    color: #fff;
    font-weight: 400;
    font-size: 16px;
    font-family: var(--bx-normal-font);
    box-shadow: 0 0 6px #000;
    user-select: none;
    -webkit-user-select: none;
}

.bx-dialog *:focus {
    outline: none !important;
}

@media screen and (max-width: 450px) {
    .bx-dialog {
        min-width: 100%;
    }
}

.bx-dialog h2 {
    display: flex;
    margin-bottom: 12px;
}

.bx-dialog h2 b {
    flex: 1;
    color: #fff;
    display: block;
    font-family: var(--bx-title-font);
    font-size: 26px;
    font-weight: 400;
    line-height: var(--bx-button-height);
}

.bx-dialog.bx-binding-dialog h2 b {
    font-family: var(--bx-promptfont-font) !important;
}

.bx-dialog > div {
    overflow: auto;
    padding: 2px 0;
}

.bx-dialog > button {
    padding: 8px 32px;
    margin: 10px auto 0;
    border: none;
    border-radius: 4px;
    display: block;
    background-color: #2d3036;
    text-align: center;
    color: white;
    text-transform: uppercase;
    font-family: var(--bx-title-font);
    font-weight: 400;
    line-height: 18px;
    font-size: 14px;
}

@media (hover: hover) {
    .bx-dialog > button:hover {
        background-color: #515863;
    }
}

.bx-dialog > button:focus {
    background-color: #515863;
}

.bx-stats-settings-dialog > div > div {
    display: flex;
    margin-bottom: 8px;
    padding: 2px 4px;
}

.bx-stats-settings-dialog label {
    flex: 1;
    margin-bottom: 0;
    align-self: center;
}

.bx-quick-settings-bar {
    display: flex;
    position: fixed;
    z-index: var(--bx-stream-settings-z-index);
    opacity: 0.98;
    user-select: none;
    -webkit-user-select: none;
}

.bx-quick-settings-tabs {
    position: fixed;
    top: 0;
    right: 420px;
    display: flex;
    flex-direction: column;
    border-radius: 0 0 0 8px;
    box-shadow: 0px 0px 6px #000;
    overflow: clip;
}

.bx-quick-settings-tabs svg {
    width: 32px;
    height: 32px;
    padding: 10px;
    box-sizing: content-box;
    background: #131313;
    cursor: pointer;
    border-left: 4px solid #1e1e1e;
}

.bx-quick-settings-tabs svg.bx-active {
    background: #222;
    border-color: #008746;
}

.bx-quick-settings-tabs svg:not(.bx-active):hover {
    background: #2f2f2f;
    border-color: #484848;
}

.bx-quick-settings-tab-contents {
    flex-direction: column;
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    padding: 14px 14px 0;
    width: 420px;
    background: #1a1b1e;
    color: #fff;
    font-weight: 400;
    font-size: 16px;
    font-family: var(--bx-title-font);
    text-align: center;
    box-shadow: 0px 0px 6px #000;
    overflow: overlay;
}

.bx-quick-settings-tab-contents > div[data-group=mkb] {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}

.bx-quick-settings-bar:not([data-clarity-boost="true"]) .bx-clarity-boost-warning {
    display: none;
}

.bx-quick-settings-bar[data-clarity-boost="true"] .bx-clarity-boost-warning {
    display: block;
    margin: 0px 8px;
    padding: 12px;
    font-size: 16px;
    font-weight: normal;
    background: #282828;
    border-radius: 4px;
}

.bx-quick-settings-bar[data-clarity-boost="true"] div[data-type="video"] {
    display: none;
}

.bx-quick-settings-tab-contents *:focus {
    outline: none !important;
}

.bx-quick-settings-row {
    display: flex;
    border-bottom: 1px solid #40404080;
    margin-bottom: 16px;
    padding-bottom: 16px;
}

.bx-quick-settings-row label {
    font-size: 16px;
    display: block;
    text-align: left;
    flex: 1;
    align-self: center;
    margin-bottom: 0 !important;
}

.bx-quick-settings-tab-contents h2 {
    margin-bottom: 8px;
    display: flex;
    align-item: center;
}

.bx-quick-settings-tab-contents h2 span {
    display: inline-block;
    font-size: 24px;
    font-weight: bold;
    text-transform: uppercase;
    text-align: left;
    flex: 1;
    height: var(--bx-button-height);
    line-height: calc(var(--bx-button-height) + 4px);
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
}

.bx-quick-settings-tab-contents input[type="range"] {
    display: block;
    margin: 12px auto 2px;
    width: 180px;
    color: #959595 !important;
}

.bx-quick-settings-bar-note {
    display: block;
    text-align: center;
    font-size: 12px;
    font-weight: lighter;
    font-style: italic;
    padding-top: 16px;
}

.bx-toast {
    user-select: none;
    -webkit-user-select: none;
    position: fixed;
    left: 50%;
    top: 24px;
    transform: translate(-50%, 0);
    background: #000000;
    border-radius: 16px;
    color: white;
    z-index: var(--bx-toast-z-index);
    font-family: var(--bx-normal-font);
    border: 2px solid #fff;
    display: flex;
    align-items: center;
    opacity: 0;
    overflow: clip;
    transition: opacity 0.2s ease-in;
}

.bx-toast.bx-show {
    opacity: 0.85;
}

.bx-toast.bx-hide {
    opacity: 0;
}

.bx-toast-msg {
    font-size: 14px;
    display: inline-block;
    padding: 12px 16px;
    white-space: pre;
}

.bx-toast-status {
    font-weight: bold;
    font-size: 14px;
    text-transform: uppercase;
    display: inline-block;
    background: #515863;
    padding: 12px 16px;
    color: #fff;
    white-space: pre;
}

.bx-number-stepper span {
    display: inline-block;
    width: 40px;
    font-family: var(--bx-monospaced-font);
    font-size: 14px;
}

.bx-number-stepper button {
    border: none;
    width: 24px;
    height: 24px;
    margin: 0 4px;
    line-height: 24px;
    background-color: var(--bx-default-button-color);
    color: #fff;
    border-radius: 4px;
    font-weight: bold;
    font-size: 14px;
    font-family: var(--bx-monospaced-font);
    color: #fff;
}

@media (hover: hover) {
    .bx-number-stepper button:hover {
        background-color: var(--bx-default-button-hover-color);
    }
}

.bx-number-stepper button:active {
    background-color: var(--bx-default-button-hover-color);
}

.bx-number-stepper input[type=range]:disabled, .bx-number-stepper button:disabled {
    display: none;
}

.bx-number-stepper button:disabled + span {
    font-family: var(--bx-title-font);
}

.bx-mkb-settings {
    display: flex;
    flex-direction: column;
    flex: 1;
    padding-bottom: 10px;
    overflow: hidden;
}

.bx-mkb-settings select:disabled {
    background: transparent;
    border: none;
    color: #fff;
}

.bx-quick-settings-row select:disabled {
    text-align: right;
}

.bx-mkb-pointer-lock-msg {
    display: flex;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
    margin: auto;
    background: #000000e5;
    z-index: var(--bx-mkb-pointer-lock-msg-z-index);
    color: #fff;
    text-align: center;
    font-weight: 400;
    font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    font-size: 1.3rem;
    padding: 12px;
    border-radius: 8px;
    align-items: center;
    box-shadow: 0 0 6px #000;
}

.bx-mkb-pointer-lock-msg:hover {
    background: #151515;
}

.bx-mkb-pointer-lock-msg button {
    margin-right: 12px;
    height: 60px;
}

.bx-mkb-pointer-lock-msg svg {
    width: 32px;
}

.bx-mkb-pointer-lock-msg div {
    display: flex;
    flex-direction: column;
    text-align: left;
}

.bx-mkb-pointer-lock-msg p {
    margin: 0;
}

.bx-mkb-pointer-lock-msg p:first-child {
    font-size: 22px;
    margin-bottom: 8px;
}

.bx-mkb-pointer-lock-msg p:last-child {
    font-size: 14px;
    font-style: italic;
}

.bx-mkb-preset-tools {
    display: flex;
    margin-bottom: 12px;
}

.bx-mkb-preset-tools select {
    flex: 1;
}

.bx-mkb-preset-tools button {
    margin-left: 6px;
}

.bx-mkb-settings-rows {
    flex: 1;
    overflow: scroll;
}

.bx-mkb-key-row {
    display: flex;
    margin-bottom: 10px;
    align-items: center;
}

.bx-mkb-key-row label {
    margin-bottom: 0;
    font-family: var(--bx-promptfont-font);
    font-size: 26px;
    text-align: center;
    width: 26px;
    height: 32px;
    line-height: 32px;
}

.bx-mkb-key-row button {
    flex: 1;
    height: 32px;
    line-height: 32px;
    margin: 0 0 0 10px;
    background: transparent;
    border: none;
    color: white;
    border-radius: 0;
    border-left: 1px solid #373737;
}

.bx-mkb-key-row button:hover {
    background: transparent;
    cursor: default;
}

.bx-mkb-settings.bx-editing .bx-mkb-key-row button {
    background: #393939;
    border-radius: 4px;
    border: none;
}

.bx-mkb-settings.bx-editing .bx-mkb-key-row button:hover {
    background: #333;
    cursor: pointer;
}

.bx-mkb-action-buttons > div {
    text-align: right;
    display: none;
}

.bx-mkb-action-buttons button {
    margin-left: 8px;
}

.bx-mkb-settings:not(.bx-editing) .bx-mkb-action-buttons > div:first-child {
    display: block;
}

.bx-mkb-settings.bx-editing .bx-mkb-action-buttons > div:last-child {
    display: block;
}

.bx-mkb-note {
    display: block;
    margin: 16px 0 10px;
    font-size: 12px;
}

.bx-mkb-note:first-of-type {
    margin-top: 0;
}


.bx-stream-menu-button-on {
    fill: #000 !important;
    background-color: #2d2d2d !important;
    color: #000 !important;
}

#bx-touch-controller-bar {
    display: none;
    opacity: 0;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 6vh;
    z-index: var(--bx-touch-controller-bar-z-index);
}

#bx-touch-controller-bar[data-showing=true] {
    display: block !important;
}

.bx-wait-time-box {
    position: fixed;
    top: 0;
    right: 0;
    background-color: #000000cc;
    color: #fff;
    z-index: var(--bx-wait-time-box-z-index);
    padding: 12px;
    border-radius: 0 0 0 8px;
}

.bx-wait-time-box label {
    display: block;
    text-transform: uppercase;
    text-align: right;
    font-size: 12px;
    font-weight: bold;
    margin: 0;
}

.bx-wait-time-box span {
    display: block;
    font-family: var(--bx-monospaced-font);
    text-align: right;
    font-size: 16px;
    margin-bottom: 10px;
}

.bx-wait-time-box span:last-of-type {
    margin-bottom: 0;
}

/* REMOTE PLAY */

.bx-container {
    width: 480px;
    margin: 0 auto;
}

#bxUi {
    margin-top: 14px;
}

.bx-remote-play-settings {
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #2d2d2d;
}

.bx-remote-play-settings > div {
    display: flex;
}

.bx-remote-play-settings label {
    flex: 1;
}

.bx-remote-play-settings label p {
    margin: 4px 0 0;
    padding: 0;
    color: #888;
    font-size: 12px;
}

.bx-remote-play-settings input {
    display: block;
    margin: 0 auto;
}

.bx-remote-play-settings span {
    font-weight: bold;
    font-size: 18px;
    display: block;
    margin-bottom: 8px;
    text-align: center;
}

.bx-remote-play-device-wrapper {
    display: flex;
    margin-bottom: 12px;
}

.bx-remote-play-device-wrapper:last-child {
  margin-bottom: 2px;
}

.bx-remote-play-device-info {
    flex: 1;
    padding: 4px 0;
}

.bx-remote-play-device-name {
    font-size: 20px;
    font-weight: bold;
    display: inline-block;
    vertical-align: middle;
}

.bx-remote-play-console-type {
    font-size: 12px;
    background: #004c87;
    color: #fff;
    display: inline-block;
    border-radius: 14px;
    padding: 2px 10px;
    margin-left: 8px;
    vertical-align: middle;
}

.bx-remote-play-power-state {
    color: #888;
    font-size: 14px;
}

.bx-remote-play-connect-button {
    min-height: 100%;
    margin: 4px 0;
}

/* ----------- */

/* Hide UI elements */
#headerArea, #uhfSkipToMain, .uhf-footer {
    display: none;
}

div[class*=NotFocusedDialog] {
    position: absolute !important;
    top: -9999px !important;
    left: -9999px !important;
    width: 0px !important;
    height: 0px !important;
}

#game-stream video:not([src]) {
    visibility: hidden;
}
`;

    // Hide "Play with friends" section
    if (getPref(Preferences.BLOCK_SOCIAL_FEATURES)) {
        css += `
div[class^=HomePage-module__bottomSpacing]:has(button[class*=SocialEmptyCard]),
button[class*=SocialEmptyCard] {
    display: none;
}
`;
    }

    // Reduce animations
    if (getPref(Preferences.REDUCE_ANIMATIONS)) {
        css += `
div[class*=GameCard-module__gameTitleInnerWrapper],
div[class*=GameCard-module__card],
div[class*=ScrollArrows-module] {
    transition: none !important;
}
`;
    }

    // Hide the top-left dots icon while playing
    if (getPref(Preferences.HIDE_DOTS_ICON)) {
        css += `
div[class*=Grip-module__container] {
    visibility: hidden;
}

@media (hover: hover) {
    button[class*=GripHandle-module__container]:hover div[class*=Grip-module__container] {
        visibility: visible;
    }
}

button[class*=GripHandle-module__container][aria-expanded=true] div[class*=Grip-module__container] {
    visibility: visible;
}

button[class*=GripHandle-module__container][aria-expanded=false] {
    background-color: transparent !important;
}

div[class*=StreamHUD-module__buttonsContainer] {
    padding: 0px !important;
}
`;
    }

    // Hide touch controller
    if (getPref(Preferences.STREAM_TOUCH_CONTROLLER) === 'off') {
        css += `
#MultiTouchSurface, #BabylonCanvasContainer-main {
    display: none !important;
}
`;
    }

    // Simplify Stream's menu
    css += `
div[class*=StreamMenu-module__menu] {
    min-width: 100vw !important;
}
`;
    if (getPref(Preferences.STREAM_SIMPLIFY_MENU)) {
        css += `
div[class*=Menu-module__scrollable] {
    --bxStreamMenuItemSize: 80px;
    --streamMenuItemSize: calc(var(--bxStreamMenuItemSize) + 40px) !important;
}

.bx-badges {
    top: calc(var(--streamMenuItemSize) - 20px);
}

body[data-media-type=tv] .bx-badges {
    top: calc(var(--streamMenuItemSize) - 10px) !important;
}

button[class*=MenuItem-module__container] {
    min-width: auto !important;
    min-height: auto !important;
    width: var(--bxStreamMenuItemSize) !important;
    height: var(--bxStreamMenuItemSize) !important;
}

div[class*=MenuItem-module__label] {
    display: none !important;
}

svg[class*=MenuItem-module__icon] {
    width: 36px;
    height: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
}
`;
    } else {
        css += `
body[data-media-type=tv] .bx-badges {
    top: calc(var(--streamMenuItemSize) + 30px);
}

body:not([data-media-type=tv]) .bx-badges {
    top: calc(var(--streamMenuItemSize) + 20px);
}

body:not([data-media-type=tv]) button[class*=MenuItem-module__container] {
    min-width: auto !important;
    width: 100px !important;
}

body:not([data-media-type=tv]) button[class*=MenuItem-module__container]:nth-child(n+2) {
    margin-left: 10px !important;
}

body:not([data-media-type=tv]) div[class*=MenuItem-module__label] {
    margin-left: 8px !important;
    margin-right: 8px !important;
}
`;
    }

    const $style = createElement('style', {}, css);
    document.documentElement.appendChild($style);
}


function getPreferredServerRegion() {
    let preferredRegion = getPref(Preferences.SERVER_REGION);
    if (preferredRegion in SERVER_REGIONS) {
        return preferredRegion;
    }

    for (let regionName in SERVER_REGIONS) {
        const region = SERVER_REGIONS[regionName];
        if (region.isDefault) {
            return regionName;
        }
    }

    return '???';
}


function updateIceCandidates(candidates, options) {
    const pattern = new RegExp(/a=candidate:(?<foundation>\d+) (?<component>\d+) UDP (?<priority>\d+) (?<ip>[^\s]+) (?<port>\d+) (?<the_rest>.*)/);

    const lst = [];
    for (let item of candidates) {
        if (item.candidate == 'a=end-of-candidates') {
            continue;
        }

        const groups = pattern.exec(item.candidate).groups;
        lst.push(groups);
    }

    if (options.preferIpv6Server) {
        lst.sort((a, b) => (!a.ip.includes(':') && b.ip.includes(':')) ? 1 : -1);
    }

    const newCandidates = [];
    let foundation = 1;

    const newCandidate = candidate => {
        return {
            'candidate': candidate,
            'messageType': 'iceCandidate',
            'sdpMLineIndex': '0',
            'sdpMid': '0',
        };
    };

    lst.forEach(item => {
        item.foundation = foundation;
        item.priority = (foundation == 1) ? 10000 : 1;

        newCandidates.push(newCandidate(`a=candidate:${item.foundation} 1 UDP ${item.priority} ${item.ip} ${item.port} ${item.the_rest}`));
        ++foundation;
    });

    if (options.consoleAddrs) {
        for (const ip in options.consoleAddrs) {
            const port = options.consoleAddrs[ip];

            newCandidates.push(newCandidate(`a=candidate:${newCandidates.length + 1} 1 UDP 1 ${ip} ${port} typ host`));
        }
    }

    newCandidates.push(newCandidate('a=end-of-candidates'));

    console.log(newCandidates);
    return newCandidates;
}


function clearDbLogs(dbName, table) {
    const request = window.indexedDB.open(dbName);
    request.onsuccess = e => {
        const db = e.target.result;

        try {
            const objectStore = db.transaction(table, 'readwrite').objectStore(table);
            const objectStoreRequest = objectStore.clear();

            objectStoreRequest.onsuccess = function(event) {
                console.log(`[Better xCloud] Cleared ${dbName}.${table}`);
            };
        } catch (e) {}
    }
}

function clearApplicationInsightsBuffers() {
    window.sessionStorage.removeItem('AI_buffer');
    window.sessionStorage.removeItem('AI_sentBuffer');
}


function clearAllLogs() {
    clearApplicationInsightsBuffers();
    clearDbLogs('StreamClientLogHandler', 'logs');
    clearDbLogs('XCloudAppLogs', 'logs');
}


function interceptHttpRequests() {
    let BLOCKED_URLS = [];
    if (getPref(Preferences.BLOCK_TRACKING)) {
        // Clear Applications Insight buffers
        clearAllLogs();

        BLOCKED_URLS = BLOCKED_URLS.concat([
            'https://arc.msn.com',
            'https://browser.events.data.microsoft.com',
            'https://dc.services.visualstudio.com',
            // 'https://2c06dea3f26c40c69b8456d319791fd0@o427368.ingest.sentry.io',
        ]);
    }

    if (getPref(Preferences.BLOCK_SOCIAL_FEATURES)) {
        BLOCKED_URLS = BLOCKED_URLS.concat([
            'https://peoplehub.xboxlive.com/users/me/people/social',
            'https://peoplehub.xboxlive.com/users/me/people/recommendations',
            'https://notificationinbox.xboxlive.com',
            // 'https://accounts.xboxlive.com/family/memberXuid',
        ]);
    }

    const xhrPrototype = XMLHttpRequest.prototype;
    const nativeXhrOpen = xhrPrototype.open;
    const nativeXhrSend = xhrPrototype.send;

    xhrPrototype.open = function(method, url) {
        // Save URL to use it later in send()
        this._url = url;
        return nativeXhrOpen.apply(this, arguments);
    };

    xhrPrototype.send = function(...arg) {
        for (const blocked of BLOCKED_URLS) {
            if (this._url.startsWith(blocked)) {
                if (blocked === 'https://dc.services.visualstudio.com') {
                    setTimeout(clearAllLogs, 1000);
                }
                return false;
            }
        }

        return nativeXhrSend.apply(this, arguments);
    };

    const PREF_PREFER_IPV6_SERVER = getPref(Preferences.PREFER_IPV6_SERVER);
    const PREF_STREAM_TARGET_RESOLUTION = getPref(Preferences.STREAM_TARGET_RESOLUTION);
    const PREF_STREAM_PREFERRED_LOCALE = getPref(Preferences.STREAM_PREFERRED_LOCALE);
    const PREF_UI_LOADING_SCREEN_GAME_ART = getPref(Preferences.UI_LOADING_SCREEN_GAME_ART);
    const PREF_UI_LOADING_SCREEN_WAIT_TIME = getPref(Preferences.UI_LOADING_SCREEN_WAIT_TIME);

    const PREF_STREAM_TOUCH_CONTROLLER = getPref(Preferences.STREAM_TOUCH_CONTROLLER);
    const PREF_AUDIO_MIC_ON_PLAYING = getPref(Preferences.AUDIO_MIC_ON_PLAYING);

    const consoleAddrs = {};

    const patchIceCandidates = function(...arg) {
        // ICE server candidates
        const request = arg[0];
        const url = (typeof request === 'string') ? request : request.url;

        if (url && url.endsWith('/ice') && url.includes('/sessions/') && request.method === 'GET') {
            const promise = NATIVE_FETCH(...arg);

            return promise.then(response => {
                return response.clone().text().then(text => {
                    if (!text.length) {
                        return response;
                    }

                    const options = {
                        preferIpv6Server: PREF_PREFER_IPV6_SERVER,
                        consoleAddrs: consoleAddrs,
                    };

                    const obj = JSON.parse(text);
                    let exchangeResponse = JSON.parse(obj.exchangeResponse);
                    exchangeResponse = updateIceCandidates(exchangeResponse, options)
                    obj.exchangeResponse = JSON.stringify(exchangeResponse);

                    response.json = () => Promise.resolve(obj);
                    response.text = () => Promise.resolve(JSON.stringify(obj));

                    return response;
                });
            });
        }

        return null;
    }

    window.fetch = async (...arg) => {
        let request = arg[0];
        let url = (typeof request === 'string') ? request : request.url;

        for (let blocked of BLOCKED_URLS) {
            if (!url.startsWith(blocked)) {
                continue;
            }

            return new Response('{"acc":1,"webResult":{}}', {
                status: 200,
                statusText: '200 OK',
            });
        }

        if (url.endsWith('/play')) {
            BxEvent.dispatch(window, BxEvent.STREAM_LOADING);
        }

        if (url.endsWith('/configuration')) {
            BxEvent.dispatch(window, BxEvent.STREAM_STARTING);
        }

        if (IS_REMOTE_PLAYING && (url.includes('/sessions/home') || url.includes('inputconfigs'))) {
            TouchController.disable();

            const clone = request.clone();

            const headers = {};
            for (const pair of clone.headers.entries()) {
                headers[pair[0]] = pair[1];
            }
            headers.authorization = `Bearer ${RemotePlay.XHOME_TOKEN}`;

            const deviceInfo = RemotePlay.BASE_DEVICE_INFO;
            if (getPref(Preferences.REMOTE_PLAY_RESOLUTION) === '720p') {
                deviceInfo.dev.os.name = 'android';
            }

            headers['x-ms-device-info'] = JSON.stringify(deviceInfo);

            const opts = {
                method: clone.method,
                headers: headers,
            };

            if (clone.method === 'POST') {
                opts.body = await clone.text();
            }

            const index = request.url.indexOf('.xboxlive.com');
            let newUrl = `https://${REMOTE_PLAY_SERVER}.gssv-play-prodxhome` + request.url.substring(index);

            request = new Request(newUrl, opts);

            arg[0] = request;
            url = (typeof request === 'string') ? request : request.url;

            // Get console IP
            if (url.includes('/configuration')) {
                const promise = NATIVE_FETCH(...arg);

                return promise.then(response => {
                    return response.clone().json().then(obj => {
                        console.log(obj);

                        const serverDetails = obj.serverDetails;
                        if (serverDetails.ipV4Address) {
                            consoleAddrs[serverDetails.ipV4Address] = serverDetails.ipV4Port;
                        }

                        if (serverDetails.ipV6Address) {
                            consoleAddrs[serverDetails.ipV6Address] = serverDetails.ipV6Port;
                        }

                        response.json = () => Promise.resolve(obj);
                        response.text = () => Promise.resolve(JSON.stringify(obj));

                        return response;
                    });
                });
            } else if (PREF_STREAM_TOUCH_CONTROLLER === 'all' && url.includes('inputconfigs')) {
                const promise = NATIVE_FETCH(...arg);

                return promise.then(response => {
                    return response.clone().json().then(obj => {
                        const xboxTitleId = JSON.parse(opts.body).titleIds[0];
                        GAME_XBOX_TITLE_ID = xboxTitleId;

                        const inputConfigs = obj[0];

                        let hasTouchSupport = inputConfigs.supportedTabs.length > 0;
                        if (!hasTouchSupport) {
                            const supportedInputTypes = inputConfigs.supportedInputTypes;
                            hasTouchSupport = supportedInputTypes.includes('NativeTouch');
                        }

                        if (hasTouchSupport) {
                            TouchController.disable();

                            BxEvent.dispatch(window, BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED, {
                                    data: null,
                                });
                        } else {
                            TouchController.enable();
                            TouchController.getCustomLayouts(xboxTitleId);
                        }

                        response.json = () => Promise.resolve(obj);
                        response.text = () => Promise.resolve(JSON.stringify(obj));

                        return response;
                    });
                });
            }

            return patchIceCandidates(...arg) || NATIVE_FETCH(...arg);
        }

        if (IS_REMOTE_PLAYING && url.includes('/login/user')) {
            try {
                const clone = request.clone();

                const obj = await clone.json();
                obj.offeringId = 'xhome';

                request = new Request('https://xhome.gssv-play-prod.xboxlive.com/v2/login/user', {
                    method: 'POST',
                    body: JSON.stringify(obj),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                arg[0] = request;
            } catch (e) {
                alert(e);
                console.log(e);
            }

            return NATIVE_FETCH(...arg);
        }

        if (IS_REMOTE_PLAYING && url.includes('/titles')) {
            const clone = request.clone();

            const headers = {};
            for (const pair of clone.headers.entries()) {
                headers[pair[0]] = pair[1];
            }
            headers.authorization = `Bearer ${RemotePlay.XCLOUD_TOKEN}`;

            const index = request.url.indexOf('.xboxlive.com');
            request = new Request('https://wus.core.gssv-play-prod' + request.url.substring(index), {
                method: clone.method,
                body: await clone.text(),
                headers: headers,
            });

            arg[0] = request;
            return NATIVE_FETCH(...arg);
        }

        // ICE server candidates
        const patchedIpv6 = patchIceCandidates(...arg);
        if (patchedIpv6) {
            return patchedIpv6;
        }

        // Server list
        if (!url.includes('xhome.') && url.endsWith('/v2/login/user')) {
            const promise = NATIVE_FETCH(...arg);

            return promise.then(response => {
                return response.clone().json().then(obj => {
                    // Store xCloud token
                    RemotePlay.XCLOUD_TOKEN = obj.gsToken;

                    // Get server list
                    if (!Object.keys(SERVER_REGIONS).length) {
                        for (let region of obj.offeringSettings.regions) {
                            SERVER_REGIONS[region.name] = Object.assign({}, region);
                        }

                        // Start rendering UI
                        if (document.querySelector('div[class^=UnsupportedMarketPage]')) {
                            setTimeout(watchHeader, 2000);
                        } else {
                            watchHeader();
                        }
                    }

                    const preferredRegion = getPreferredServerRegion();
                    if (preferredRegion in SERVER_REGIONS) {
                        const tmp = Object.assign({}, SERVER_REGIONS[preferredRegion]);
                        tmp.isDefault = true;

                        obj.offeringSettings.regions = [tmp];
                    }

                    response.json = () => Promise.resolve(obj);
                    return response;
                });
            });
        }

        // Get region
        if (url.endsWith('/sessions/cloud/play')) {
            // Start hiding cursor
            if (!getPref(Preferences.MKB_ENABLED) && getPref(Preferences.MKB_HIDE_IDLE_CURSOR)) {
                MouseCursorHider.start();
                MouseCursorHider.hide();
            }

            const parsedUrl = new URL(url);
            StreamBadges.region = parsedUrl.host.split('.', 1)[0];
            for (let regionName in SERVER_REGIONS) {
                const region = SERVER_REGIONS[regionName];
                if (parsedUrl.origin == region.baseUri) {
                    StreamBadges.region = regionName;
                    break;
                }
            }

            const clone = request.clone();
            const body = await clone.json();

            // Force stream's resolution
            if (PREF_STREAM_TARGET_RESOLUTION !== 'auto') {
                const osName = (PREF_STREAM_TARGET_RESOLUTION === '720p') ? 'android' : 'windows';
                body.settings.osName = osName;
            }

            // Override "locale" value
            if (PREF_STREAM_PREFERRED_LOCALE !== 'default') {
                body.settings.locale = PREF_STREAM_PREFERRED_LOCALE;
            }

            const newRequest = new Request(request, {
                body: JSON.stringify(body),
            });

            arg[0] = newRequest;
            return NATIVE_FETCH(...arg);
        }

        // Get wait time
        if (PREF_UI_LOADING_SCREEN_WAIT_TIME && url.includes('xboxlive.com') && url.includes('/waittime/')) {
            const promise = NATIVE_FETCH(...arg);
            return promise.then(response => {
                return response.clone().json().then(json => {
                    if (json.estimatedAllocationTimeInSeconds > 0) {
                        // Setup wait time overlay
                        LoadingScreen.setupWaitTime(json.estimatedTotalWaitTimeInSeconds);
                    }

                    return response;
                });
            });
        }

        if (url.endsWith('/configuration') && url.includes('/sessions/cloud/') && request.method === 'GET') {
            const promise = NATIVE_FETCH(...arg);

            // Touch controller for all games
            if (PREF_STREAM_TOUCH_CONTROLLER === 'all') {
                TouchController.disable();

                // Get game ID from window.location
                const match = window.location.pathname.match(/\/launch\/[^\/]+\/([\w\d]+)/);
                // Check touch support
                if (match) {
                    const titleId = match[1];
                    !TitlesInfo.hasTouchSupport(titleId) && TouchController.enable();
                }
            }

            // Intercept configurations
            return promise.then(response => {
                return response.clone().text().then(text => {
                    if (!text.length) {
                        return response;
                    }

                    const obj = JSON.parse(text);
                    let overrides = JSON.parse(obj.clientStreamingConfigOverrides || '{}') || {};

                    overrides.inputConfiguration = overrides.inputConfiguration || {};
                    overrides.inputConfiguration.enableVibration = true;
                    if (ENABLE_NATIVE_MKB_BETA) {
                        overrides.inputConfiguration.enableMouseAndKeyboard = true;
                    }

                    // Enable touch controller
                    if (TouchController.isEnabled()) {
                        overrides.inputConfiguration.enableTouchInput = true;
                        overrides.inputConfiguration.maxTouchPoints = 10;
                    }

                    // Enable mic
                    if (PREF_AUDIO_MIC_ON_PLAYING) {
                        overrides.audioConfiguration = overrides.audioConfiguration || {};
                        overrides.audioConfiguration.enableMicrophone = true;
                    }

                    obj.clientStreamingConfigOverrides = JSON.stringify(overrides);

                    response.json = () => Promise.resolve(obj);
                    response.text = () => Promise.resolve(JSON.stringify(obj));

                    return response;
                });
            });
        }

        // catalog.gamepass
        if (url.startsWith('https://catalog.gamepass.com') && url.includes('/products')) {
            const promise = NATIVE_FETCH(...arg);
            return promise.then(response => {
                return response.clone().json().then(json => {
                    for (let productId in json.Products) {
                        TitlesInfo.saveFromCatalogInfo(json.Products[productId]);
                    }

                    return response;
                });
            });
        }

        if (PREF_STREAM_TOUCH_CONTROLLER === 'all' && (url.includes('/titles') || url.includes('/mru'))) {
            const promise = NATIVE_FETCH(...arg);
            return promise.then(response => {
                return response.clone().json().then(json => {
                    for (let game of json.results) {
                        TitlesInfo.saveFromTitleInfo(game);
                    }

                    return response;
                });
            });
        }

        return NATIVE_FETCH(...arg);
    }
}


function injectSettingsButton($parent) {
    if (!$parent) {
        return;
    }

    const PREF_PREFERRED_REGION = getPreferredServerRegion();
    const PREF_LATEST_VERSION = getPref(Preferences.LATEST_VERSION);

    const $headerFragment = document.createDocumentFragment();

    // Remote Play button
    if (getPref(Preferences.REMOTE_PLAY_ENABLED)) {
        const $remotePlayBtn = createButton({
            classes: ['bx-remote-play-button'],
            icon: Icon.REMOTE_PLAY,
            title: t('remote-play'),
            style: ButtonStyle.GHOST | ButtonStyle.FOCUSABLE,
            onClick: e => {
                RemotePlay.showDialog();
            },
        });
        $headerFragment.appendChild($remotePlayBtn);
    }


    // Setup Settings button
    const $settingsBtn = createButton({
        classes: ['bx-settings-button'],
        label: PREF_PREFERRED_REGION,
        style: ButtonStyle.GHOST | ButtonStyle.FOCUSABLE | ButtonStyle.FULL_HEIGHT,
        onClick: e => {
            const $settings = document.querySelector('.better_xcloud_settings');
            $settings.classList.toggle('bx-gone');
            $settings.scrollIntoView();
            document.activeElement && document.activeElement.blur();
        },
    });

    // Show new update status
    if (PREF_LATEST_VERSION && PREF_LATEST_VERSION !== SCRIPT_VERSION) {
        $settingsBtn.setAttribute('data-update-available', true);
    }

    // Add the Settings button to the web page
    $headerFragment.appendChild($settingsBtn);

    $parent.appendChild($headerFragment);

    // Setup Settings UI
    const $container = CE('div', {
        'class': 'better_xcloud_settings bx-gone',
    });

    let $updateAvailable;

    const $wrapper = CE('div', {'class': 'bx-settings-wrapper'},
                        CE('div', {'class': 'bx-settings-title-wrapper'},
                           CE('a', {
                                'class': 'bx-settings-title',
                                'href': SCRIPT_HOME,
                                'target': '_blank',
                           }, 'Better xCloud ' + SCRIPT_VERSION),
                           createButton({icon: Icon.QUESTION, label: t('help'), url: 'https://better-xcloud.github.io/features/'}),
                        )
                       );
    $updateAvailable = CE('a', {
        'class': 'bx-settings-update bx-gone',
        'href': 'https://github.com/redphx/better-xcloud/releases',
        'target': '_blank',
    });

    $wrapper.appendChild($updateAvailable);

    // Show new version indicator
    if (PREF_LATEST_VERSION && PREF_LATEST_VERSION != SCRIPT_VERSION) {
        $updateAvailable.textContent = `🌟 Version ${PREF_LATEST_VERSION} available`;
        $updateAvailable.classList.remove('bx-gone');
    }

    // Render settings
    const SETTINGS_UI = {
        'Better xCloud': {
            [Preferences.BETTER_XCLOUD_LOCALE]: t('language'),
            [Preferences.REMOTE_PLAY_ENABLED]: t('enable-remote-play-feature'),
        },

        [t('server')]: {
            [Preferences.SERVER_REGION]: t('region'),
            [Preferences.STREAM_PREFERRED_LOCALE]: t('preferred-game-language'),
            [Preferences.PREFER_IPV6_SERVER]: t('prefer-ipv6-server'),
        },

        [t('stream')]: {
            [Preferences.STREAM_TARGET_RESOLUTION]: t('target-resolution'),
            [Preferences.STREAM_CODEC_PROFILE]: t('visual-quality'),
            [Preferences.GAME_FORTNITE_FORCE_CONSOLE]: '🎮 ' + t('fortnite-force-console-version'),
            [Preferences.AUDIO_ENABLE_VOLUME_CONTROL]: t('enable-volume-control'),
            [Preferences.AUDIO_MIC_ON_PLAYING]: t('enable-mic-on-startup'),
            [Preferences.STREAM_DISABLE_FEEDBACK_DIALOG]: t('disable-post-stream-feedback-dialog'),
        },

        [t('local-co-op')]: {
            [Preferences.LOCAL_CO_OP_ENABLED]: t('enable-local-co-op-support'),
            // [Preferences.LOCAL_CO_OP_SEPARATE_TOUCH_CONTROLLER]: t('separate-touch-controller'),
        },

        [t('mouse-and-keyboard')]: {
            // '_note': '⚠️ ' + t('may-not-work-properly'),
            // [Preferences.MKB_ENABLED]: [t('enable-mkb'), t('only-supports-some-games')],
            [Preferences.MKB_ENABLED]: t('enable-mkb'),
            [Preferences.MKB_HIDE_IDLE_CURSOR]: t('hide-idle-cursor'),
        },

        /*
        [t('controller')]: {
            [Preferences.CONTROLLER_ENABLE_SHORTCUTS]: t('enable-controller-shortcuts'),
        },
        */

        [t('touch-controller')]: {
            _note: !HAS_TOUCH_SUPPORT ? '⚠️ ' + t('device-unsupported-touch') : null,
            [Preferences.STREAM_TOUCH_CONTROLLER]: t('tc-availability'),
            [Preferences.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD]: t('tc-standard-layout-style'),
            [Preferences.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM]: t('tc-custom-layout-style'),
        },

        [t('loading-screen')]: {
            [Preferences.UI_LOADING_SCREEN_GAME_ART]: t('show-game-art'),
            [Preferences.UI_LOADING_SCREEN_WAIT_TIME]: t('show-wait-time'),
            [Preferences.UI_LOADING_SCREEN_ROCKET]: t('rocket-animation'),
        },
        [t('ui')]: {
            [Preferences.UI_LAYOUT]: t('layout'),
            [Preferences.STREAM_SIMPLIFY_MENU]: t('simplify-stream-menu'),
            [Preferences.SKIP_SPLASH_VIDEO]: t('skip-splash-video'),
            [Preferences.HIDE_DOTS_ICON]: t('hide-system-menu-icon'),
            [Preferences.REDUCE_ANIMATIONS]: t('reduce-animations'),
            [Preferences.SCREENSHOT_BUTTON_POSITION]: t('screenshot-button-position'),
        },
        [t('other')]: {
            [Preferences.BLOCK_SOCIAL_FEATURES]: t('disable-social-features'),
            [Preferences.BLOCK_TRACKING]: t('disable-xcloud-analytics'),
        },
        [t('advanced')]: {
            [Preferences.USER_AGENT_PROFILE]: t('user-agent-profile'),
        },
    };

    for (let groupLabel in SETTINGS_UI) {
        const $group = CE('span', {'class': 'bx-settings-group-label'}, groupLabel);

        // Render note
        if (SETTINGS_UI[groupLabel]._note) {
            const $note = CE('b', {}, SETTINGS_UI[groupLabel]._note);
            $group.appendChild($note);
        }

        $wrapper.appendChild($group);

        for (let settingId in SETTINGS_UI[groupLabel]) {
            if (settingId.startsWith('_')) {
                continue;
            }

            const setting = Preferences.SETTINGS[settingId];

            const settingLabel = SETTINGS_UI[groupLabel][settingId];
            const settingNote = setting.note;

            let $control, $inpCustomUserAgent;
            let labelAttrs = {};

            if (settingId === Preferences.USER_AGENT_PROFILE) {
                let defaultUserAgent = window.navigator.orgUserAgent || window.navigator.userAgent;
                $inpCustomUserAgent = CE('input', {
                    'type': 'text',
                    'placeholder': defaultUserAgent,
                    'class': 'bx-settings-custom-user-agent',
                });
                $inpCustomUserAgent.addEventListener('change', e => {
                    setPref(Preferences.USER_AGENT_CUSTOM, e.target.value.trim());
                });

                $control = PREFS.toElement(Preferences.USER_AGENT_PROFILE, e => {
                    const value = e.target.value;
                    let isCustom = value === UserAgent.PROFILE_CUSTOM;
                    let userAgent = UserAgent.get(value);

                    $inpCustomUserAgent.value = userAgent;
                    $inpCustomUserAgent.readOnly = !isCustom;
                    $inpCustomUserAgent.disabled = !isCustom;
                });
            } else if (settingId === Preferences.SERVER_REGION) {
                let selectedValue;

                $control = CE('select', {id: `bx_setting_${settingId}`});
                $control.addEventListener('change', e => {
                    setPref(settingId, e.target.value);
                });

                selectedValue = PREF_PREFERRED_REGION;
                setting.options = {};
                for (let regionName in SERVER_REGIONS) {
                    const region = SERVER_REGIONS[regionName];
                    let value = regionName;

                    let label = regionName;
                    if (region.isDefault) {
                        label += ` (${t('default')})`;
                        value = 'default';
                    }

                    setting.options[value] = label;
                }

                for (let value in setting.options) {
                    const label = setting.options[value];

                    const $option = CE('option', {value: value}, label);
                    $option.selected = value === selectedValue || label.includes(selectedValue);
                    $control.appendChild($option);
                }
            } else {
                let onChange = null;
                if (settingId === Preferences.BETTER_XCLOUD_LOCALE) {
                    onChange = e => {
                        localStorage.setItem('better_xcloud_locale', e.target.value);
                        window.location.reload();
                    }
                }

                $control = PREFS.toElement(settingId, onChange);
                labelAttrs = {'for': $control.id, 'tabindex': 0};
            }

            // Disable unsupported settings
            if (setting.unsupported) {
                $control.disabled = true;
            }

            const $label = CE('label', labelAttrs, settingLabel);
            if (settingNote) {
                $label.appendChild(CE('b', {}, settingNote));
            }
            const $elm = CE('div', {'class': 'bx-settings-row'},
                            $label,
                            $control
                           );

            $wrapper.appendChild($elm);

            // Add User-Agent input
            if (settingId === Preferences.USER_AGENT_PROFILE) {
                $wrapper.appendChild($inpCustomUserAgent);
                // Trigger 'change' event
                $control.dispatchEvent(new Event('change'));
            }
        }
    }

    // Setup Reload button
    const $reloadBtn = createButton({
        classes: ['bx-settings-reload-button'],
        label: t('settings-reload'),
        style: ButtonStyle.PRIMARY | ButtonStyle.FOCUSABLE | ButtonStyle.FULL_WIDTH,
        onClick: e => {
            window.location.reload();
            $reloadBtn.disabled = true;
            $reloadBtn.textContent = t('settings-reloading');
        },
    });
    $reloadBtn.setAttribute('tabindex', 0);
    $wrapper.appendChild($reloadBtn);

    // Donation link
    const $donationLink = CE('a', {'class': 'bx-donation-link', href: 'https://ko-fi.com/redphx', target: '_blank'}, `❤️ ${t('support-better-xcloud')}`);
    $wrapper.appendChild($donationLink);

    // Show Game Pass app version
    try {
        const appVersion = document.querySelector('meta[name=gamepass-app-version]').content;
        const appDate = new Date(document.querySelector('meta[name=gamepass-app-date]').content).toISOString().substring(0, 10);
        $wrapper.appendChild(CE('div', {'class': 'bx-settings-app-version'}, `xCloud website version ${appVersion} (${appDate})`));
    } catch (e) {}

    $container.appendChild($wrapper);

    // Add Settings UI to the web page
    const $pageContent = document.getElementById('PageContent');
    $pageContent.parentNode.insertBefore($container, $pageContent);
}

function getVideoPlayerFilterStyle() {
    const filters = [];

    const clarity = getPref(Preferences.VIDEO_CLARITY);
    if (clarity != 0) {
        const level = (7 - (clarity - 1) * 0.5).toFixed(1); // 5, 5.5, 6, 6.5, 7
        const matrix = `0 -1 0 -1 ${level} -1 0 -1 0`;
        document.getElementById('bx-filter-clarity-matrix').setAttributeNS(null, 'kernelMatrix', matrix);

        filters.push(`url(#bx-filter-clarity)`);
    }

    const saturation = getPref(Preferences.VIDEO_SATURATION);
    if (saturation != 100) {
        filters.push(`saturate(${saturation}%)`);
    }

    const contrast = getPref(Preferences.VIDEO_CONTRAST);
    if (contrast != 100) {
        filters.push(`contrast(${contrast}%)`);
    }

    const brightness = getPref(Preferences.VIDEO_BRIGHTNESS);
    if (brightness != 100) {
        filters.push(`brightness(${brightness}%)`);
    }

    return filters.join(' ');
}


function updateVideoPlayerCss() {
    let $elm = document.getElementById('bx-video-css');
    if (!$elm) {
        const $fragment = document.createDocumentFragment();
        $elm = CE('style', {id: 'bx-video-css'});
        $fragment.appendChild($elm);

        // Setup SVG filters
        const $svg = CE('svg', {
            'id': 'bx-video-filters',
            'xmlns': 'http://www.w3.org/2000/svg',
            'class': 'bx-gone',
        }, CE('defs', {'xmlns': 'http://www.w3.org/2000/svg'},
              CE('filter', {'id': 'bx-filter-clarity', 'xmlns': 'http://www.w3.org/2000/svg'},
                CE('feConvolveMatrix', {'id': 'bx-filter-clarity-matrix', 'order': '3', 'xmlns': 'http://www.w3.org/2000/svg'}))
             )
        );
        $fragment.appendChild($svg);
        document.documentElement.appendChild($fragment);
    }

    let filters = getVideoPlayerFilterStyle();
    let videoCss = '';
    if (filters) {
        videoCss += `filter: ${filters} !important;`;
    }

    const PREF_RATIO = getPref(Preferences.VIDEO_RATIO);
    if (PREF_RATIO && PREF_RATIO !== '16:9') {
        if (PREF_RATIO.includes(':')) {
            videoCss += `aspect-ratio: ${PREF_RATIO.replace(':', '/')}; object-fit: unset !important;`;

            const tmp = PREF_RATIO.split(':');
            const ratio = parseFloat(tmp[0]) / parseFloat(tmp[1]);
            const maxRatio = window.innerWidth / window.innerHeight;
            if (ratio < maxRatio) {
                videoCss += 'width: fit-content !important;'
            } else {
                videoCss += 'height: fit-content !important;'
            }
        } else {
            videoCss += `object-fit: ${PREF_RATIO} !important;`;
        }
    }

    let css = '';
    if (videoCss) {
        css = `
div[data-testid="media-container"] {
    display: flex;
}

#game-stream video {
    margin: 0 auto;
    align-self: center;
    ${videoCss}
}
`;
    }

    $elm.textContent = css;
}


function checkHeader() {
    const $button = document.querySelector('.bx-settings-button');

    if (!$button) {
        const $rightHeader = document.querySelector('#PageContent div[class*=EdgewaterHeader-module__rightSectionSpacing]');
        injectSettingsButton($rightHeader);
    }
}


function watchHeader() {
    const $header = document.querySelector('#PageContent header');
    if (!$header) {
        return;
    }

    let timeout;
    const observer = new MutationObserver(mutationList => {
        timeout && clearTimeout(timeout);
        timeout = setTimeout(checkHeader, 2000);
    });
    observer.observe($header, {subtree: true, childList: true});

    checkHeader();
}


function cloneStreamHudButton($orgButton, label, svg_icon) {
    const $container = $orgButton.cloneNode(true);
    let timeout;

    const onTransitionStart = e => {
        if ( e.propertyName !== 'opacity') {
            return;
        }

        timeout && clearTimeout(timeout);
        $container.style.pointerEvents = 'none';
    };

    const onTransitionEnd = e => {
        if ( e.propertyName !== 'opacity') {
            return;
        }

        const left = document.getElementById('StreamHud').style.left;
        if (left === '0px') {
            timeout && clearTimeout(timeout);
            timeout = setTimeout(() => {
                    $container.style.pointerEvents = 'auto';
                }, 100);
        }
    };

    if (HAS_TOUCH_SUPPORT) {
        $container.addEventListener('transitionstart', onTransitionStart);
        $container.addEventListener('transitionend', onTransitionEnd);
    }

    const $button = $container.querySelector('button');
    $button.setAttribute('title', label);

    const $svg = $button.querySelector('svg');
    $svg.innerHTML = svg_icon;
    $svg.style.fill = 'none';

    const attrs = {
        'fill': 'none',
        'stroke': '#fff',
        'fill-rule': 'evenodd',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-width': 2,
        'viewBox': '0 0 32 32'
    };

    for (const attr in attrs) {
        $svg.setAttribute(attr, attrs[attr]);
    }

    return $container;
}


function injectStreamMenuButtons() {
    const $screen = document.querySelector('#PageContent section[class*=PureScreens]');
    if (!$screen) {
        return;
    }

    if ($screen.xObserving) {
        return;
    }

    $screen.xObserving = true;

    const $quickBar = document.querySelector('.bx-quick-settings-bar');
    const $parent = $screen.parentElement;
    const hideQuickBarFunc = e => {
        if (e) {
            e.stopPropagation();
            if (e.target != $parent && e.target.id !== 'MultiTouchSurface' && !e.target.querySelector('#BabylonCanvasContainer-main')) {
                return;
            }
            if (e.target.id === 'MultiTouchSurface') {
                e.target.removeEventListener('touchstart', hideQuickBarFunc);
            }
        }

        // Hide Quick settings bar
        $quickBar.classList.add('bx-gone');

        $parent.removeEventListener('click', hideQuickBarFunc);
        // $parent.removeEventListener('touchstart', hideQuickBarFunc);
    }

    let $btnStreamSettings;
    let $btnStreamStats;
    let $gripHandle;

    const PREF_DISABLE_FEEDBACK_DIALOG = getPref(Preferences.STREAM_DISABLE_FEEDBACK_DIALOG);
    const observer = new MutationObserver(mutationList => {
        mutationList.forEach(item => {
            if (item.type !== 'childList') {
                return;
            }

            item.removedNodes.forEach($node => {
                if (!$node || !$node.className || !$node.className.startsWith) {
                    return;
                }

                if ($node.className.startsWith('StreamMenu')) {
                    if (!document.querySelector('div[class^=PureInStreamConfirmationModal]')) {
                        BxEvent.dispatch(window, BxEvent.STREAM_MENU_HIDDEN);
                    }
                }
            });

            item.addedNodes.forEach(async $node => {
                if (!$node || !$node.className) {
                    return;
                }

                // Error Page: .PureErrorPage.ErrorScreen
                if ($node.className.includes('PureErrorPage')) {
                    BxEvent.dispatch(window, BxEvent.STREAM_ERROR_PAGE);
                    return;
                }

                if (PREF_DISABLE_FEEDBACK_DIALOG && $node.className.startsWith('PostStreamFeedbackScreen')) {
                    const $btnClose = $node.querySelector('button');
                    $btnClose && $btnClose.click();
                    return;
                }

                // Render badges
                if ($node.className.startsWith('StreamMenu')) {
                    BxEvent.dispatch(window, BxEvent.STREAM_MENU_SHOWN);

                    // Hide Quick bar when closing HUD
                    const $btnCloseHud = document.querySelector('button[class*=StreamMenu-module__backButton]');
                    if (!$btnCloseHud) {
                        return;
                    }

                    $btnCloseHud && $btnCloseHud.addEventListener('click', e => {
                        $quickBar.classList.add('bx-gone');
                    });

                    // Get "Quit game" button
                    const $btnQuit = $node.querySelector('div[class^=StreamMenu] > div > button:last-child');
                    // Hold "Quit game" button to refresh the stream
                    new MouseHoldEvent($btnQuit, () => {
                        confirm(t('confirm-reload-stream')) && window.location.reload();
                    }, 1000);

                    // Render stream badges
                    const $menu = document.querySelector('div[class*=StreamMenu-module__menuContainer] > div[class*=Menu-module]');
                    $menu.appendChild(await StreamBadges.render());

                    hideQuickBarFunc();
                    return;
                }

                if ($node.className.startsWith('Overlay-module_') || $node.className.startsWith('InProgressScreen')) {
                    $node = $node.querySelector('#StreamHud');
                }

                if (!$node || ($node.id || '') !== 'StreamHud') {
                    return;
                }

                // Grip handle
                $gripHandle = $node.querySelector('button[class^=GripHandle]');

                // Get the second last button
                const $orgButton = $node.querySelector('div[class^=HUDButton]');
                if (!$orgButton) {
                    return;
                }

                const hideGripHandle = () => {
                    $gripHandle.dispatchEvent(new PointerEvent('pointerdown'));
                    $gripHandle.click();
                    $gripHandle.dispatchEvent(new PointerEvent('pointerdown'));
                    $gripHandle.click();
                }

                // Create Stream Settings button
                if (!$btnStreamSettings) {
                    $btnStreamSettings = cloneStreamHudButton($orgButton, t('menu-stream-settings'), Icon.STREAM_SETTINGS);
                    $btnStreamSettings.addEventListener('click', e => {
                        hideGripHandle();
                        e.preventDefault();

                        const msVideoProcessing = $STREAM_VIDEO.msVideoProcessing;
                        $quickBar.setAttribute('data-clarity-boost', (msVideoProcessing && msVideoProcessing !== 'default'));

                        // Show Quick settings bar
                        $quickBar.classList.remove('bx-gone');

                        $parent.addEventListener('click', hideQuickBarFunc);
                        //$parent.addEventListener('touchstart', hideQuickBarFunc);

                        const $touchSurface = document.getElementById('MultiTouchSurface');
                        $touchSurface && $touchSurface.style.display != 'none' && $touchSurface.addEventListener('touchstart', hideQuickBarFunc);
                    });
                }

                // Create Stream Stats button
                if (!$btnStreamStats) {
                    $btnStreamStats = cloneStreamHudButton($orgButton, t('menu-stream-stats'), Icon.STREAM_STATS);
                    $btnStreamStats.addEventListener('click', e => {
                        hideGripHandle();
                        e.preventDefault();

                        // Toggle Stream Stats
                        StreamStats.toggle();

                        const btnStreamStatsOn = (!StreamStats.isHidden() && !StreamStats.isGlancing());
                        $btnStreamStats.classList.toggle('bx-stream-menu-button-on', btnStreamStatsOn);
                    });
                }

                const btnStreamStatsOn = (!StreamStats.isHidden() && !StreamStats.isGlancing());
                $btnStreamStats.classList.toggle('bx-stream-menu-button-on', btnStreamStatsOn);

                // Insert buttons after Stream Settings button
                $orgButton.parentElement.insertBefore($btnStreamStats, $orgButton.parentElement.lastElementChild);
                $orgButton.parentElement.insertBefore($btnStreamSettings, $btnStreamStats);

                // Move the Dots button to the beginning
                const $dotsButton = $orgButton.parentElement.lastElementChild;
                $dotsButton.parentElement.insertBefore($dotsButton, $dotsButton.parentElement.firstElementChild);
            });
        });
    });
    observer.observe($screen, {subtree: true, childList: true});
}


function showStreamSettings(tabId) {
    const $wrapper = document.querySelector('.bx-quick-settings-bar');
    if (!$wrapper) {
        return;
    }

    // Select tab
    if (tabId) {
        const $tab = $wrapper.querySelector(`.bx-quick-settings-tabs svg[data-group=${tabId}]`);
        $tab && $tab.dispatchEvent(new Event('click'));
    }

    $wrapper.classList.remove('bx-gone');

    const $screen = document.querySelector('#PageContent section[class*=PureScreens]');
    if ($screen && !$screen.parentElement.bxClick) {
        $screen.parentElement.bxClick = true;

        const onClick = e => {
            $wrapper.classList.add('bx-gone');
            $screen.parentElement.bxClick = false;
            $screen.parentElement.removeEventListener('click', onClick);
        };

        $screen.parentElement.addEventListener('click', onClick);
    }
}

function patchVideoApi() {
    const PREF_SKIP_SPLASH_VIDEO = getPref(Preferences.SKIP_SPLASH_VIDEO);
    const PREF_SCREENSHOT_BUTTON_POSITION = getPref(Preferences.SCREENSHOT_BUTTON_POSITION);

    // Show video player when it's ready
    var showFunc;
    showFunc = function() {
        this.style.visibility = 'visible';
        this.removeEventListener('playing', showFunc);

        if (!this.videoWidth) {
            return;
        }

        BxEvent.dispatch(window, BxEvent.STREAM_PLAYING, {
                $video: this,
            });
    }

    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() {
        if (this.className && this.className.startsWith('XboxSplashVideo')) {
            if (PREF_SKIP_SPLASH_VIDEO) {
                this.volume = 0;
                this.style.display = 'none';
                this.dispatchEvent(new Event('ended'));

                return {
                    catch: () => {},
                };
            }

            return nativePlay.apply(this);
        }

        this.addEventListener('playing', showFunc);
        injectStreamMenuButtons();

        return nativePlay.apply(this);
    };
}


function patchRtcCodecs() {
    const codecProfile = getPref(Preferences.STREAM_CODEC_PROFILE);
    if (codecProfile === 'default') {
        return;
    }

    if (typeof RTCRtpTransceiver === 'undefined' || !('setCodecPreferences' in RTCRtpTransceiver.prototype)) {
        return false;
    }

    const profilePrefix = codecProfile === 'high' ? '4d' : (codecProfile === 'low' ? '420' : '42e');
    const profileLevelId = `profile-level-id=${profilePrefix}`;

    const nativeSetCodecPreferences = RTCRtpTransceiver.prototype.setCodecPreferences;
    RTCRtpTransceiver.prototype.setCodecPreferences = function(codecs) {
        // Use the same codecs as desktop
        const newCodecs = codecs.slice();
        let pos = 0;
        newCodecs.forEach((codec, i) => {
            // Find high-quality codecs
            if (codec.sdpFmtpLine && codec.sdpFmtpLine.includes(profileLevelId)) {
                // Move it to the top of the array
                newCodecs.splice(i, 1);
                newCodecs.splice(pos, 0, codec);
                ++pos;
            }
        });

        try {
            nativeSetCodecPreferences.apply(this, [newCodecs]);
        } catch (e) {
            // Didn't work -> use default codecs
            console.log(e);
            nativeSetCodecPreferences.apply(this, [codecs]);
        }
    }
}


function setupQuickSettingsBar() {
    const isSafari = UserAgent.isSafari();

    const SETTINGS_UI = [
        getPref(Preferences.MKB_ENABLED) && {
            icon: Icon.MOUSE,
            group: 'mkb',
            items: [
                {
                    group: 'mkb',
                    label: t('mouse-and-keyboard'),
                    help_url: 'https://better-xcloud.github.io/mouse-and-keyboard/',
                    content: MkbRemapper.INSTANCE.render(),
                },
            ],
        },

        {
            icon: Icon.DISPLAY,
            group: 'stream',
            items: [
                {
                    group: 'audio',
                    label: t('audio'),
                    help_url: 'https://better-xcloud.github.io/ingame-features/#audio',
                    items: [
                        {
                            pref: Preferences.AUDIO_VOLUME,
                            label: t('volume'),
                            onChange: (e, value) => {
                                STREAM_AUDIO_GAIN_NODE && (STREAM_AUDIO_GAIN_NODE.gain.value = (value / 100).toFixed(2));
                            },
                            params: {
                                disabled: !getPref(Preferences.AUDIO_ENABLE_VOLUME_CONTROL),
                            },
                        },
                    ],
                },

                {
                    group: 'video',
                    label: t('video'),
                    help_url: 'https://better-xcloud.github.io/ingame-features/#video',
                    note: CE('div', {'class': 'bx-quick-settings-bar-note bx-clarity-boost-warning'}, `⚠️ ${t('clarity-boost-warning')}`),
                    items: [
                        {
                            pref: Preferences.VIDEO_RATIO,
                            label: t('ratio'),
                            onChange: updateVideoPlayerCss,
                        },

                        {
                            pref: Preferences.VIDEO_CLARITY,
                            label: t('clarity'),
                            onChange: updateVideoPlayerCss,
                            unsupported: isSafari,
                        },

                        {
                            pref: Preferences.VIDEO_SATURATION,
                            label: t('saturation'),
                            onChange: updateVideoPlayerCss,
                        },

                        {
                            pref: Preferences.VIDEO_CONTRAST,
                            label: t('contrast'),
                            onChange: updateVideoPlayerCss,
                        },

                        {
                            pref: Preferences.VIDEO_BRIGHTNESS,
                            label: t('brightness'),
                            onChange: updateVideoPlayerCss,
                        },
                    ],
                },
            ],
        },

        {
            icon: Icon.CONTROLLER,
            group: 'controller',
            items: [
                {
                    group: 'controller',
                    label: t('controller'),
                    help_url: 'https://better-xcloud.github.io/ingame-features/#controller',
                    items: [
                        {
                            pref: Preferences.CONTROLLER_ENABLE_VIBRATION,
                            label: t('controller-vibration'),
                            unsupported: !VibrationManager.supportControllerVibration(),
                            onChange: VibrationManager.updateGlobalVars,
                        },

                        {
                            pref: Preferences.CONTROLLER_DEVICE_VIBRATION,
                            label: t('device-vibration'),
                            unsupported: !VibrationManager.supportDeviceVibration(),
                            onChange: VibrationManager.updateGlobalVars,
                        },

                        (VibrationManager.supportControllerVibration() || VibrationManager.supportDeviceVibration()) && {
                            pref: Preferences.CONTROLLER_VIBRATION_INTENSITY,
                            label: t('vibration-intensity'),
                            unsupported: !VibrationManager.supportDeviceVibration(),
                            onChange: VibrationManager.updateGlobalVars,
                        },
                    ],
                },
            ],
        },

        HAS_TOUCH_SUPPORT && {
            icon: Icon.HAND_TAP,
            group: 'touch-controller',
            items: [
                {
                    group: 'touch-controller',
                    label: t('touch-controller'),
                    items: [
                        {
                            label: t('layout'),
                            content: CE('select', {disabled: true}, CE('option', {}, t('default'))),
                            onMounted: $elm => {
                                $elm.addEventListener('change', e => {
                                    TouchController.loadCustomLayout(GAME_XBOX_TITLE_ID, $elm.value, 1000);
                                });

                                window.addEventListener(BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED, e => {
                                    const data = e.data;

                                    if (GAME_XBOX_TITLE_ID && $elm.xboxTitleId === GAME_XBOX_TITLE_ID) {
                                        $elm.dispatchEvent(new Event('change'));
                                        return;
                                    }

                                    $elm.xboxTitleId = GAME_XBOX_TITLE_ID;

                                    // Clear options
                                    while ($elm.firstChild) {
                                        $elm.removeChild($elm.firstChild);
                                    }

                                    $elm.disabled = !data;
                                    if (!data) {
                                        $elm.appendChild(CE('option', {value: ''}, t('default')));
                                        $elm.value = '';
                                        $elm.dispatchEvent(new Event('change'));
                                        return;
                                    }

                                    // Add options
                                    const $fragment = document.createDocumentFragment();
                                    for (const key in data.layouts) {
                                        const layout = data.layouts[key];

                                        const $option = CE('option', {value: key}, layout.name);
                                        $fragment.appendChild($option);
                                    }

                                    $elm.appendChild($fragment);
                                    $elm.value = data.default_layout;
                                    $elm.dispatchEvent(new Event('change'));
                                });
                            },
                        },
                    ],
                }
            ],
        },

        {
            icon: Icon.STREAM_STATS,
            group: 'stats',
            items: [
                {
                    group: 'stats',
                    label: t('menu-stream-stats'),
                    help_url: 'https://better-xcloud.github.io/stream-stats/',
                    items: [
                        {
                            pref: Preferences.STATS_SHOW_WHEN_PLAYING,
                            label: t('show-stats-on-startup'),
                        },
                        {
                            pref: Preferences.STATS_QUICK_GLANCE,
                            label: '👀 ' + t('enable-quick-glance-mode'),
                            onChange: e => {
                                e.target.checked ? StreamStats.quickGlanceSetup() : StreamStats.quickGlanceStop();
                            },
                        },
                        {
                            pref: Preferences.STATS_ITEMS,
                            label: t('stats'),
                            onChange: StreamStats.refreshStyles,
                        },
                        {
                            pref: Preferences.STATS_POSITION,
                            label: t('position'),
                            onChange: StreamStats.refreshStyles,
                        },
                        {
                            pref: Preferences.STATS_TEXT_SIZE,
                            label: t('text-size'),
                            onChange: StreamStats.refreshStyles,
                        },
                        {
                            pref: Preferences.STATS_OPACITY,
                            label: t('opacity'),
                            onChange: StreamStats.refreshStyles,
                        },
                        {
                            pref: Preferences.STATS_TRANSPARENT,
                            label: t('transparent-background'),
                            onChange: StreamStats.refreshStyles,
                        },
                        {
                            pref: Preferences.STATS_CONDITIONAL_FORMATTING,
                            label: t('conditional-formatting'),
                            onChange: StreamStats.refreshStyles,
                        },
                    ],
                },
            ],
        },
    ];

    let $tabs;
    let $settings;

    const $wrapper = CE('div', {'class': 'bx-quick-settings-bar bx-gone'},
            $tabs = CE('div', {'class': 'bx-quick-settings-tabs'}),
            $settings = CE('div', {'class': 'bx-quick-settings-tab-contents'}),
        );

    for (const settingTab of SETTINGS_UI) {
        if (!settingTab) {
            continue;
        }

        const $svg = CE('svg', {
            'xmlns': 'http://www.w3.org/2000/svg',
            'data-group': settingTab.group,
            'fill': 'none',
            'stroke': '#fff',
            'fill-rule': 'evenodd',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            'stroke-width': 2,
        });
        $svg.innerHTML = settingTab.icon;
        $svg.setAttribute('viewBox', '0 0 32 32');
        $svg.addEventListener('click', e => {
            // Switch tab
            for (const $child of $settings.children) {
                if ($child.getAttribute('data-group') === settingTab.group) {
                    $child.classList.remove('bx-gone');
                } else {
                    $child.classList.add('bx-gone');
                }
            }

            // Highlight current tab button
            for (const $child of $tabs.children) {
                $child.classList.remove('bx-active');
            }

            $svg.classList.add('bx-active');
        });

        $tabs.appendChild($svg);

        const $group = CE('div', {'data-group': settingTab.group, 'class': 'bx-gone'});

        for (const settingGroup of settingTab.items) {
            $group.appendChild(CE('h2', {},
                    CE('span', {}, settingGroup.label),
                    settingGroup.help_url && createButton({
                            icon: Icon.QUESTION,
                            style: ButtonStyle.GHOST,
                            url: settingGroup.help_url,
                            title: t('help'),
                        }),
                ));
            if (settingGroup.note) {
                if (typeof settingGroup.note === 'string') {
                    settingGroup.note = document.createTextNode(settingGroup.note);
                }
                $group.appendChild(settingGroup.note);
            }

            if (settingGroup.content) {
                $group.appendChild(settingGroup.content);
                continue;
            }

            if (!settingGroup.items) {
                settingGroup.items = [];
            }

            for (const setting of settingGroup.items) {
                if (!setting) {
                    continue;
                }

                const pref = setting.pref;

                let $control;
                if (setting.content) {
                    $control = setting.content;
                } else if (!setting.unsupported) {
                    $control = PREFS.toElement(pref, setting.onChange, setting.params);
                }

                const $content = CE('div', {'class': 'bx-quick-settings-row', 'data-type': settingGroup.group},
                            CE('label', {for: `bx_setting_${pref}`},
                            setting.label,
                            setting.unsupported && CE('div', {'class': 'bx-quick-settings-bar-note'}, t('browser-unsupported-feature')),
                        ),
                        !setting.unsupported && $control,
                    );

                $group.appendChild($content);

                setting.onMounted && setting.onMounted($control);
            }
        }

        $settings.appendChild($group);
    }

    // Select first tab
    $tabs.firstElementChild.dispatchEvent(new Event('click'));

    document.documentElement.appendChild($wrapper);
}


function takeScreenshot(callback) {
    const $canvasContext = $SCREENSHOT_CANVAS.getContext('2d');

    $canvasContext.drawImage($STREAM_VIDEO, 0, 0, $SCREENSHOT_CANVAS.width, $SCREENSHOT_CANVAS.height);
    $SCREENSHOT_CANVAS.toBlob(blob => {
        // Download screenshot
        const now = +new Date;
        const $anchor = createElement('a', {
            'download': `${GAME_TITLE_ID}-${now}.png`,
            'href': URL.createObjectURL(blob),
        });
        $anchor.click();

        // Free screenshot from memory
        URL.revokeObjectURL($anchor.href);
        $canvasContext.clearRect(0, 0, $SCREENSHOT_CANVAS.width, $SCREENSHOT_CANVAS.height);

        callback && callback();
    }, 'image/png');
}


function setupScreenshotButton() {
    $SCREENSHOT_CANVAS = createElement('canvas', {'class': 'bx-screenshot-canvas'});
    document.documentElement.appendChild($SCREENSHOT_CANVAS);

    const delay = 2000;
    const $btn = createElement('div', {'class': 'bx-screenshot-button', 'data-showing': false});

    let timeout;
    const detectDbClick = e => {
        if (!$STREAM_VIDEO) {
            timeout = null;
            $btn.style.display = 'none';
            return;
        }

        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
            $btn.setAttribute('data-capturing', 'true');

            takeScreenshot(() => {
                // Hide button
                $btn.setAttribute('data-showing', 'false');
                setTimeout(() => {
                    if (!timeout) {
                        $btn.setAttribute('data-capturing', 'false');
                    }
                }, 100);
            });

            return;
        }

        const isShowing = $btn.getAttribute('data-showing') === 'true';
        if (!isShowing) {
            // Show button
            $btn.setAttribute('data-showing', 'true');
            $btn.setAttribute('data-capturing', 'false');

            clearTimeout(timeout);
            timeout = setTimeout(() => {
                timeout = null;
                $btn.setAttribute('data-showing', 'false');
                $btn.setAttribute('data-capturing', 'false');
            }, delay);
        }
    }

    $btn.addEventListener('mousedown', detectDbClick);
    document.documentElement.appendChild($btn);
}


function patchHistoryMethod(type) {
    const orig = window.history[type];

    return function(...args) {
        BxEvent.dispatch(window, BxEvent.POPSTATE, {
                arguments: args,
            });
        return orig.apply(this, arguments);
    };
};


function onHistoryChanged(e) {
    if (e && e.arguments && e.arguments[0] && e.arguments[0].origin === 'better-xcloud') {
        return;
    }

    setTimeout(RemotePlay.detect, 10);

    const $settings = document.querySelector('.better_xcloud_settings');
    if ($settings) {
        $settings.classList.add('bx-gone');
    }

    LoadingScreen.reset();
    setTimeout(checkHeader, 2000);

    BxEvent.dispatch(window, BxEvent.STREAM_STOPPED);
}


function disablePwa() {
    const userAgent = (window.navigator.orgUserAgent || window.navigator.userAgent || '').toLowerCase();
    if (!userAgent) {
        return;
    }

    // Check if it's Safari on mobile
    if (UserAgent.isSafari(true)) {
        // Disable the PWA prompt
        Object.defineProperty(window.navigator, 'standalone', {
            value: true,
        });
    }
}

function setupBxUi() {
    updateVideoPlayerCss();

    // Prevent initializing multiple times
    if (document.querySelector('.bx-quick-settings-bar')) {
        return;
    }

    window.addEventListener('resize', updateVideoPlayerCss);

    setupQuickSettingsBar();
    setupScreenshotButton();
    StreamStats.render();
}


// Hide Settings UI when navigate to another page
window.addEventListener(BxEvent.POPSTATE, onHistoryChanged);
window.addEventListener('popstate', onHistoryChanged);

// Make pushState/replaceState methods dispatch BxEvent.POPSTATE event
window.history.pushState = patchHistoryMethod('pushState');
window.history.replaceState = patchHistoryMethod('replaceState');

window.addEventListener(BxEvent.STREAM_LOADING, e => {
    // Get title ID for screenshot's name
    if (window.location.pathname.includes('/launch/')) {
        const matches = /\/launch\/(?<title_id>[^\/]+)\/(?<product_id>\w+)/.exec(window.location.pathname);
        GAME_TITLE_ID = matches.groups.title_id;
        GAME_PRODUCT_ID = matches.groups.product_id;
    } else {
        GAME_TITLE_ID = 'remote-play';
        GAME_PRODUCT_ID = null;
    }

    // Setup UI
    setupBxUi();

    // Setup loading screen
    getPref(Preferences.UI_LOADING_SCREEN_GAME_ART) && LoadingScreen.setup();
});

window.addEventListener(BxEvent.STREAM_STARTING, e => {
    // Hide loading screen
    getPref(Preferences.UI_LOADING_SCREEN_GAME_ART) && LoadingScreen.hide();
});

window.addEventListener(BxEvent.STREAM_PLAYING, e => {
    const $video = e.$video;
    $STREAM_VIDEO = $video;

    IS_PLAYING = true;

    /*
    if (getPref(Preferences.CONTROLLER_ENABLE_SHORTCUTS)) {
        GamepadHandler.startPolling();
    }
    */

    const PREF_SCREENSHOT_BUTTON_POSITION = getPref(Preferences.SCREENSHOT_BUTTON_POSITION);
    $SCREENSHOT_CANVAS.width = $video.videoWidth;
    $SCREENSHOT_CANVAS.height = $video.videoHeight;

    // Setup screenshot button
    if (PREF_SCREENSHOT_BUTTON_POSITION !== 'none') {
        const $btn = document.querySelector('.bx-screenshot-button');
        $btn.style.display = 'block';

        if (PREF_SCREENSHOT_BUTTON_POSITION === 'bottom-right') {
            $btn.style.right = '0';
        } else {
            $btn.style.left = '0';
        }
    }
});

window.addEventListener(BxEvent.STREAM_ERROR_PAGE, e => {
    BxEvent.dispatch(window, BxEvent.STREAM_STOPPED);
});

window.addEventListener(BxEvent.STREAM_STOPPED, e => {
    if (!IS_PLAYING) {
        return;
    }

    IS_PLAYING = false;

    // Stop MKB listeners
    MkbHandler.INSTANCE.destroy();

    const $quickBar = document.querySelector('.bx-quick-settings-bar');
    if ($quickBar) {
        $quickBar.classList.add('bx-gone');
    }

    STREAM_AUDIO_GAIN_NODE = null;
    $STREAM_VIDEO = null;
    StreamStats.onStoppedPlaying();

    const $screenshotBtn = document.querySelector('.bx-screenshot-button');
    if ($screenshotBtn) {
        $screenshotBtn.style = '';
    }

    MouseCursorHider.stop();
    TouchController.reset();

    GamepadHandler.stopPolling();
});


PreloadedState.override();

// Check for Update
checkForUpdate();

// Monkey patches
if (getPref(Preferences.AUDIO_ENABLE_VOLUME_CONTROL)) {
    if (UserAgent.isSafari(true)) {
        const nativeCreateGain = window.AudioContext.prototype.createGain;
        window.AudioContext.prototype.createGain = function() {
            const gainNode = nativeCreateGain.apply(this);
            gainNode.gain.value = (getPref(Preferences.AUDIO_VOLUME) / 100).toFixed(2);
            STREAM_AUDIO_GAIN_NODE = gainNode;
            return gainNode;
        }
    }

    const OrgAudioContext = window.AudioContext;
    window.AudioContext = function() {
        const ctx = new OrgAudioContext();
        STREAM_AUDIO_CONTEXT = ctx;
        STREAM_AUDIO_GAIN_NODE = null;
        return ctx;
    }

    const nativePlay = HTMLAudioElement.prototype.play;
    HTMLAudioElement.prototype.play = function() {
        this.muted = true;

        const promise = nativePlay.apply(this);
        if (STREAM_AUDIO_GAIN_NODE) {
            return promise;
        }

        this.addEventListener('playing', e => e.target.pause());

        const audioCtx = STREAM_AUDIO_CONTEXT;
        const audioStream = audioCtx.createMediaStreamSource(this.srcObject);
        const gainNode = audioCtx.createGain();

        audioStream.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        gainNode.gain.value = (getPref(Preferences.AUDIO_VOLUME) / 100).toFixed(2);
        STREAM_AUDIO_GAIN_NODE = gainNode;

        return promise;
    }
}

if (getPref(Preferences.STREAM_TOUCH_CONTROLLER) === 'all') {
    TouchController.setup();
}

VibrationManager.initialSetup();

const nativeCreateDataChannel = RTCPeerConnection.prototype.createDataChannel;
RTCPeerConnection.prototype.createDataChannel = function() {
    const dataChannel = nativeCreateDataChannel.apply(this, arguments);

    BxEvent.dispatch(window, BxEvent.DATA_CHANNEL_CREATED, {
            dataChannel: dataChannel,
        });

    return dataChannel;
}

const OrgRTCPeerConnection = window.RTCPeerConnection;
window.RTCPeerConnection = function() {
    STREAM_WEBRTC = new OrgRTCPeerConnection();

    STREAM_WEBRTC.addEventListener('connectionstatechange', e => {
            if (STREAM_WEBRTC.connectionState === 'connecting') {
                STREAM_AUDIO_GAIN_NODE = null;
            }
            console.log('connectionState', STREAM_WEBRTC.connectionState);
        });
    return STREAM_WEBRTC;
}

patchRtcCodecs();
interceptHttpRequests();
patchVideoApi();

// Setup UI
addCss();
Toast.setup();
ENABLE_PRELOAD_BX_UI && setupBxUi();

disablePwa();

/*
if (getPref(Preferences.CONTROLLER_ENABLE_SHORTCUTS)) {
    GamepadHandler.initialSetup();
}
*/

Patcher.initialize();

RemotePlay.detect();

StreamBadges.setupEvents();
StreamStats.setupEvents();
MkbHandler.setupEvents();

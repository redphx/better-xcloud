// ==UserScript==
// @name         Better xCloud
// @namespace    https://github.com/redphx
// @version      3.1.6
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

const SCRIPT_VERSION = '3.1.6';
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

        let locale = localStorage.getItem('better_xcloud_locale');
        if (!locale) {
            locale = window.navigator.language || 'en-US';
            if (supportedLocales.indexOf(locale) === -1) {
                locale = 'en-US';
            }
            localStorage.setItem('better_xcloud_locale', locale);
        }

        return locale;
    },

    get: (key, values) => {
        const texts = Translations[key] || alert(`Missing translation key: ${key}`);
        const translation = texts[LOCALE] || texts['en-US'];

        return values ? translation(values) : translation;
    },

    "activate": {
        "de-DE": "Aktivieren",
        "en-US": "Activate",
        "es-ES": "Activo",
        "ja-JP": "設定する",
        "ko-KR": "활성화",
        "pl-PL": "Aktywuj",
        "pt-BR": "Ativar",
        "ru-RU": "Активировать",
        "tr-TR": "Etkinleştir",
        "uk-UA": "Активувати",
        "vi-VN": "Kích hoạt",
        "zh-CN": "启用",
    },
    "activated": {
        "de-DE": "Aktiviert",
        "en-US": "Activated",
        "es-ES": "Activado",
        "ja-JP": "設定中",
        "ko-KR": "활성화 됨",
        "pl-PL": "Aktywowane",
        "pt-BR": "Ativado",
        "ru-RU": "Активирован",
        "tr-TR": "Etkin",
        "uk-UA": "Активований",
        "vi-VN": "Đã kích hoạt",
        "zh-CN": "已启用",
    },
    "active": {
        "de-DE": "Aktiv",
        "en-US": "Active",
        "es-ES": "Activo",
        "ja-JP": "有効",
        "ko-KR": "활성화",
        "pl-PL": "Aktywny",
        "pt-BR": "Ativo",
        "ru-RU": "Активный",
        "tr-TR": "Etkin",
        "uk-UA": "Активний",
        "vi-VN": "Hoạt động",
        "zh-CN": "已启用",
    },
    "advanced": {
        "de-DE": "Erweitert",
        "en-US": "Advanced",
        "es-ES": "Avanzado",
        "fr-FR": "Options avancées",
        "it-IT": "Avanzate",
        "ja-JP": "高度な設定",
        "ko-KR": "고급",
        "pl-PL": "Zaawansowane",
        "pt-BR": "Avançado",
        "ru-RU": "Продвинутые",
        "tr-TR": "Gelişmiş ayarlar",
        "uk-UA": "Розширені",
        "vi-VN": "Nâng cao",
        "zh-CN": "高级选项",
    },
    "apply": {
        "de-DE": "Anwenden",
        "en-US": "Apply",
        "es-ES": "Aplicar",
        "ja-JP": "適用",
        "pl-PL": "Zastosuj",
        "pt-BR": "Aplicar",
        "ru-RU": "Применить",
        "tr-TR": "Uygula",
        "uk-UA": "Застосувати",
        "vi-VN": "Áp dụng",
        "zh-CN": "应用",
    },
    "audio": {
        "de-DE": "Audio",
        "en-US": "Audio",
        "es-ES": "Audio",
        "fr-FR": "Audio",
        "it-IT": "Audio",
        "ja-JP": "音声",
        "ko-KR": "오디오",
        "pl-PL": "Dźwięk",
        "pt-BR": "Áudio",
        "ru-RU": "Звук",
        "tr-TR": "Ses",
        "uk-UA": "Звук",
        "vi-VN": "Âm thanh",
        "zh-CN": "音频",
    },
    "auto": {
        "de-DE": "Automatisch",
        "en-US": "Auto",
        "es-ES": "Auto",
        "fr-FR": "Auto",
        "it-IT": "Automatico",
        "ja-JP": "自動",
        "ko-KR": "자동",
        "pl-PL": "Automatyczne",
        "pt-BR": "Automático",
        "ru-RU": "Автоматически",
        "tr-TR": "Otomatik",
        "uk-UA": "Автоматично",
        "vi-VN": "Tự động",
        "zh-CN": "自动",
    },
    "badge-audio": {
        "de-DE": "Audio",
        "en-US": "Audio",
        "es-ES": "Audio",
        "fr-FR": "Audio",
        "it-IT": "Audio",
        "ja-JP": "音声",
        "ko-KR": "오디오",
        "pl-PL": "Dźwięk",
        "pt-BR": "Áudio",
        "ru-RU": "Звук",
        "tr-TR": "Ses",
        "uk-UA": "Звук",
        "vi-VN": "Tiếng",
        "zh-CN": "音频",
    },
    "badge-battery": {
        "de-DE": "Batterie",
        "en-US": "Battery",
        "es-ES": "Batería",
        "fr-FR": "Batterie",
        "it-IT": "Batteria",
        "ja-JP": "バッテリー",
        "ko-KR": "배터리",
        "pl-PL": "Bateria",
        "pt-BR": "Bateria",
        "ru-RU": "Батарея",
        "tr-TR": "Pil",
        "uk-UA": "Батарея",
        "vi-VN": "Pin",
        "zh-CN": "电量",
    },
    "badge-in": {
        "de-DE": "Empfangen",
        "en-US": "In",
        "es-ES": "Entrada",
        "fr-FR": "Dans",
        "it-IT": "DL",
        "ja-JP": "IN",
        "ko-KR": "다운로드",
        "pl-PL": "Pobieranie",
        "pt-BR": "Recebidos",
        "ru-RU": "Входящие",
        "tr-TR": "Gelen",
        "uk-UA": "Завантаження",
        "vi-VN": "Nhận",
        "zh-CN": "下载",
    },
    "badge-out": {
        "de-DE": "Gesendet",
        "en-US": "Out",
        "es-ES": "Salida",
        "fr-FR": "Sorti",
        "it-IT": "UP",
        "ja-JP": "OUT",
        "ko-KR": "업로드",
        "pl-PL": "Wysyłanie",
        "pt-BR": "Enviados",
        "ru-RU": "Исходящие",
        "tr-TR": "Giden",
        "uk-UA": "Вивантаження",
        "vi-VN": "Gởi",
        "zh-CN": "上传",
    },
    "badge-playtime": {
        "de-DE": "Spielzeit",
        "en-US": "Playtime",
        "es-ES": "Tiempo jugado",
        "fr-FR": "Temps de jeu",
        "it-IT": "In gioco da",
        "ja-JP": "プレイ時間",
        "ko-KR": "플레이한 시간",
        "pl-PL": "Czas gry",
        "pt-BR": "Tempo de jogo",
        "ru-RU": "Время в игре",
        "tr-TR": "Oynanış süresi",
        "uk-UA": "Час гри",
        "vi-VN": "Giờ chơi",
        "zh-CN": "游玩时间",
    },
    "badge-server": {
        "de-DE": "Server",
        "en-US": "Server",
        "es-ES": "Servidor",
        "fr-FR": "Serveur",
        "it-IT": "Server",
        "ja-JP": "サーバー",
        "ko-KR": "서버",
        "pl-PL": "Serwer",
        "pt-BR": "Servidor",
        "ru-RU": "Сервер",
        "tr-TR": "Sunucu",
        "uk-UA": "Сервер",
        "vi-VN": "Máy chủ",
        "zh-CN": "服务器",
    },
    "badge-video": {
        "de-DE": "Video",
        "en-US": "Video",
        "es-ES": "Video",
        "fr-FR": "Vidéo",
        "it-IT": "Video",
        "ja-JP": "映像",
        "ko-KR": "비디오",
        "pl-PL": "Obraz",
        "pt-BR": "Vídeo",
        "ru-RU": "Видео",
        "tr-TR": "Görüntü",
        "uk-UA": "Відео",
        "vi-VN": "Hình",
        "zh-CN": "视频",
    },
    "bottom-left": {
        "de-DE": "Unten links",
        "en-US": "Bottom-left",
        "es-ES": "Inferior izquierdo",
        "fr-FR": "En bas à gauche",
        "it-IT": "In basso a sinistra",
        "ja-JP": "左下",
        "ko-KR": "좌측 하단",
        "pl-PL": "Lewy dolny róg",
        "pt-BR": "Inferior Esquerdo",
        "ru-RU": "Левый нижний угол",
        "tr-TR": "Sol alt",
        "uk-UA": "Внизу ліворуч",
        "vi-VN": "Phía dưới bên trái",
        "zh-CN": "左下角",
    },
    "bottom-right": {
        "de-DE": "Unten rechts",
        "en-US": "Bottom-right",
        "es-ES": "Inferior derecha",
        "fr-FR": "Bas-droit",
        "it-IT": "In basso a destra",
        "ja-JP": "右下",
        "ko-KR": "우측 하단",
        "pl-PL": "Prawy dolny róg",
        "pt-BR": "Inferior-direito",
        "ru-RU": "Правый нижний угол",
        "tr-TR": "Sağ alt",
        "uk-UA": "Внизу праворуч",
        "vi-VN": "Phía dưới bên phải",
        "zh-CN": "右下角",
    },
    "brightness": {
        "de-DE": "Helligkeit",
        "en-US": "Brightness",
        "es-ES": "Brillo",
        "fr-FR": "Luminosité",
        "it-IT": "Luminosità",
        "ja-JP": "輝度",
        "ko-KR": "밝기",
        "pl-PL": "Jasność",
        "pt-BR": "Brilho",
        "ru-RU": "Яркость",
        "tr-TR": "Aydınlık",
        "uk-UA": "Яскравість",
        "vi-VN": "Độ sáng",
        "zh-CN": "亮度",
    },
    "browser-unsupported-feature": {
        "de-DE": "Dein Browser unterstützt diese Funktion nicht",
        "en-US": "Your browser doesn't support this feature",
        "es-ES": "Su navegador no soporta esta característica",
        "fr-FR": "Votre navigateur ne supporte pas cette fonctionnalité",
        "it-IT": "Il tuo browser non supporta questa funzione",
        "ja-JP": "お使いのブラウザはこの機能をサポートしていません。",
        "ko-KR": "브라우저에서 이 기능을 지원하지 않습니다.",
        "pl-PL": "Twoja przeglądarka nie obsługuje tej funkcji",
        "pt-BR": "Seu navegador não suporta este recurso",
        "ru-RU": "Ваш браузер не поддерживает эту функцию",
        "tr-TR": "Web tarayıcınız bu özelliği desteklemiyor",
        "uk-UA": "Ваш браузер не підтримує цю функцію",
        "vi-VN": "Trình duyệt không hỗ trợ tính năng này",
        "zh-CN": "您的浏览器不支持此功能",
    },
    "can-stream-xbox-360-games": {
        "de-DE": "Kann Xbox 360 Spiele streamen",
        "en-US": "Can stream Xbox 360 games",
        "es-ES": "Puede transmitir juegos de Xbox 360",
        "it-IT": "Puoi riprodurre i giochi Xbox 360",
        "ja-JP": "Xbox 360ゲームのストリーミング可能",
        "ko-KR": "Xbox 360 게임 스트림 가능",
        "pl-PL": "Można strumieniować gry Xbox 360",
        "pt-BR": "Pode transmitir jogos de Xbox 360",
        "ru-RU": "Позволяет транслировать Xbox 360 игры",
        "tr-TR": "Xbox 360 oyunlarına erişim sağlanabilir",
        "uk-UA": "Дозволяє транслювати ігри Xbox 360",
        "vi-VN": "Có thể stream các game Xbox 360",
        "zh-CN": "可以进行流式传输Xbox360游戏",
    },
    "cancel": {
        "de-DE": "Abbrechen",
        "en-US": "Cancel",
        "es-ES": "Cancelar",
        "ja-JP": "キャンセル",
        "ko-KR": "취소",
        "pl-PL": "Anuluj",
        "pt-BR": "Cancelar",
        "ru-RU": "Отмена",
        "tr-TR": "Vazgeç",
        "uk-UA": "Скасувати",
        "vi-VN": "Hủy",
        "zh-CN": "取消",
    },
    "cant-stream-xbox-360-games": {
        "de-DE": "Kann Xbox 360 Spiele nicht streamen",
        "en-US": "Can't stream Xbox 360 games",
        "es-ES": "No puede transmitir juegos de Xbox 360",
        "it-IT": "Impossibile riprodurre i giochi Xbox 360",
        "ja-JP": "Xbox 360ゲームのストリーミング不可",
        "ko-KR": "Xbox 360 게임 스트림 불가",
        "pl-PL": "Nie można strumieniować gier Xbox 360",
        "pt-BR": "Não pode transmitir jogos de Xbox 360",
        "ru-RU": "Невозможно транслировать игры Xbox 360",
        "tr-TR": "Xbox 360 oyunlarına erişim sağlanamaz",
        "uk-UA": "Не дозволяє транслювати ігри Xbox 360",
        "vi-VN": "Không thể stream các game Xbox 360",
        "zh-CN": "不可以进行流式传输Xbox360游戏",
    },
    "clarity": {
        "de-DE": "Klarheit",
        "en-US": "Clarity",
        "es-ES": "Claridad",
        "fr-FR": "Clarté",
        "it-IT": "Nitidezza",
        "ja-JP": "明瞭度（クラリティ）",
        "ko-KR": "선명도",
        "pl-PL": "Ostrość",
        "pt-BR": "Clareza",
        "ru-RU": "Чёткость",
        "tr-TR": "Netlik",
        "uk-UA": "Чіткість",
        "vi-VN": "Độ nét",
        "zh-CN": "清晰度",
    },
    "clarity-boost-warning": {
        "de-DE": "Diese Einstellungen funktionieren nicht, wenn \"Clarity Boost\" aktiviert ist",
        "en-US": "These settings don't work when the Clarity Boost mode is ON",
        "es-ES": "Estos ajustes no funcionan cuando el modo Clarity Boost está activado",
        "fr-FR": "Ces paramètres ne fonctionnent pas lorsque le mode Clarity Boost est activé",
        "it-IT": "Queste impostazioni non funzionano quando la modalità Clarity Boost è attiva",
        "ja-JP": "クラリティブーストが有効の場合、映像設定は無効化されます。",
        "ko-KR": "이 설정들은 선명도 향상 기능이 켜져 있을 때는 동작하지 않습니다.",
        "pl-PL": "Te ustawienia nie będą działać, gdy tryb \"Clarity Boost\" jest włączony",
        "pt-BR": "Estas configurações não funcionam quando o modo \"Clarity Boost\" está ATIVADO",
        "ru-RU": "Эти настройки не работают, когда включен режим Clarity Boost",
        "tr-TR": "Netliği Artırma modu açıkken bu ayarlar ETKİSİZDİR",
        "uk-UA": "Ці налаштування не працюють, коли увімкнено режим \"Clarity Boost\"",
        "vi-VN": "Các tùy chỉnh này không hoạt động khi chế độ Clarity Boost đang được bật",
        "zh-CN": "这些设置在 Clarity Boost 清晰度增强 开启时不可用",
    },
    "clear": {
        "de-DE": "Zurücksetzen",
        "en-US": "Clear",
        "es-ES": "Borrar",
        "ja-JP": "消去",
        "ko-KR": "비우기",
        "pl-PL": "Wyczyść",
        "pt-BR": "Limpar",
        "ru-RU": "Очистить",
        "tr-TR": "Temizle",
        "uk-UA": "Очистити",
        "vi-VN": "Xóa",
        "zh-CN": "清空",
    },
    "close": {
        "de-DE": "Schließen",
        "en-US": "Close",
        "es-ES": "Cerrar",
        "fr-FR": "Fermer",
        "it-IT": "Chiudi",
        "ja-JP": "閉じる",
        "ko-KR": "닫기",
        "pl-PL": "Zamknij",
        "pt-BR": "Fechar",
        "ru-RU": "Закрыть",
        "tr-TR": "Kapat",
        "uk-UA": "Закрити",
        "vi-VN": "Đóng",
        "zh-CN": "关闭",
    },
    "conditional-formatting": {
        "de-DE": "Zustandsabhängige Textfarbe",
        "en-US": "Conditional formatting text color",
        "es-ES": "Color condicional de formato de texto",
        "fr-FR": "Couleur du texte de mise en forme conditionnelle",
        "it-IT": "Colore testo formattazione condizionale",
        "ja-JP": "状態に応じた文字色で表示",
        "ko-KR": "통계에 따라 글자 색 지정",
        "pl-PL": "Kolor tekstu zależny od wartości",
        "pt-BR": "Cor do texto de formatação condicional",
        "ru-RU": "Цвет текста в зависимости от условий",
        "tr-TR": "Metin renginin koşullu biçimlendirilmesi",
        "uk-UA": "Колір тексту в залежності від умов",
        "vi-VN": "Thay đổi màu chữ tùy theo giá trị",
        "zh-CN": "更改文本颜色",
    },
    "confirm-delete-preset": {
        "de-DE": "Möchtest Du diese Voreinstellung löschen?",
        "en-US": "Do you want to delete this preset?",
        "es-ES": "¿Desea eliminar este preajuste?",
        "ja-JP": "このプリセットを削除しますか？",
        "ko-KR": "이 프리셋을 삭제하시겠습니까?",
        "pl-PL": "Czy na pewno chcesz usunąć ten szablon?",
        "pt-BR": "Você quer excluir esta predefinição?",
        "ru-RU": "Вы точно хотите удалить этот шаблон?",
        "tr-TR": "Bu hazır ayarı silmek istiyor musunuz?",
        "uk-UA": "Ви бажаєте видалити цей пресет?",
        "vi-VN": "Bạn có muốn xoá thiết lập sẵn này không?",
        "zh-CN": "您想要删除此预设吗？",
    },
    "confirm-reload-stream": {
        "de-DE": "Möchtest Du den Stream aktualisieren?",
        "en-US": "Do you want to refresh the stream?",
        "es-ES": "¿Quieres actualizar el stream?\n",
        "fr-FR": "Voulez-vous actualiser le stream ?",
        "it-IT": "Vuoi aggiornare lo stream?",
        "ja-JP": "ストリーミングをリフレッシュしますか？",
        "ko-KR": "스트리밍을 재시작할까요?",
        "pl-PL": "Czy chcesz odświeżyć transmisję?",
        "pt-BR": "Você deseja atualizar a transmissão?",
        "ru-RU": "Вы хотите перезапустить поток?",
        "tr-TR": "Yayını yeniden başlatmak istiyor musunuz?",
        "uk-UA": "Бажаєте оновити трансляцію?",
        "vi-VN": "Bạn có muốn kết nối lại stream không?",
        "zh-CN": "您想要刷新吗？",
    },
    "console-connect": {
        "de-DE": "Verbinden",
        "en-US": "Connect",
        "es-ES": "Conectar",
        "it-IT": "Connetti",
        "ja-JP": "本体に接続",
        "ko-KR": "콘솔 연결",
        "pl-PL": "Połącz",
        "pt-BR": "Conectar",
        "ru-RU": "Подключиться",
        "tr-TR": "Bağlan",
        "uk-UA": "Під’єднатися",
        "vi-VN": "Kết nối",
        "zh-CN": "连接",
    },
    "contrast": {
        "de-DE": "Kontrast",
        "en-US": "Contrast",
        "es-ES": "Contraste",
        "fr-FR": "Contraste",
        "it-IT": "Contrasto",
        "ja-JP": "コントラスト",
        "ko-KR": "대비",
        "pl-PL": "Kontrast",
        "pt-BR": "Contraste",
        "ru-RU": "Контрастность",
        "tr-TR": "Karşıtlık",
        "uk-UA": "Контрастність",
        "vi-VN": "Độ tương phản",
        "zh-CN": "对比度",
    },
    "controller": {
        "de-DE": "Controller",
        "en-US": "Controller",
        "es-ES": "Joystick",
        "it-IT": "Controller",
        "ja-JP": "コントローラー",
        "ko-KR": "컨트롤러",
        "pl-PL": "Kontroler",
        "pt-BR": "Controle",
        "ru-RU": "Контроллер",
        "tr-TR": "Oyun Kumandası",
        "uk-UA": "Контролер",
        "vi-VN": "Bộ điều khiển",
        "zh-CN": "手柄",
    },
    "controller-vibration": {
        "de-DE": "Vibration des Controllers",
        "en-US": "Controller vibration",
        "es-ES": "Vibración del mando",
        "ja-JP": "コントローラーの振動",
        "ko-KR": "컨트롤러 진동",
        "pl-PL": "Wibracje kontrolera",
        "pt-BR": "Vibração do controle",
        "ru-RU": "Вибрация контроллера",
        "tr-TR": "Oyun kumandası titreşimi",
        "uk-UA": "Вібрація контролера",
        "vi-VN": "Rung bộ điều khiển",
        "zh-CN": "控制器振动",
    },
    "copy": {
        "de-DE": "Kopieren",
        "en-US": "Copy",
        "es-ES": "Copiar",
        "ja-JP": "コピー",
        "ko-KR": "복사",
        "pl-PL": "Kopiuj",
        "pt-BR": "Copiar",
        "ru-RU": "Скопировать",
        "tr-TR": "Kopyala",
        "uk-UA": "Копіювати",
        "vi-VN": "Sao chép",
        "zh-CN": "复制",
    },
    "custom": {
        "de-DE": "Benutzerdefiniert",
        "en-US": "Custom",
        "es-ES": "Personalizado",
        "fr-FR": "Personnalisée",
        "it-IT": "Personalizzato",
        "ja-JP": "カスタム",
        "ko-KR": "사용자 지정",
        "pl-PL": "Niestandardowe",
        "pt-BR": "Customizado",
        "ru-RU": "Вручную",
        "tr-TR": "Özel",
        "uk-UA": "Користувацькі",
        "vi-VN": "Tùy chỉnh",
        "zh-CN": "自定义",
    },
    "deadzone-counterweight": {
        "de-DE": "Deadzone Gegengewicht",
        "en-US": "Deadzone counterweight",
        "es-ES": "Contrapeso de la zona muerta",
        "ja-JP": "デッドゾーンのカウンターウエイト",
        "pl-PL": "Przeciwwaga martwej strefy",
        "pt-BR": "Contador da Zona Morta",
        "ru-RU": "Противодействие мертвой зоне игры",
        "tr-TR": "Ölü alan denge ağırlığı",
        "uk-UA": "Противага Deadzone",
        "vi-VN": "Đối trọng vùng chết",
        "zh-CN": "死区补偿",
    },
    "default": {
        "de-DE": "Standard",
        "en-US": "Default",
        "es-ES": "Por defecto",
        "fr-FR": "Par défaut",
        "it-IT": "Predefinito",
        "ja-JP": "デフォルト",
        "ko-KR": "기본값",
        "pl-PL": "Domyślny",
        "pt-BR": "Padrão",
        "ru-RU": "По умолчанию",
        "tr-TR": "Varsayılan",
        "uk-UA": "За замовчуванням",
        "vi-VN": "Mặc định",
        "zh-CN": "默认",
    },
    "delete": {
        "de-DE": "Löschen",
        "en-US": "Delete",
        "es-ES": "Borrar",
        "ja-JP": "削除",
        "ko-KR": "삭제",
        "pl-PL": "Usuń",
        "pt-BR": "Deletar",
        "ru-RU": "Удалить",
        "tr-TR": "Sil",
        "uk-UA": "Видалити",
        "vi-VN": "Xóa",
        "zh-CN": "删除",
    },
    "device-unsupported-touch": {
        "de-DE": "Dein Gerät hat keine Touch-Unterstützung",
        "en-US": "Your device doesn't have touch support",
        "es-ES": "Tu dispositivo no tiene soporte táctil",
        "fr-FR": "Votre appareil n'a pas de support tactile",
        "it-IT": "Il tuo dispositivo non ha uno schermo touch",
        "ja-JP": "お使いのデバイスはタッチ機能をサポートしていません。",
        "ko-KR": "브라우저에서 터치를 지원하지 않습니다.",
        "pl-PL": "Twoje urządzenie nie obsługuję tej funkcji",
        "pt-BR": "Seu dispositivo não possui suporte de toque",
        "ru-RU": "Ваше устройство не поддерживает сенсорное управление",
        "tr-TR": "Cihazınızda dokunmatik ekran özelliği yoktur",
        "uk-UA": "Ваш пристрій не має підтримки сенсорного керування",
        "vi-VN": "Thiết bị này không hỗ trợ cảm ứng",
        "zh-CN": "您的设备不支持触摸",
    },
    "device-vibration": {
        "de-DE": "Vibration des Geräts",
        "en-US": "Device vibration",
        "es-ES": "Vibración del dispositivo",
        "ja-JP": "デバイスの振動",
        "ko-KR": "기기 진동",
        "pl-PL": "Wibracje urządzenia",
        "pt-BR": "Vibração do dispositivo",
        "ru-RU": "Вибрация устройства",
        "tr-TR": "Cihaz titreşimi",
        "uk-UA": "Вібрація пристрою",
        "vi-VN": "Rung thiết bị",
        "zh-CN": "设备振动",
    },
    "device-vibration-not-using-gamepad": {
        "de-DE": "An, wenn kein Gamepad verbunden",
        "en-US": "On when not using gamepad",
        "es-ES": "Activado cuando no se utiliza el mando",
        "ja-JP": "ゲームパッド未使用時にオン",
        "ko-KR": "게임패드를 사용하지 않을 때",
        "pl-PL": "Włączone, gdy nie używasz kontrolera",
        "pt-BR": "Ativar quando não estiver usando o dispositivo",
        "ru-RU": "Включить когда не используется геймпад",
        "tr-TR": "Oyun kumandası bağlanmadan titreşim",
        "uk-UA": "Увімкнена, коли не використовується геймпад",
        "vi-VN": "Bật khi không dùng tay cầm",
        "zh-CN": "当不使用游戏手柄时",
    },
    "disable": {
        "de-DE": "Deaktiviert",
        "en-US": "Disable",
        "es-ES": "Deshabilitar",
        "fr-FR": "Désactiver",
        "it-IT": "Disabilita",
        "ja-JP": "無効",
        "ko-KR": "비활성화",
        "pl-PL": "Wyłącz",
        "pt-BR": "Desabilitar",
        "ru-RU": "Отключить",
        "tr-TR": "Devre dışı bırak",
        "uk-UA": "Вимкнути",
        "vi-VN": "Vô hiệu hóa",
        "zh-CN": "禁用",
    },
    "disable-post-stream-feedback-dialog": {
        "de-DE": "Feedback-Dialog beim Beenden deaktivieren",
        "en-US": "Disable post-stream feedback dialog",
        "es-ES": "Desactivar diálogo de retroalimentación post-stream",
        "fr-FR": "Désactiver la boîte de dialogue de commentaires post-stream",
        "it-IT": "Disabilita la finestra di feedback al termine dello stream",
        "ja-JP": "ストリーミング終了後のフィードバック画面を非表示",
        "ko-KR": "스트림 후 피드백 다이얼 비활성화",
        "pl-PL": "Wyłącz okno opinii po zakończeniu transmisji",
        "pt-BR": "Desativar o diálogo de comentários pós-transmissão",
        "ru-RU": "Отключить диалог обратной связи после стрима",
        "tr-TR": "Yayın sonrası geribildirim ekranını kapat",
        "uk-UA": "Відключити діалогове вікно зворотного зв’язку після трансляції",
        "vi-VN": "Tắt hộp thoại góp ý sau khi chơi xong",
        "zh-CN": "禁用反馈问卷",
    },
    "disable-social-features": {
        "de-DE": "Soziale Funktionen deaktivieren",
        "en-US": "Disable social features",
        "es-ES": "Desactivar características sociales",
        "fr-FR": "Désactiver les fonctionnalités sociales",
        "it-IT": "Disabilita le funzioni social",
        "ja-JP": "ソーシャル機能を無効",
        "ko-KR": "소셜 기능 비활성화",
        "pl-PL": "Wyłącz funkcje społecznościowe",
        "pt-BR": "Desativar recursos sociais",
        "ru-RU": "Отключить социальные функции",
        "tr-TR": "Sosyal özellikleri kapat",
        "uk-UA": "Вимкнути соціальні функції",
        "vi-VN": "Khóa các tính năng xã hội",
        "zh-CN": "禁用社交功能",
    },
    "disable-xcloud-analytics": {
        "de-DE": "xCloud-Datenanalyse deaktivieren",
        "en-US": "Disable xCloud analytics",
        "es-ES": "Desactivar análisis de xCloud",
        "fr-FR": "Désactiver les analyses xCloud",
        "it-IT": "Disabilita l'analitica di xCloud",
        "ja-JP": "xCloudアナリティクスを無効",
        "ko-KR": "xCloud 통계 비활성화",
        "pl-PL": "Wyłącz analitykę xCloud",
        "pt-BR": "Desativar telemetria do xCloud",
        "ru-RU": "Отключить аналитику xCloud",
        "tr-TR": "xCloud'un veri toplamasını devre dışı bırak",
        "uk-UA": "Вимкнути аналітику xCloud",
        "vi-VN": "Khóa phân tích thông tin của xCloud",
        "zh-CN": "关闭 xCloud 遥测数据统计",
    },
    "disabled": {
        "de-DE": "Deaktiviert",
        "en-US": "Disabled",
        "es-ES": "Desactivado",
        "ja-JP": "無効",
        "ko-KR": "비활성화됨",
        "pl-PL": "Wyłączony",
        "pt-BR": "Desativado",
        "ru-RU": "Отключено",
        "tr-TR": "Kapalı",
        "uk-UA": "Вимкнено",
        "vi-VN": "Đã tắt",
        "zh-CN": "禁用",
    },
    "edit": {
        "de-DE": "Bearbeiten",
        "en-US": "Edit",
        "es-ES": "Editar",
        "ja-JP": "編集",
        "ko-KR": "편집",
        "pl-PL": "Edytuj",
        "pt-BR": "Editar",
        "ru-RU": "Редактировать",
        "tr-TR": "Düzenle",
        "uk-UA": "Редагувати",
        "vi-VN": "Sửa",
        "zh-CN": "编辑",
    },
    "enable-controller-shortcuts": {
        "de-DE": "Controller-Shortcuts aktivieren",
        "en-US": "Enable controller shortcuts",
        "es-ES": "Habilitar accesos directos del Joystick",
        "it-IT": "Consenti scorciatoie da controller",
        "ja-JP": "コントローラーショートカットを有効化",
        "ko-KR": "컨트롤러 숏컷 활성화",
        "pl-PL": "Włącz skróty kontrolera",
        "pt-BR": "Ativar atalhos do controle",
        "ru-RU": "Включить быстрые клавиши контроллера",
        "tr-TR": "Oyun kumandası kısayollarını aç",
        "uk-UA": "Увімкнути ярлики контролера",
        "vi-VN": "Bật tính năng phím tắt cho bộ điều khiển",
        "zh-CN": "启用手柄快捷方式",
    },
    "enable-mic-on-startup": {
        "de-DE": "Mikrofon bei Spielstart aktivieren",
        "en-US": "Enable microphone on game launch",
        "es-ES": "Activar micrófono al iniciar el juego",
        "fr-FR": "Activer le microphone lors du lancement du jeu",
        "it-IT": "Abilita il microfono all'avvio del gioco",
        "ja-JP": "ゲーム起動時にマイクを有効化",
        "ko-KR": "게임 시작 시 마이크 활성화",
        "pl-PL": "Włącz mikrofon przy uruchomieniu gry",
        "pt-BR": "Ativar microfone ao iniciar um jogo",
        "ru-RU": "Автоматически включать микрофон при запуске игры",
        "tr-TR": "Oyun başlarken mikrofonu aç",
        "uk-UA": "Увімкнути мікрофон при запуску гри",
        "vi-VN": "Bật mic lúc vào game",
        "zh-CN": "游戏启动时打开麦克风",
    },
    "enable-mkb": {
        "de-DE": "Maus- und Tastaturunterstützung aktivieren",
        "en-US": "Enable Mouse & Keyboard support",
        "es-ES": "Habilitar soporte para ratón y teclado",
        "it-IT": "Abilitare il supporto di mouse e tastiera",
        "ja-JP": "マウス＆キーボードのサポートを有効化",
        "ko-KR": "마우스 & 키보드 활성화",
        "pl-PL": "Włącz obsługę myszy i klawiatury",
        "pt-BR": "Habilitar suporte ao Mouse & Teclado",
        "ru-RU": "Включить поддержку мыши и клавиатуры",
        "tr-TR": "Klavye ve fare desteğini aktive et",
        "uk-UA": "Увімкнути підтримку миші та клавіатури",
        "vi-VN": "Kích hoạt hỗ trợ Chuột & Bàn phím",
        "zh-CN": "启用鼠标和键盘支持",
    },
    "enable-quick-glance-mode": {
        "de-DE": "\"Kurzer Blick\"-Modus aktivieren",
        "en-US": "Enable \"Quick Glance\" mode",
        "es-ES": "Activar modo \"Vista rápida\"",
        "fr-FR": "Activer le mode \"Aperçu rapide\"",
        "it-IT": "Abilita la modalità Quick Glance",
        "ja-JP": "クイック確認モードを有効化",
        "ko-KR": "\"퀵 글랜스\" 모드 활성화",
        "pl-PL": "Włącz tryb \"Quick Glance\"",
        "pt-BR": "Ativar modo \"Relance\"",
        "ru-RU": "Включить режим «Быстрый взгляд»",
        "tr-TR": "\"Seri Bakış\" modunu aç",
        "uk-UA": "Увімкнути режим \"Quick Glance\"",
        "vi-VN": "Bật chế độ \"Xem nhanh\"",
        "zh-CN": "仅在打开设置时显示统计信息",
    },
    "enable-remote-play-feature": {
        "de-DE": "\"Remote Play\" Funktion aktivieren",
        "en-US": "Enable the \"Remote Play\" feature",
        "es-ES": "Activar la función \"Reproducción remota\"",
        "it-IT": "Abilitare la funzione \"Riproduzione remota\"",
        "ja-JP": "リモートプレイ機能を有効化",
        "ko-KR": "\"리모트 플레이\" 기능 활성화",
        "pl-PL": "Włącz funkcję \"Gra zdalna\"",
        "pt-BR": "Ativar o recurso \"Reprodução Remota\"",
        "ru-RU": "Включить функцию «Удаленная игра»",
        "tr-TR": "\"Uzaktan Oynama\" özelliğini aktive et",
        "uk-UA": "Увімкнути функцію \"Remote Play\"",
        "vi-VN": "Bật tính năng \"Chơi Từ Xa\"",
        "zh-CN": "启用\"远程播放\"功能",
    },
    "enable-volume-control": {
        "de-DE": "Lautstärkeregelung aktivieren",
        "en-US": "Enable volume control feature",
        "es-ES": "Habilitar la función de control de volumen",
        "fr-FR": "Activer la fonction de contrôle du volume",
        "it-IT": "Abilità controlli volume",
        "ja-JP": "音量調節機能を有効化",
        "ko-KR": "음량 조절 기능 활성화",
        "pl-PL": "Włącz funkcję kontroli głośności",
        "pt-BR": "Ativar recurso de controle de volume",
        "ru-RU": "Включить управление громкостью",
        "tr-TR": "Ses düzeyini yönetmeyi etkinleştir",
        "uk-UA": "Увімкнути функцію керування гучністю",
        "vi-VN": "Bật tính năng điều khiển âm lượng",
        "zh-CN": "启用音量控制",
    },
    "enabled": {
        "de-DE": "Aktiviert",
        "en-US": "Enabled",
        "es-ES": "Activado",
        "ja-JP": "有効",
        "ko-KR": "활성화됨",
        "pl-PL": "Włączony",
        "pt-BR": "Ativado",
        "ru-RU": "Включено",
        "tr-TR": "Açık",
        "uk-UA": "Увімкнено",
        "vi-VN": "Đã bật",
        "zh-CN": "启用",
    },
    "export": {
        "de-DE": "Exportieren",
        "en-US": "Export",
        "es-ES": "Exportar",
        "ja-JP": "エクスポート（書出し）",
        "ko-KR": "내보내기",
        "pl-PL": "Eksportuj",
        "pt-BR": "Exportar",
        "ru-RU": "Экспортировать",
        "tr-TR": "Dışa aktar",
        "uk-UA": "Експорт",
        "vi-VN": "Xuất",
        "zh-CN": "导出",
    },
    "fast": {
        "de-DE": "Schnell",
        "en-US": "Fast",
        "es-ES": "Rápido",
        "it-IT": "Veloce",
        "ja-JP": "高速",
        "ko-KR": "빠름",
        "pl-PL": "Szybko",
        "pt-BR": "Rápido",
        "ru-RU": "Быстрый",
        "tr-TR": "Hızlı",
        "uk-UA": "Швидкий",
        "vi-VN": "Nhanh",
        "zh-CN": "快速",
    },
    "getting-consoles-list": {
        "de-DE": "Rufe Liste der Konsolen ab...",
        "en-US": "Getting the list of consoles...",
        "es-ES": "Obteniendo la lista de consolas...",
        "it-IT": "Ottenere la lista delle consoles...",
        "ja-JP": "本体のリストを取得中...",
        "ko-KR": "콘솔 목록 불러오는 중...",
        "pl-PL": "Pobieranie listy konsoli...",
        "pt-BR": "Obtendo a lista de consoles...",
        "ru-RU": "Получение списка консолей...",
        "tr-TR": "Konsol listesine erişiliyor...",
        "uk-UA": "Отримання списку консолей...",
        "vi-VN": "Đang lấy danh sách các console...",
        "zh-CN": "正在获取控制台列表...",
    },
    "help": {
        "de-DE": "Hilfe",
        "en-US": "Help",
        "es-ES": "Ayuda",
        "ja-JP": "ヘルプ",
        "pl-PL": "Pomoc",
        "pt-BR": "Ajuda",
        "ru-RU": "Справка",
        "tr-TR": "Yardım",
        "uk-UA": "Довідка",
        "vi-VN": "Trợ giúp",
        "zh-CN": "帮助",
    },
    "hide-idle-cursor": {
        "de-DE": "Mauszeiger bei Inaktivität ausblenden",
        "en-US": "Hide mouse cursor on idle",
        "es-ES": "Ocultar el cursor del ratón al estar inactivo",
        "fr-FR": "Masquer le curseur de la souris",
        "it-IT": "Nascondi il cursore previa inattività",
        "ja-JP": "マウスカーソルを3秒間動かしていない場合に非表示",
        "ko-KR": "대기 상태에서 마우스 커서 숨기기",
        "pl-PL": "Ukryj kursor myszy podczas bezczynności",
        "pt-BR": "Ocultar o cursor do mouse quando ocioso",
        "ru-RU": "Скрыть курсор мыши при бездействии",
        "tr-TR": "Boştayken fare imlecini gizle",
        "uk-UA": "Приховати курсор при очікуванні",
        "vi-VN": "Ẩn con trỏ chuột khi không di chuyển",
        "zh-CN": "空闲时隐藏鼠标",
    },
    "hide-system-menu-icon": {
        "de-DE": "Symbol des System-Menüs ausblenden",
        "en-US": "Hide System menu's icon",
        "es-ES": "Ocultar el icono del menú del sistema",
        "fr-FR": "Masquer l'icône du menu système",
        "it-IT": "Nascondi icona del menu a tendina",
        "ja-JP": "システムメニューのアイコンを非表示",
        "ko-KR": "시스템 메뉴 아이콘 숨기기",
        "pl-PL": "Ukryj ikonę menu systemu",
        "pt-BR": "Ocultar ícone do menu do Sistema",
        "ru-RU": "Скрыть значок системного меню",
        "tr-TR": "Sistem menüsü simgesini gizle",
        "uk-UA": "Приховати іконку системного меню",
        "vi-VN": "Ẩn biểu tượng của menu Hệ thống",
        "zh-CN": "隐藏系统菜单图标",
    },
    "horizontal-sensitivity": {
        "de-DE": "Horizontale Empfindlichkeit",
        "en-US": "Horizontal sensitivity",
        "es-ES": "Sensibilidad horizontal",
        "ja-JP": "左右方向の感度",
        "pl-PL": "Czułość pozioma",
        "pt-BR": "Sensibilidade horizontal",
        "ru-RU": "Горизонтальная чувствительность",
        "tr-TR": "Yatay hassasiyet",
        "uk-UA": "Горизонтальна чутливість",
        "vi-VN": "Độ nhạy ngang",
        "zh-CN": "水平灵敏度",
    },
    "import": {
        "de-DE": "Importieren",
        "en-US": "Import",
        "es-ES": "Importar",
        "ja-JP": "インポート（読込み）",
        "ko-KR": "가져오기",
        "pl-PL": "Importuj",
        "pt-BR": "Importar",
        "ru-RU": "Импортировать",
        "tr-TR": "İçeri aktar",
        "uk-UA": "Імпорт",
        "vi-VN": "Nhập",
        "zh-CN": "导入",
    },
    "language": {
        "de-DE": "Sprache",
        "en-US": "Language",
        "es-ES": "Idioma",
        "fr-FR": "Langue",
        "it-IT": "Lingua",
        "ja-JP": "言語",
        "ko-KR": "언어",
        "pl-PL": "Język",
        "pt-BR": "Linguagem",
        "ru-RU": "Язык",
        "tr-TR": "Dil",
        "uk-UA": "Мова",
        "vi-VN": "Ngôn ngữ",
        "zh-CN": "切换语言",
    },
    "large": {
        "de-DE": "Groß",
        "en-US": "Large",
        "es-ES": "Grande",
        "fr-FR": "Grande",
        "it-IT": "Grande",
        "ja-JP": "大",
        "ko-KR": "크게",
        "pl-PL": "Duży",
        "pt-BR": "Largo",
        "ru-RU": "Большой",
        "tr-TR": "Büyük",
        "uk-UA": "Великий",
        "vi-VN": "Lớn",
        "zh-CN": "大",
    },
    "layout": {
        "de-DE": "Layout",
        "en-US": "Layout",
        "es-ES": "Diseño",
        "it-IT": "Layout",
        "ja-JP": "レイアウト",
        "ko-KR": "레이아웃",
        "pl-PL": "Układ",
        "pt-BR": "Layout",
        "ru-RU": "Расположение",
        "tr-TR": "Arayüz Görünümü",
        "uk-UA": "Розмітка",
        "vi-VN": "Bố cục",
        "zh-CN": "布局",
    },
    "left-stick": {
        "de-DE": "Linker Stick",
        "en-US": "Left stick",
        "es-ES": "Joystick izquierdo",
        "ja-JP": "左スティック",
        "ko-KR": "왼쪽 스틱",
        "pl-PL": "Lewy drążek analogowy",
        "pt-BR": "Direcional analógico esquerdo",
        "ru-RU": "Левый стик",
        "tr-TR": "Sol analog çubuk",
        "uk-UA": "Лівий стік",
        "vi-VN": "Analog trái",
        "zh-CN": "左摇杆",
    },
    "loading-screen": {
        "de-DE": "Ladebildschirm",
        "en-US": "Loading screen",
        "es-ES": "Pantalla de carga",
        "fr-FR": "Écran de chargement",
        "it-IT": "Schermata di caricamento",
        "ja-JP": "ロード画面",
        "ko-KR": "로딩 화면",
        "pl-PL": "Ekran wczytywania",
        "pt-BR": "Tela de Carregamento",
        "ru-RU": "Экран загрузки",
        "tr-TR": "Yükleme ekranı",
        "uk-UA": "Екран завантаження",
        "vi-VN": "Màn hình chờ",
        "zh-CN": "载入画面",
    },
    "map-mouse-to": {
        "de-DE": "Maus binden an",
        "en-US": "Map mouse to",
        "es-ES": "Mapear ratón a",
        "ja-JP": "マウスの割り当て",
        "pl-PL": "Przypisz myszkę do",
        "pt-BR": "Mapear o mouse para",
        "ru-RU": "Наведите мышку на",
        "tr-TR": "Fareyi ata",
        "uk-UA": "Прив'язати мишу до",
        "vi-VN": "Gán chuột với",
        "zh-CN": "将鼠标映射到",
    },
    "may-not-work-properly": {
        "de-DE": "Funktioniert evtl. nicht fehlerfrei!",
        "en-US": "May not work properly!",
        "es-ES": "¡Puede que no funcione correctamente!",
        "it-IT": "Potrebbe non funzionare correttamente!",
        "ja-JP": "正常に動作しない場合があります！",
        "ko-KR": "제대로 작동하지 않을 수 있음!",
        "pl-PL": "Może nie działać poprawnie!",
        "pt-BR": "Pode não funcionar corretamente!",
        "ru-RU": "Может работать некорректно!",
        "tr-TR": "Düzgün çalışmayabilir!",
        "uk-UA": "Може працювати некоректно!",
        "vi-VN": "Có thể không hoạt động!",
        "zh-CN": "可能无法正常工作！",
    },
    "menu-stream-settings": {
        "de-DE": "Stream Einstellungen",
        "en-US": "Stream settings",
        "es-ES": "Ajustes del stream",
        "fr-FR": "Réglages Stream",
        "it-IT": "Impostazioni dello stream",
        "ja-JP": "ストリーミング設定",
        "ko-KR": "스트리밍 설정",
        "pl-PL": "Ustawienia strumienia",
        "pt-BR": "Ajustes de transmissão",
        "ru-RU": "Настройки потоковой передачи",
        "tr-TR": "Yayın ayarları",
        "uk-UA": "Налаштування трансляції",
        "vi-VN": "Cấu hình stream",
        "zh-CN": "串流设置",
    },
    "menu-stream-stats": {
        "de-DE": "Stream Statistiken",
        "en-US": "Stream stats",
        "es-ES": "Estadísticas del stream",
        "fr-FR": "Statistiques du stream",
        "it-IT": "Statistiche dello stream",
        "ja-JP": "ストリーミング統計情報",
        "ko-KR": "통계",
        "pl-PL": "Statystyki strumienia",
        "pt-BR": "Estatísticas da transmissão",
        "ru-RU": "Статистика стрима",
        "tr-TR": "Yayın durumu",
        "uk-UA": "Статистика трансляції",
        "vi-VN": "Thông số stream",
        "zh-CN": "串流统计数据",
    },
    "microphone": {
        "de-DE": "Mikrofon",
        "en-US": "Microphone",
        "es-ES": "Micrófono",
        "it-IT": "Microfono",
        "ja-JP": "マイク",
        "ko-KR": "마이크",
        "pl-PL": "Mikrofon",
        "pt-BR": "Microfone",
        "ru-RU": "Микрофон",
        "tr-TR": "Mikrofon",
        "uk-UA": "Мікрофон",
        "vi-VN": "Micro",
        "zh-CN": "麦克风",
    },
    "mkb-adjust-ingame-settings": {
        "de-DE": "Vielleicht müssen auch Empfindlichkeit & Deadzone in den Spieleinstellungen angepasst werden",
        "en-US": "You may also need to adjust the in-game sensitivity & deadzone settings",
        "es-ES": "También puede que necesites ajustar la sensibilidad del juego y la configuración de la zona muerta",
        "ja-JP": "ゲーム内の設定で感度とデッドゾーンの調整が必要な場合があります",
        "pl-PL": "Może być również konieczne dostosowanie czułości w grze i ustawienia 'martwej strefy' urządzenia",
        "pt-BR": "Você também pode precisar ajustar as configurações de sensibilidade e zona morta no jogo",
        "ru-RU": "Также может потребоваться изменить настройки чувствительности и мертвой зоны в игре",
        "tr-TR": "Bu seçenek etkinken bile oyun içi seçeneklerden hassasiyet ve ölü bölge ayarlarını düzeltmeniz gerekebilir",
        "uk-UA": "Можливо, вам також доведеться регулювати чутливість і deadzone у параметрах гри",
        "vi-VN": "Có thể bạn cần phải điều chỉnh các thông số độ nhạy và điểm chết trong game",
        "zh-CN": "您可能还需要调整游戏内的灵敏度和死区设置",
    },
    "mkb-click-to-activate": {
        "de-DE": "Klicken zum Aktivieren",
        "en-US": "Click to activate",
        "es-ES": "Haz clic para activar",
        "ja-JP": "マウスクリックで開始",
        "pl-PL": "Kliknij, aby aktywować",
        "pt-BR": "Clique para ativar",
        "ru-RU": "Нажмите, чтобы активировать",
        "tr-TR": "Etkinleştirmek için tıklayın",
        "uk-UA": "Натисніть, щоб активувати",
        "vi-VN": "Nhấn vào để kích hoạt",
        "zh-CN": "单击以启用",
    },
    "mkb-disclaimer": {
        "de-DE": "Das Nutzen dieser Funktion beim Online-Spielen könnte als Betrug angesehen werden",
        "en-US": "Using this feature when playing online could be viewed as cheating",
        "es-ES": "Usar esta función al jugar en línea podría ser visto como trampas",
        "ja-JP": "オンラインプレイでこの機能を使用すると不正行為と判定される可能性があります",
        "pl-PL": "Używanie tej funkcji podczas grania online może być postrzegane jako oszukiwanie",
        "pt-BR": "Usar esta função em jogos online pode ser considerado como uma forma de trapaça",
        "ru-RU": "Использование этой функции при игре онлайн может рассматриваться как читерство",
        "tr-TR": "Bu özellik çevrimiçi oyunlarda sizi hile yapıyormuşsunuz gibi gösterebilir",
        "uk-UA": "Використання цієї функції під час гри онлайн може розглядатися як шахрайство",
        "vi-VN": "Sử dụng chức năng này khi chơi trực tuyến có thể bị xem là gian lận",
        "zh-CN": "游玩在线游戏时，使用此功能可能被视为作弊。",
    },
    "mouse-and-keyboard": {
        "de-DE": "Maus & Tastatur",
        "en-US": "Mouse & Keyboard",
        "es-ES": "Ratón y teclado",
        "it-IT": "Mouse e tastiera",
        "ja-JP": "マウス＆キーボード",
        "ko-KR": "마우스 & 키보드",
        "pl-PL": "Mysz i klawiatura",
        "pt-BR": "Mouse e Teclado",
        "ru-RU": "Мышь и клавиатура",
        "tr-TR": "Klavye ve Fare",
        "uk-UA": "Миша та клавіатура",
        "vi-VN": "Chuột và Bàn phím",
        "zh-CN": "鼠标和键盘",
    },
    "muted": {
        "de-DE": "Stumm",
        "en-US": "Muted",
        "es-ES": "Silenciado",
        "it-IT": "Microfono disattivato",
        "ja-JP": "ミュート",
        "ko-KR": "음소거",
        "pl-PL": "Wyciszony",
        "pt-BR": "Mudo",
        "ru-RU": "Выкл микрофон",
        "tr-TR": "Kapalı",
        "uk-UA": "Без звуку",
        "vi-VN": "Đã tắt âm",
        "zh-CN": "静音",
    },
    "name": {
        "de-DE": "Name",
        "en-US": "Name",
        "es-ES": "Nombre",
        "ja-JP": "名前",
        "ko-KR": "이름",
        "pl-PL": "Nazwa",
        "pt-BR": "Nome",
        "ru-RU": "Имя",
        "tr-TR": "İsim",
        "uk-UA": "Назва",
        "vi-VN": "Tên",
        "zh-CN": "名称",
    },
    "new": {
        "de-DE": "Neu",
        "en-US": "New",
        "es-ES": "Nuevo",
        "ja-JP": "新しい",
        "ko-KR": "새로 만들기",
        "pl-PL": "Nowy",
        "pt-BR": "Novo",
        "ru-RU": "Создать",
        "tr-TR": "Yeni",
        "uk-UA": "Новий",
        "vi-VN": "Tạo mới",
        "zh-CN": "新建",
    },
    "no-consoles-found": {
        "de-DE": "Keine Konsolen gefunden",
        "en-US": "No consoles found",
        "es-ES": "No se encontraron consolas",
        "it-IT": "Nessuna console trovata",
        "ja-JP": "本体が見つかりません",
        "ko-KR": "콘솔을 찾을 수 없음",
        "pl-PL": "Nie znaleziono konsoli",
        "pt-BR": "Nenhum console encontrado",
        "ru-RU": "Консолей не найдено",
        "tr-TR": "Konsol bulunamadı",
        "uk-UA": "Не знайдено консолі",
        "vi-VN": "Không tìm thấy console nào",
        "zh-CN": "未找到主机",
    },
    "normal": {
        "de-DE": "Mittel",
        "en-US": "Normal",
        "es-ES": "Normal",
        "fr-FR": "Normal",
        "it-IT": "Normale",
        "ja-JP": "標準",
        "ko-KR": "보통",
        "pl-PL": "Normalny",
        "pt-BR": "Normal",
        "ru-RU": "Средний",
        "tr-TR": "Normal",
        "uk-UA": "Нормальний",
        "vi-VN": "Thường",
        "zh-CN": "中",
    },
    "off": {
        "de-DE": "Aus",
        "en-US": "Off",
        "es-ES": "Apagado",
        "fr-FR": "Désactivé",
        "it-IT": "Off",
        "ja-JP": "オフ",
        "ko-KR": "꺼짐",
        "pl-PL": "Wyłączone",
        "pt-BR": "Desligado",
        "ru-RU": "Выключен",
        "tr-TR": "Kapalı",
        "uk-UA": "Вимкнено",
        "vi-VN": "Tắt",
        "zh-CN": "关",
    },
    "on": {
        "de-DE": "An",
        "en-US": "On",
        "es-ES": "Activado",
        "it-IT": "Attivo",
        "ja-JP": "オン",
        "ko-KR": "켜짐",
        "pl-PL": "Włącz",
        "pt-BR": "Ativado",
        "ru-RU": "Вкл",
        "tr-TR": "Açık",
        "uk-UA": "Увімкнено",
        "vi-VN": "Bật",
        "zh-CN": "开启",
    },
    "only-supports-some-games": {
        "de-DE": "Unterstützt nur einige Spiele",
        "en-US": "Only supports some games",
        "es-ES": "Sólo soporta algunos juegos",
        "it-IT": "Supporta solo alcuni giochi",
        "ja-JP": "一部のゲームのみサポート",
        "ko-KR": "몇몇 게임만 지원",
        "pl-PL": "Wspiera tylko niektóre gry",
        "pt-BR": "Suporta apenas alguns jogos",
        "ru-RU": "Поддерживает только некоторые игры",
        "tr-TR": "Yalnızca belli oyunlar destekleniyor",
        "uk-UA": "Підтримує лише деякі ігри",
        "vi-VN": "Chỉ hỗ trợ một vài game",
        "zh-CN": "仅支持一些游戏",
    },
    "opacity": {
        "de-DE": "Deckkraft",
        "en-US": "Opacity",
        "es-ES": "Opacidad",
        "fr-FR": "Opacité",
        "it-IT": "Opacità",
        "ja-JP": "透過度",
        "ko-KR": "불투명도",
        "pl-PL": "Przezroczystość",
        "pt-BR": "Opacidade",
        "ru-RU": "Непрозрачность",
        "tr-TR": "Saydamsızlık",
        "uk-UA": "Непрозорість",
        "vi-VN": "Độ mờ",
        "zh-CN": "透明度",
    },
    "other": {
        "de-DE": "Sonstiges",
        "en-US": "Other",
        "es-ES": "Otro",
        "fr-FR": "Autres",
        "it-IT": "Altro",
        "ja-JP": "その他",
        "ko-KR": "기타",
        "pl-PL": "Inne",
        "pt-BR": "Outros",
        "ru-RU": "Прочее",
        "tr-TR": "Diğer",
        "uk-UA": "Інше",
        "vi-VN": "Khác",
        "zh-CN": "其他",
    },
    "playing": {
        "de-DE": "Spielt",
        "en-US": "Playing",
        "es-ES": "Jugando",
        "ja-JP": "プレイ中",
        "ko-KR": "플레이 중",
        "pl-PL": "W grze",
        "pt-BR": "Jogando",
        "ru-RU": "Играет",
        "tr-TR": "Şu anda oyunda",
        "uk-UA": "Гра триває",
        "vi-VN": "Đang chơi",
        "zh-CN": "游戏中",
    },
    "position": {
        "de-DE": "Position",
        "en-US": "Position",
        "es-ES": "Posición",
        "fr-FR": "Position",
        "it-IT": "Posizione",
        "ja-JP": "位置",
        "ko-KR": "위치",
        "pl-PL": "Pozycja",
        "pt-BR": "Posição",
        "ru-RU": "Расположение",
        "tr-TR": "Konum",
        "uk-UA": "Позиція",
        "vi-VN": "Vị trí",
        "zh-CN": "位置",
    },
    "powered-off": {
        "de-DE": "Ausgeschaltet",
        "en-US": "Powered off",
        "es-ES": "Desactivado",
        "it-IT": "Spento",
        "ja-JP": "本体オフ",
        "ko-KR": "전원 꺼짐",
        "pl-PL": "Zasilanie wyłączone",
        "pt-BR": "Desligado",
        "ru-RU": "Выключено",
        "tr-TR": "Kapalı",
        "uk-UA": "Вимкнений",
        "vi-VN": "Đã tắt nguồn",
        "zh-CN": "关机",
    },
    "powered-on": {
        "de-DE": "Eingeschaltet",
        "en-US": "Powered on",
        "es-ES": "Activado",
        "it-IT": "Acceso",
        "ja-JP": "本体オン",
        "ko-KR": "전원 켜짐",
        "pl-PL": "Zasilanie włączone",
        "pt-BR": "Ligado",
        "ru-RU": "Включено",
        "tr-TR": "Açık",
        "uk-UA": "Увімкнений",
        "vi-VN": "Đang bật nguồn",
        "zh-CN": "开机",
    },
    "prefer-ipv6-server": {
        "de-DE": "IPv6-Server bevorzugen",
        "en-US": "Prefer IPv6 server",
        "es-ES": "Servidor IPv6 preferido",
        "fr-FR": "Préférer le serveur IPv6",
        "it-IT": "Preferisci server IPv6",
        "ja-JP": "IPv6 サーバーを優先",
        "ko-KR": "IPv6 서버 우선",
        "pl-PL": "Preferuj serwer IPv6",
        "pt-BR": "Preferir servidor IPV6",
        "ru-RU": "Предпочитать IPv6 сервер",
        "tr-TR": "IPv6 sunucusunu tercih et",
        "uk-UA": "Віддавати перевагу IPv6",
        "vi-VN": "Ưu tiên máy chủ IPv6",
        "zh-CN": "优先使用 IPv6 服务器",
    },
    "preferred-game-language": {
        "de-DE": "Bevorzugte Spielsprache",
        "en-US": "Preferred game's language",
        "es-ES": "Idioma preferencial del juego",
        "fr-FR": "Langue préférée du jeu",
        "it-IT": "Lingua del gioco preferita",
        "ja-JP": "ゲームの優先言語設定",
        "ko-KR": "선호하는 게임 언어",
        "pl-PL": "Preferowany język gry",
        "pt-BR": "Idioma preferencial do jogo",
        "ru-RU": "Предпочитаемый язык игры",
        "tr-TR": "Oyunda tercih edilen dil",
        "uk-UA": "Бажана мова гри",
        "vi-VN": "Ngôn ngữ game ưu tiên",
        "zh-CN": "首选游戏语言",
    },
    "preset": {
        "de-DE": "Voreinstellung",
        "en-US": "Preset",
        "es-ES": "Preajuste",
        "ja-JP": "プリセット",
        "ko-KR": "프리셋",
        "pl-PL": "Szablon",
        "pt-BR": "Predefinição",
        "ru-RU": "Шаблон",
        "tr-TR": "Hazır ayar",
        "uk-UA": "Пресет",
        "vi-VN": "Thiết lập sẵn",
        "zh-CN": "预设",
    },
    "press-esc-to-cancel": {
        "de-DE": "Zum Abbrechen \"Esc\" drücken",
        "en-US": "Press Esc to cancel",
        "es-ES": "Presione Esc para cancelar",
        "ja-JP": "Escを押してキャンセル",
        "ko-KR": "ESC를 눌러 취소",
        "pl-PL": "Naciśnij Esc, aby anulować",
        "pt-BR": "Pressione Esc para cancelar",
        "ru-RU": "Нажмите Esc для отмены",
        "tr-TR": "İptal etmek için Esc'ye basın",
        "uk-UA": "Натисніть Esc, щоб скасувати",
        "vi-VN": "Nhấn Esc để bỏ qua",
        "zh-CN": "按下ESC键以取消",
    },
    "press-key-to-toggle-mkb": {
        "de-DE": e => `${e.key}: Maus- und Tastaturunterstützung an-/ausschalten`,
        "en-US": e => `Press ${e.key} to toggle the Mouse and Keyboard feature`,
        "es-ES": e => `Pulsa ${e.key} para activar la función de ratón y teclado`,
        "ja-JP": e => `${e.key} キーでマウスとキーボードの機能を切り替える`,
        "ko-KR": e => `${e.key} 키를 눌러 마우스와 키보드 기능을 활성화 하십시오`,
        "pl-PL": e => `Naciśnij ${e.key}, aby przełączyć funkcję myszy i klawiatury`,
        "pt-BR": e => `Pressione ${e.key} para ativar/desativar a função de Mouse e Teclado`,
        "ru-RU": e => `Нажмите ${e.key} для переключения функции мыши и клавиатуры`,
        "tr-TR": e => `Klavye ve fare özelliğini açmak için ${e.key} tuşuna basın`,
        "uk-UA": e => `Натисніть ${e.key}, щоб увімкнути або вимкнути функцію миші та клавіатури`,
        "vi-VN": e => `Nhấn ${e.key} để bật/tắt tính năng Chuột và Bàn phím`,
        "zh-CN": e => `按下 ${e.key} 切换键鼠模式`,
    },
    "press-to-bind": {
        "de-DE": "Zum Festlegen Taste drücken oder mit der Maus klicken...",
        "en-US": "Press a key or do a mouse click to bind...",
        "es-ES": "Presione una tecla o haga un clic del ratón para enlazar...",
        "ja-JP": "キーを押すかマウスをクリックして割り当て...",
        "ko-KR": "정지하려면 아무키나 마우스를 클릭해주세요...",
        "pl-PL": "Naciśnij klawisz lub kliknij myszą, aby przypisać...",
        "pt-BR": "Pressione uma tecla ou clique do mouse para vincular...",
        "ru-RU": "Нажмите клавишу или щелкните мышкой, чтобы связать...",
        "tr-TR": "Klavyedeki bir tuşa basarak veya fareyle tıklayarak tuş ataması yapın...",
        "uk-UA": "Натисніть клавішу або кнопку миші, щоб прив'язати...",
        "vi-VN": "Nhấn nút hoặc nhấn chuột để gán...",
        "zh-CN": "按相应按键或鼠标键来绑定",
    },
    "prompt-preset-name": {
        "de-DE": "Voreinstellung Name:",
        "en-US": "Preset's name:",
        "es-ES": "Nombre del preajuste:",
        "ja-JP": "プリセット名:",
        "ko-KR": "프리셋 이름:",
        "pl-PL": "Nazwa szablonu:",
        "pt-BR": "Nome da predefinição:",
        "ru-RU": "Имя шаблона:",
        "tr-TR": "Hazır ayar adı:",
        "uk-UA": "Назва пресету:",
        "vi-VN": "Tên của mẫu sẵn:",
        "zh-CN": "预设名称：",
    },
    "ratio": {
        "de-DE": "Seitenverhältnis",
        "en-US": "Ratio",
        "es-ES": "Relación de aspecto",
        "fr-FR": "Ratio",
        "it-IT": "Rapporto",
        "ja-JP": "比率",
        "ko-KR": "화면 비율",
        "pl-PL": "Współczynnik proporcji",
        "pt-BR": "Proporção",
        "ru-RU": "Соотношение сторон",
        "tr-TR": "Görüntü oranı",
        "uk-UA": "Співвідношення сторін",
        "vi-VN": "Tỉ lệ",
        "zh-CN": "宽高比",
    },
    "reduce-animations": {
        "de-DE": "Animationen reduzieren",
        "en-US": "Reduce UI animations",
        "es-ES": "Reduce las animaciones de la interfaz",
        "fr-FR": "Réduire les animations dans l’interface",
        "it-IT": "Animazioni ridottte",
        "ja-JP": "UIアニメーションを減らす",
        "ko-KR": "애니메이션 감소",
        "pl-PL": "Ogranicz animacje interfejsu",
        "pt-BR": "Reduzir animações da interface",
        "ru-RU": "Убрать анимации интерфейса",
        "tr-TR": "Arayüz animasyonlarını azalt",
        "uk-UA": "Зменшити анімацію інтерфейсу",
        "vi-VN": "Giảm hiệu ứng chuyển động",
        "zh-CN": "减少UI动画",
    },
    "region": {
        "de-DE": "Region",
        "en-US": "Region",
        "es-ES": "Región",
        "fr-FR": "Région",
        "it-IT": "Regione",
        "ja-JP": "地域",
        "ko-KR": "지역",
        "pl-PL": "Region",
        "pt-BR": "Região",
        "ru-RU": "Регион",
        "tr-TR": "Bölge",
        "uk-UA": "Регіон",
        "vi-VN": "Khu vực",
        "zh-CN": "地区",
    },
    "remote-play": {
        "de-DE": "Remote Play",
        "en-US": "Remote Play",
        "es-ES": "Reproducción remota",
        "it-IT": "Riproduzione Remota",
        "ja-JP": "リモートプレイ",
        "ko-KR": "리모트 플레이",
        "pl-PL": "Gra zdalna",
        "pt-BR": "Jogo Remoto",
        "ru-RU": "Удаленная игра",
        "tr-TR": "Uzaktan Bağlanma",
        "uk-UA": "Віддалена гра",
        "vi-VN": "Chơi Từ Xa",
        "zh-CN": "远程游玩",
    },
    "rename": {
        "de-DE": "Umbenennen",
        "en-US": "Rename",
        "es-ES": "Renombrar",
        "ja-JP": "名前変更",
        "ko-KR": "이름 바꾸기",
        "pl-PL": "Zmień nazwę",
        "pt-BR": "Renomear",
        "ru-RU": "Переименовать",
        "tr-TR": "Ad değiştir",
        "uk-UA": "Перейменувати",
        "vi-VN": "Sửa tên",
        "zh-CN": "重命名",
    },
    "right-click-to-unbind": {
        "de-DE": "Rechtsklick auf Taste: Zuordnung aufheben",
        "en-US": "Right-click on a key to unbind it",
        "es-ES": "Clic derecho en una tecla para desvincularla",
        "ja-JP": "右クリックで割り当て解除",
        "ko-KR": "할당 해제하려면 키를 오른쪽 클릭하세요",
        "pl-PL": "Kliknij prawym przyciskiem myszy na klawisz, aby anulować przypisanie",
        "pt-BR": "Clique com o botão direito em uma tecla para desvinculá-la",
        "ru-RU": "Щелкните правой кнопкой мыши по кнопке, чтобы отвязать её",
        "tr-TR": "Tuş atamasını kaldırmak için fareyle sağ tık yapın",
        "uk-UA": "Натисніть правою кнопкою миші, щоб відв'язати",
        "vi-VN": "Nhấn chuột phải lên một phím để gỡ nó",
        "zh-CN": "右键解除绑定",
    },
    "right-stick": {
        "de-DE": "Rechter Stick",
        "en-US": "Right stick",
        "es-ES": "Joystick derecho",
        "ja-JP": "右スティック",
        "ko-KR": "오른쪽 스틱",
        "pl-PL": "Prawy drążek analogowy",
        "pt-BR": "Direcional analógico direito",
        "ru-RU": "Правый стик",
        "tr-TR": "Sağ analog çubuk",
        "uk-UA": "Правий стік",
        "vi-VN": "Analog phải",
        "zh-CN": "右摇杆",
    },
    "rocket-always-hide": {
        "de-DE": "Immer ausblenden",
        "en-US": "Always hide",
        "es-ES": "Ocultar siempre",
        "fr-FR": "Toujours masquer",
        "it-IT": "Nascondi sempre",
        "ja-JP": "常に非表示",
        "ko-KR": "항상 숨기기",
        "pl-PL": "Zawsze ukrywaj",
        "pt-BR": "Sempre ocultar",
        "ru-RU": "Всегда скрывать",
        "tr-TR": "Her zaman gizle",
        "uk-UA": "Ховати завжди",
        "vi-VN": "Luôn ẩn",
        "zh-CN": "始终隐藏",
    },
    "rocket-always-show": {
        "de-DE": "Immer anzeigen",
        "en-US": "Always show",
        "es-ES": "Mostrar siempre",
        "fr-FR": "Toujours afficher",
        "it-IT": "Mostra sempre",
        "ja-JP": "常に表示",
        "ko-KR": "항상 표시",
        "pl-PL": "Zawsze pokazuj",
        "pt-BR": "Sempre mostrar",
        "ru-RU": "Всегда показывать",
        "tr-TR": "Her zaman göster",
        "uk-UA": "Показувати завжди",
        "vi-VN": "Luôn hiển thị",
        "zh-CN": "始终显示",
    },
    "rocket-animation": {
        "de-DE": "Raketen Animation",
        "en-US": "Rocket animation",
        "es-ES": "Animación del cohete",
        "fr-FR": "Animation de la fusée",
        "it-IT": "Razzo animato",
        "ja-JP": "ロケットのアニメーション",
        "ko-KR": "로켓 애니메이션",
        "pl-PL": "Animacja rakiety",
        "pt-BR": "Animação do foguete",
        "ru-RU": "Анимация ракеты",
        "tr-TR": "Roket animasyonu",
        "uk-UA": "Анімація ракети",
        "vi-VN": "Phi thuyền",
        "zh-CN": "火箭动画",
    },
    "rocket-hide-queue": {
        "de-DE": "Bei Warteschlange ausblenden",
        "en-US": "Hide when queuing",
        "es-ES": "Ocultar al hacer cola",
        "fr-FR": "Masquer lors de la file d'attente",
        "it-IT": "Nascondi durante la coda",
        "ja-JP": "待機中は非表示",
        "ko-KR": "대기 중에는 숨기기",
        "pl-PL": "Ukryj podczas czekania w kolejce",
        "pt-BR": "Ocultar quando estiver na fila",
        "ru-RU": "Скрыть, когда есть очередь",
        "tr-TR": "Sıradayken gizle",
        "uk-UA": "Не показувати у черзі",
        "vi-VN": "Ẩn khi xếp hàng chờ",
        "zh-CN": "排队时隐藏",
    },
    "safari-failed-message": {
        "de-DE": "Ausführen von \"Better xCloud\" fehlgeschlagen. Versuche es erneut, bitte warten...",
        "en-US": "Failed to run Better xCloud. Retrying, please wait...",
        "es-ES": "No se pudo ejecutar Better xCloud. Reintentando, por favor espera...",
        "fr-FR": "Impossible d'exécuter Better xCloud. Nouvelle tentative, veuillez patienter...",
        "it-IT": "Si è verificato un errore durante l'esecuzione di Better xCloud. Nuovo tentativo, attendere...",
        "ja-JP": "Better xCloud の実行に失敗しました。再試行中...",
        "ko-KR": "Better xCloud 시작에 실패했습니다. 재시도중이니 잠시만 기다려 주세요.",
        "pl-PL": "Nie udało się uruchomić Better xCloud. Ponawiam próbę...",
        "pt-BR": "Falha ao executar o Better xCloud. Tentando novamente, aguarde...",
        "ru-RU": "Не удалось запустить Better xCloud. Идет перезапуск, пожалуйста, подождите...",
        "tr-TR": "Better xCloud çalıştırılamadı. Yeniden deneniyor...",
        "uk-UA": "Не вдалий старт Better xCloud. Повторна спроба, будь ласка, зачекайте...",
        "vi-VN": "Không thể chạy Better xCloud. Đang thử lại, vui lòng chờ...",
        "zh-CN": "插件无法运行。正在重试，请稍候...",
    },
    "saturation": {
        "de-DE": "Sättigung",
        "en-US": "Saturation",
        "es-ES": "Saturación",
        "fr-FR": "Saturation",
        "it-IT": "Saturazione",
        "ja-JP": "彩度",
        "ko-KR": "채도",
        "pl-PL": "Nasycenie",
        "pt-BR": "Saturação",
        "ru-RU": "Насыщенность",
        "tr-TR": "Renk doygunluğu",
        "uk-UA": "Насиченість",
        "vi-VN": "Độ bão hòa",
        "zh-CN": "饱和度",
    },
    "save": {
        "de-DE": "Speichern",
        "en-US": "Save",
        "es-ES": "Guardar",
        "ja-JP": "保存",
        "ko-KR": "저장",
        "pl-PL": "Zapisz",
        "pt-BR": "Salvar",
        "ru-RU": "Сохранить",
        "tr-TR": "Kaydet",
        "uk-UA": "Зберегти",
        "vi-VN": "Lưu",
        "zh-CN": "保存",
    },
    "screenshot-button-position": {
        "de-DE": "Position des Screenshot-Buttons",
        "en-US": "Screenshot button's position",
        "es-ES": "Posición del botón de captura de pantalla",
        "fr-FR": "Position du bouton de capture d'écran",
        "it-IT": "Posizione del pulsante screenshot",
        "ja-JP": "スクリーンショットボタンの位置",
        "ko-KR": "스크린샷 버튼 위치",
        "pl-PL": "Pozycja przycisku zrzutu ekranu",
        "pt-BR": "Posição do botão de captura de tela",
        "ru-RU": "Расположение кнопки скриншота",
        "tr-TR": "Ekran görüntüsü düğmesi konumu",
        "uk-UA": "Позиція кнопки скриншоту",
        "vi-VN": "Vị trí của nút Chụp màn hình",
        "zh-CN": "截图按钮位置",
    },
    "server": {
        "de-DE": "Server",
        "en-US": "Server",
        "es-ES": "Servidor",
        "fr-FR": "Serveur",
        "it-IT": "Server",
        "ja-JP": "サーバー",
        "ko-KR": "서버",
        "pl-PL": "Serwer",
        "pt-BR": "Servidor",
        "ru-RU": "Сервер",
        "tr-TR": "Sunucu",
        "uk-UA": "Сервер",
        "vi-VN": "Máy chủ",
        "zh-CN": "服务器",
    },
    "settings-reload": {
        "de-DE": "Seite neu laden und Änderungen anwenden",
        "en-US": "Reload page to reflect changes",
        "es-ES": "Actualice la página para aplicar los cambios",
        "fr-FR": "Recharger la page pour bénéficier des changements",
        "it-IT": "Applica e ricarica la pagina",
        "ja-JP": "ページを更新をして設定変更を適用",
        "ko-KR": "적용 및 페이지 새로고침",
        "pl-PL": "Odśwież stronę, aby zastosować zmiany",
        "pt-BR": "Recarregue a página para refletir as alterações",
        "ru-RU": "Перезагрузить страницу, чтобы применить изменения",
        "tr-TR": "Kaydetmek için sayfayı yenile",
        "uk-UA": "Перезавантажте сторінку, щоб застосувати зміни",
        "vi-VN": "Tải lại trang để áp dụng các thay đổi",
        "zh-CN": "重新加载页面以应用更改",
    },
    "settings-reloading": {
        "de-DE": "Wird neu geladen...",
        "en-US": "Reloading...",
        "es-ES": "Recargando...",
        "fr-FR": "Actualisation...",
        "it-IT": "Ricaricamento...",
        "ja-JP": "更新中...",
        "ko-KR": "새로고침하는 중...",
        "pl-PL": "Ponowne ładowanie...",
        "pt-BR": "Recarregando...",
        "ru-RU": "Перезагрузка...",
        "tr-TR": "Sayfa yenileniyor...",
        "uk-UA": "Перезавантаження...",
        "vi-VN": "Đang tải lại...",
        "zh-CN": "正在重新加载...",
    },
    "show-game-art": {
        "de-DE": "Poster des Spiels anzeigen",
        "en-US": "Show game art",
        "es-ES": "Mostrar imagen del juego",
        "fr-FR": "Afficher la couverture du jeu",
        "it-IT": "Mostra immagine del gioco",
        "ja-JP": "ゲームアートを表示",
        "ko-KR": "게임 아트 표시",
        "pl-PL": "Pokaż okładkę gry",
        "pt-BR": "Mostrar arte do jogo",
        "ru-RU": "Показывать игровую обложку",
        "tr-TR": "Oyun resmini göster",
        "uk-UA": "Показувати ігровий арт",
        "vi-VN": "Hiển thị ảnh game",
        "zh-CN": "显示游戏封面",
    },
    "show-stats-on-startup": {
        "de-DE": "Statistiken beim Start des Spiels anzeigen",
        "en-US": "Show stats when starting the game",
        "es-ES": "Mostrar estadísticas al iniciar el juego",
        "fr-FR": "Afficher les statistiques au démarrage de la partie",
        "it-IT": "Mostra le statistiche quando si avvia la partita",
        "ja-JP": "ゲーム開始時に統計情報を表示",
        "ko-KR": "게임 시작 시 통계 보여주기",
        "pl-PL": "Pokaż statystyki podczas uruchamiania gry",
        "pt-BR": "Mostrar estatísticas ao iniciar o jogo",
        "ru-RU": "Показывать статистику при запуске игры",
        "tr-TR": "Oyun başlatırken yayın durumunu göster",
        "uk-UA": "Показувати статистику при запуску гри",
        "vi-VN": "Hiển thị thông số khi vào game",
        "zh-CN": "开始游戏时显示统计信息",
    },
    "show-wait-time": {
        "de-DE": "Geschätzte Wartezeit anzeigen",
        "en-US": "Show the estimated wait time",
        "es-ES": "Mostrar el tiempo de espera estimado",
        "fr-FR": "Afficher le temps d'attente estimé",
        "it-IT": "Mostra una stima del tempo di attesa",
        "ja-JP": "推定待機時間を表示",
        "ko-KR": "예상 대기 시간 표시",
        "pl-PL": "Pokaż szacowany czas oczekiwania",
        "pt-BR": "Mostrar o tempo estimado de espera",
        "ru-RU": "Показать предполагаемое время до запуска",
        "tr-TR": "Tahminî bekleme süresini göster",
        "uk-UA": "Показувати орієнтовний час очікування",
        "vi-VN": "Hiển thị thời gian chờ dự kiến",
        "zh-CN": "显示预计等待时间",
    },
    "simplify-stream-menu": {
        "de-DE": "Stream-Menü vereinfachen",
        "en-US": "Simplify Stream's menu",
        "es-ES": "Simplificar el menú del stream",
        "fr-FR": "Simplifier le menu Stream",
        "it-IT": "Semplifica il menu della trasmissione",
        "ja-JP": "ストリーミングメニューのラベルを非表示",
        "ko-KR": "메뉴 간단히 보기",
        "pl-PL": "Uprość menu strumienia",
        "pt-BR": "Simplificar menu de transmissão",
        "ru-RU": "Упростить меню потока",
        "tr-TR": "Yayın menüsünü basitleştir",
        "uk-UA": "Спростити меню трансляції",
        "vi-VN": "Đơn giản hóa menu của Stream",
        "zh-CN": "简化菜单",
    },
    "skip-splash-video": {
        "de-DE": "Xbox-Logo bei Spielstart überspringen",
        "en-US": "Skip Xbox splash video",
        "es-ES": "Saltar vídeo de presentación de Xbox",
        "fr-FR": "Ignorer la vidéo de démarrage Xbox",
        "it-IT": "Salta il logo Xbox iniziale",
        "ja-JP": "Xboxの起動画面をスキップ",
        "ko-KR": "Xbox 스플래시 건너뛰기",
        "pl-PL": "Pomiń wstępne intro Xbox",
        "pt-BR": "Pular introdução do Xbox",
        "ru-RU": "Пропустить видео с заставкой Xbox",
        "tr-TR": "Xbox açılış ekranını atla",
        "uk-UA": "Пропустити заставку Xbox",
        "vi-VN": "Bỏ qua video Xbox",
        "zh-CN": "跳过 Xbox 启动动画",
    },
    "slow": {
        "de-DE": "Langsam",
        "en-US": "Slow",
        "es-ES": "Lento",
        "it-IT": "Lento",
        "ja-JP": "低速",
        "ko-KR": "느림",
        "pl-PL": "Wolno",
        "pt-BR": "Lento",
        "ru-RU": "Медленный",
        "tr-TR": "Yavaş",
        "uk-UA": "Повільний",
        "vi-VN": "Chậm",
        "zh-CN": "慢速",
    },
    "small": {
        "de-DE": "Klein",
        "en-US": "Small",
        "es-ES": "Pequeño",
        "fr-FR": "Petite",
        "it-IT": "Piccolo",
        "ja-JP": "小",
        "ko-KR": "작게",
        "pl-PL": "Mały",
        "pt-BR": "Pequeno",
        "ru-RU": "Маленький",
        "tr-TR": "Küçük",
        "uk-UA": "Маленький",
        "vi-VN": "Nhỏ",
        "zh-CN": "小",
    },
    "smart-tv": {
        "de-DE": "Smart TV",
        "en-US": "Smart TV",
        "es-ES": "Smart TV",
        "it-IT": "Smart TV",
        "ja-JP": "スマートTV",
        "ko-KR": "스마트 TV",
        "pl-PL": "Smart TV",
        "pt-BR": "Smart TV",
        "ru-RU": "Smart TV",
        "tr-TR": "Akıllı TV",
        "uk-UA": "Smart TV",
        "vi-VN": "TV thông minh",
        "zh-CN": "智能电视",
    },
    "sound": {
        "de-DE": "Ton",
        "en-US": "Sound",
        "es-ES": "Sonido",
        "it-IT": "Suoni",
        "ja-JP": "サウンド",
        "ko-KR": "소리",
        "pl-PL": "Dźwięk",
        "pt-BR": "Som",
        "ru-RU": "Звук",
        "tr-TR": "Ses",
        "uk-UA": "Звук",
        "vi-VN": "Âm thanh",
        "zh-CN": "声音",
    },
    "standby": {
        "de-DE": "Standby",
        "en-US": "Standby",
        "es-ES": "Modo de espera",
        "it-IT": "Sospendi",
        "ja-JP": "スタンバイ",
        "ko-KR": "대기",
        "pl-PL": "Stan czuwania",
        "pt-BR": "Suspenso",
        "ru-RU": "Режим ожидания",
        "tr-TR": "Beklemede",
        "uk-UA": "Режим очікування",
        "vi-VN": "Đang ở chế độ chờ",
        "zh-CN": "待机",
    },
    "stat-bitrate": {
        "de-DE": "Bitrate",
        "en-US": "Bitrate",
        "es-ES": "Tasa de bits",
        "fr-FR": "Bitrate",
        "it-IT": "Bitrate",
        "ja-JP": "ビットレート",
        "ko-KR": "비트레이트",
        "pl-PL": "Bitrate",
        "pt-BR": "Bitrate",
        "ru-RU": "Скорость соединения",
        "tr-TR": "Bit hızı",
        "uk-UA": "Бітрейт",
        "vi-VN": "Bitrate",
        "zh-CN": "码率",
    },
    "stat-decode-time": {
        "de-DE": "Dekodierzeit",
        "en-US": "Decode time",
        "es-ES": "Tiempo de decodificación",
        "fr-FR": "Décodage",
        "it-IT": "Decodifica",
        "ja-JP": "デコード時間",
        "ko-KR": "디코딩 시간",
        "pl-PL": "Czas dekodowania",
        "pt-BR": "Tempo de decodificação",
        "ru-RU": "Время декодирования",
        "tr-TR": "Kod çözme süresi",
        "uk-UA": "Час декодування",
        "vi-VN": "Thời gian giải mã",
        "zh-CN": "解码时间",
    },
    "stat-fps": {
        "de-DE": "Framerate",
        "en-US": "FPS",
        "es-ES": "FPS",
        "fr-FR": "FPS",
        "it-IT": "FPS",
        "ja-JP": "FPS",
        "ko-KR": "FPS",
        "pl-PL": "FPS",
        "pt-BR": "FPS",
        "ru-RU": "Кадр/сек",
        "tr-TR": "FPS",
        "uk-UA": "Кадрів на секунду",
        "vi-VN": "FPS",
        "zh-CN": "帧率",
    },
    "stat-frames-lost": {
        "de-DE": "Verlorene Frames",
        "en-US": "Frames lost",
        "es-ES": "Pérdida de fotogramas",
        "fr-FR": "Images perdues",
        "it-IT": "Perdita di fotogrammi",
        "ja-JP": "フレームロス",
        "ko-KR": "프레임 손실",
        "pl-PL": "Utracone klatki",
        "pt-BR": "Quadros perdidos",
        "ru-RU": "Потери кадров",
        "tr-TR": "Kare kaybı",
        "uk-UA": "Кадрів втрачено",
        "vi-VN": "Số khung hình bị mất",
        "zh-CN": "丢帧",
    },
    "stat-packets-lost": {
        "de-DE": "Paketverluste",
        "en-US": "Packets lost",
        "es-ES": "Pérdida de paquetes",
        "fr-FR": "Perte paquets",
        "it-IT": "Perdita di pacchetti",
        "ja-JP": "パケットロス",
        "ko-KR": "패킷 손실",
        "pl-PL": "Utracone pakiety",
        "pt-BR": "Pacotes perdidos",
        "ru-RU": "Потери пакетов",
        "tr-TR": "Paket kaybı",
        "uk-UA": "Пакетів втрачено",
        "vi-VN": "Số gói tin bị mất",
        "zh-CN": "丢包",
    },
    "stat-ping": {
        "de-DE": "Ping",
        "en-US": "Ping",
        "es-ES": "Latencia",
        "fr-FR": "Ping",
        "it-IT": "Ping",
        "ja-JP": "Ping",
        "ko-KR": "지연 시간",
        "pl-PL": "Ping",
        "pt-BR": "Ping",
        "ru-RU": "Задержка соединения",
        "tr-TR": "Gecikme",
        "uk-UA": "Затримка",
        "vi-VN": "Ping",
        "zh-CN": "延迟",
    },
    "stats": {
        "de-DE": "Statistiken",
        "en-US": "Stats",
        "es-ES": "Estadísticas",
        "fr-FR": "Stats",
        "it-IT": "Statistiche",
        "ja-JP": "統計情報",
        "ko-KR": "통계",
        "pl-PL": "Statystyki",
        "pt-BR": "Estatísticas",
        "ru-RU": "Статистика",
        "tr-TR": "Durum",
        "uk-UA": "Статистика",
        "vi-VN": "Các thông số",
        "zh-CN": "统计信息",
    },
    "stick-decay-minimum": {
        "de-DE": "Stick Abklingzeit Minimum",
        "en-US": "Stick decay minimum",
        "es-ES": "Disminuir mínimamente el analógico",
        "ja-JP": "スティックの減衰の最小値",
        "pl-PL": "Minimalne opóźnienie drążka",
        "pt-BR": "Mínimo decaimento do analógico",
        "ru-RU": "Минимальная перезарядка стика",
        "tr-TR": "Çubuğun ortalanma süresi minimumu",
        "uk-UA": "Мінімальне згасання стіка",
        "vi-VN": "Độ suy giảm tối thiểu của cần điều khiển",
        "zh-CN": "最小摇杆回中延迟",
    },
    "stick-decay-strength": {
        "de-DE": "Stick Abklingzeit Geschwindigkeit",
        "en-US": "Stick decay strength",
        "es-ES": "Intensidad de decaimiento del analógico",
        "ja-JP": "スティックの減衰の強さ",
        "pl-PL": "Siła opóźnienia drążka",
        "pt-BR": "Força de decaimento do analógico",
        "ru-RU": "Скорость перезарядки стика",
        "tr-TR": "Çubuğun ortalanma gücü",
        "uk-UA": "Сила згасання стіка",
        "vi-VN": "Sức mạnh độ suy giảm của cần điều khiển",
        "zh-CN": "摇杆回中强度",
    },
    "stream": {
        "de-DE": "Stream",
        "en-US": "Stream",
        "es-ES": "Stream",
        "fr-FR": "Stream",
        "it-IT": "Stream",
        "ja-JP": "ストリーミング",
        "ko-KR": "스트리밍",
        "pl-PL": "Stream",
        "pt-BR": "Transmissão",
        "ru-RU": "Видеопоток",
        "tr-TR": "Yayın",
        "uk-UA": "Трансляція",
        "vi-VN": "Stream",
        "zh-CN": "串流",
    },
    "stretch": {
        "de-DE": "Strecken",
        "en-US": "Stretch",
        "es-ES": "Estirado",
        "fr-FR": "Étirer",
        "it-IT": "Riempi",
        "ja-JP": "引き伸ばし",
        "ko-KR": "채우기",
        "pl-PL": "Rozciągnij",
        "pt-BR": "Esticar",
        "ru-RU": "Растянуть",
        "tr-TR": "Genişlet",
        "uk-UA": "Розтягнути",
        "vi-VN": "Kéo giãn",
        "zh-CN": "拉伸",
    },
    "support-better-xcloud": {
        "de-DE": "\"Better xCloud\" unterstützen",
        "en-US": "Support Better xCloud",
        "es-ES": "Apoyar a Better xCloud",
        "ja-JP": "Better xCloudをサポート",
        "pl-PL": "Wesprzyj Better xCloud",
        "pt-BR": "Suporte ao Melhor xCloud",
        "ru-RU": "Поддержать Better xCloud",
        "tr-TR": "Better xCloud'a destek ver",
        "uk-UA": "Підтримати Better xCloud",
        "vi-VN": "Ủng hộ Better xCloud",
        "zh-CN": "赞助本插件",
    },
    "swap-buttons": {
        "de-DE": "Tasten tauschen",
        "en-US": "Swap buttons",
        "es-ES": "Intercambiar botones",
        "ja-JP": "ボタン入れ替え",
        "ko-KR": "버튼 바꾸기",
        "pl-PL": "Zamień przyciski",
        "pt-BR": "Trocar botões",
        "ru-RU": "Поменять кнопки",
        "tr-TR": "Düğme düzenini ters çevir",
        "uk-UA": "Поміняти кнопки місцями",
        "vi-VN": "Hoán đổi nút",
        "zh-CN": "交换按钮",
    },
    "target-resolution": {
        "de-DE": "Festgelegte Auflösung",
        "en-US": "Target resolution",
        "es-ES": "Calidad de imagen",
        "fr-FR": "Résolution cible",
        "it-IT": "Risoluzione prevista",
        "ja-JP": "ターゲット解像度",
        "ko-KR": "목표 해상도",
        "pl-PL": "Rozdzielczość docelowa",
        "pt-BR": "Resolução alvo",
        "ru-RU": "Целевое разрешение",
        "tr-TR": "Tercih edilen çözünürlük",
        "uk-UA": "Цільова роздільна здатність",
        "vi-VN": "Độ phân giải",
        "zh-CN": "目标分辨率",
    },
    "tc-all-games": {
        "de-DE": "Alle Spiele",
        "en-US": "All games",
        "es-ES": "Todos los juegos",
        "fr-FR": "Tous les jeux",
        "it-IT": "Tutti i giochi",
        "ja-JP": "全てのゲームで有効",
        "ko-KR": "모든 게임",
        "pl-PL": "Wszystkie gry",
        "pt-BR": "Todos os jogos",
        "ru-RU": "Все игры",
        "tr-TR": "Tüm oyunlar",
        "uk-UA": "Всі ігри",
        "vi-VN": "Tất cả các game",
        "zh-CN": "所有游戏",
    },
    "tc-all-white": {
        "de-DE": "Komplett weiß",
        "en-US": "All white",
        "es-ES": "Todo blanco",
        "fr-FR": "Tout blanc",
        "it-IT": "Tutti bianchi",
        "ja-JP": "オールホワイト",
        "ko-KR": "모두 하얗게",
        "pl-PL": "Wszystkie białe",
        "pt-BR": "Todo branco",
        "ru-RU": "Полностью белые",
        "tr-TR": "Hepsi beyaz",
        "uk-UA": "Все біле",
        "vi-VN": "Trắng hoàn toàn",
        "zh-CN": "白色",
    },
    "tc-availability": {
        "de-DE": "Verfügbarkeit",
        "en-US": "Availability",
        "es-ES": "Disponibilidad",
        "fr-FR": "Disponibilité",
        "it-IT": "Disponibilità",
        "ja-JP": "強制的に有効化",
        "ko-KR": "사용 여부",
        "pl-PL": "Dostępność",
        "pt-BR": "Disponibilidade",
        "ru-RU": "В каких играх включить",
        "tr-TR": "Uygunluk durumu",
        "uk-UA": "Доступність",
        "vi-VN": "Khả dụng",
        "zh-CN": "启用",
    },
    "tc-custom-layout-style": {
        "de-DE": "Angepasstes Layout Button Stil",
        "en-US": "Custom layout's button style",
        "es-ES": "Estilo de botones de diseño personalizado",
        "fr-FR": "Style personnalisé des boutons",
        "it-IT": "Layout dei tasti personalizzato",
        "ja-JP": "カスタムレイアウト",
        "ko-KR": "커스텀 레이아웃의 버튼 스타일",
        "pl-PL": "Niestandardowy układ przycisków",
        "pt-BR": "Estilo de botão do layout personalizado",
        "ru-RU": "Пользовательский стиль кнопок",
        "tr-TR": "Özelleştirilmiş düğme düzeninin biçimi",
        "uk-UA": "Користувацький стиль кнопок",
        "vi-VN": "Màu của bố cục tùy chọn",
        "zh-CN": "特殊游戏按钮样式",
    },
    "tc-muted-colors": {
        "de-DE": "Matte Farben",
        "en-US": "Muted colors",
        "es-ES": "Colores apagados",
        "fr-FR": "Couleurs adoucies",
        "it-IT": "Riduci intensità colori",
        "ja-JP": "ミュートカラー",
        "ko-KR": "저채도 색상",
        "pl-PL": "Stonowane kolory",
        "pt-BR": "Cores silenciadas",
        "ru-RU": "Приглушенные цвета",
        "tr-TR": "Yumuşak renkler",
        "uk-UA": "Приглушені кольори",
        "vi-VN": "Màu câm",
        "zh-CN": "低饱和度",
    },
    "tc-standard-layout-style": {
        "de-DE": "Standard Layout Button Stil",
        "en-US": "Standard layout's button style",
        "es-ES": "Estilo de botones de diseño estándar",
        "fr-FR": "Style standard des boutons",
        "it-IT": "Layout dei tasti standard",
        "ja-JP": "標準レイアウト",
        "ko-KR": "표준 레이아웃의 버튼 스타일",
        "pl-PL": "Standardowy układ przycisków",
        "pt-BR": "Estilo de botão do layout padrão",
        "ru-RU": "Стандартный стиль кнопок",
        "tr-TR": "Varsayılan düğme düzeninin biçimi",
        "uk-UA": "Стандартний стиль кнопок",
        "vi-VN": "Màu của bố cục tiêu chuẩn",
        "zh-CN": "通用按钮样式",
    },
    "text-size": {
        "de-DE": "Textgröße",
        "en-US": "Text size",
        "es-ES": "Tamano del texto",
        "fr-FR": "Taille du texte",
        "it-IT": "Dimensione del testo",
        "ja-JP": "文字サイズ",
        "ko-KR": "글자 크기",
        "pl-PL": "Rozmiar tekstu",
        "pt-BR": "Tamanho do texto",
        "ru-RU": "Размер текста",
        "tr-TR": "Metin boyutu",
        "uk-UA": "Розмір тексту",
        "vi-VN": "Cỡ chữ",
        "zh-CN": "文字大小",
    },
    "top-center": {
        "de-DE": "Oben zentriert",
        "en-US": "Top-center",
        "es-ES": "Superior centrado",
        "fr-FR": "En haut au centre",
        "it-IT": "In alto al centro",
        "ja-JP": "上",
        "ko-KR": "중앙 상단",
        "pl-PL": "Wyśrodkowany na górze",
        "pt-BR": "Superior-centralizado",
        "ru-RU": "Сверху",
        "tr-TR": "Orta üst",
        "uk-UA": "Зверху праворуч",
        "vi-VN": "Chính giữa phía trên",
        "zh-CN": "顶部居中",
    },
    "top-left": {
        "de-DE": "Oben links",
        "en-US": "Top-left",
        "es-ES": "Superior izquierdo",
        "fr-FR": "Haut-gauche",
        "it-IT": "In alto a sinistra",
        "ja-JP": "左上",
        "ko-KR": "좌측 상단",
        "pl-PL": "Lewy górny róg",
        "pt-BR": "Superior-esquerdo",
        "ru-RU": "Левый верхний угол",
        "tr-TR": "Sol üst",
        "uk-UA": "Зверху ліворуч",
        "vi-VN": "Phía trên bên trái",
        "zh-CN": "左上角",
    },
    "top-right": {
        "de-DE": "Oben rechts",
        "en-US": "Top-right",
        "es-ES": "Superior derecho",
        "fr-FR": "En haut à droite",
        "it-IT": "In alto a destra",
        "ja-JP": "右上",
        "ko-KR": "우측 상단",
        "pl-PL": "Prawy górny róg",
        "pt-BR": "Superior-direito",
        "ru-RU": "Справа",
        "tr-TR": "Sağ üst",
        "uk-UA": "Зверху праворуч",
        "vi-VN": "Phía trên bên phải",
        "zh-CN": "右上角",
    },
    "touch-control-layout": {
        "de-DE": "Touch-Steuerungslayout",
        "en-US": "Touch control layout",
        "ja-JP": "タッチコントロールレイアウト",
        "pt-BR": "Layout do controle por toque",
        "ru-RU": "Расположение сенсорных кнопок",
        "tr-TR": "Dokunmatik kontrol şeması",
        "uk-UA": "Розташування сенсорного керування",
        "vi-VN": "Bố cục điều khiển cảm ứng",
        "zh-CN": "触摸控制布局",
    },
    "touch-controller": {
        "de-DE": "Touch-Controller",
        "en-US": "Touch controller",
        "es-ES": "Controles táctiles",
        "fr-FR": "Commandes tactiles",
        "it-IT": "Controller Touch",
        "ja-JP": "タッチコントローラー",
        "ko-KR": "터치 컨트롤",
        "pl-PL": "Sterowanie dotykiem",
        "pt-BR": "Controle de toque",
        "ru-RU": "Сенсорные кнопки",
        "tr-TR": "Dokunmatik oyun kumandası",
        "uk-UA": "Сенсорне керування",
        "vi-VN": "Bộ điều khiển cảm ứng",
        "zh-CN": "虚拟摇杆",
    },
    "transparent-background": {
        "de-DE": "Transparenter Hintergrund",
        "en-US": "Transparent background",
        "es-ES": "Fondo transparente",
        "fr-FR": "Fond transparent",
        "it-IT": "Sfondo trasparente",
        "ja-JP": "背景の透過",
        "ko-KR": "투명 배경",
        "pl-PL": "Przezroczyste tło",
        "pt-BR": "Fundo transparente",
        "ru-RU": "Прозрачный фон",
        "tr-TR": "Saydam arka plan",
        "uk-UA": "Прозоре тло",
        "vi-VN": "Trong suốt màu nền",
        "zh-CN": "透明背景",
    },
    "ui": {
        "de-DE": "Benutzeroberfläche",
        "en-US": "UI",
        "es-ES": "Interfaz de usuario",
        "fr-FR": "Interface utilisateur",
        "it-IT": "Interfaccia",
        "ja-JP": "UI",
        "ko-KR": "UI",
        "pl-PL": "Interfejs",
        "pt-BR": "Interface",
        "ru-RU": "Интерфейс",
        "tr-TR": "Kullanıcı arayüzü",
        "uk-UA": "Інтерфейс користувача",
        "vi-VN": "Giao diện",
        "zh-CN": "UI",
    },
    "unknown": {
        "de-DE": "Unbekannt",
        "en-US": "Unknown",
        "es-ES": "Desconocido",
        "it-IT": "Sconosciuto",
        "ja-JP": "不明",
        "ko-KR": "알 수 없음",
        "pl-PL": "Nieznane",
        "pt-BR": "Desconhecido",
        "ru-RU": "Неизвестный",
        "tr-TR": "Bilinmiyor",
        "uk-UA": "Невідомий",
        "vi-VN": "Không rõ",
        "zh-CN": "未知",
    },
    "unlimited": {
        "de-DE": "Unbegrenzt",
        "en-US": "Unlimited",
        "es-ES": "Ilimitado",
        "it-IT": "Illimitato",
        "ja-JP": "無制限",
        "ko-KR": "제한없음",
        "pl-PL": "Bez ograniczeń",
        "pt-BR": "Ilimitado",
        "ru-RU": "Неограничено",
        "tr-TR": "Limitsiz",
        "uk-UA": "Необмежено",
        "vi-VN": "Không giới hạn",
        "zh-CN": "无限制",
    },
    "unmuted": {
        "de-DE": "Ton an",
        "en-US": "Unmuted",
        "es-ES": "Activar sonido",
        "it-IT": "Microfono attivato",
        "ja-JP": "ミュート解除",
        "ko-KR": "음소거 해제",
        "pl-PL": "Wyciszenie wyłączone",
        "pt-BR": "Sem Mudo",
        "ru-RU": "Вкл микрофон",
        "tr-TR": "Açık",
        "uk-UA": "Увімкнути звук",
        "vi-VN": "Đã mở âm",
        "zh-CN": "已取消静音",
    },
    "use-mouse-absolute-position": {
        "de-DE": "Absolute Position der Maus verwenden",
        "en-US": "Use mouse's absolute position",
        "es-ES": "Usar la posición absoluta del ratón",
        "ja-JP": "マウスの絶対座標を使用",
        "ko-KR": "마우스 절대위치 사용",
        "pl-PL": "Użyj pozycji bezwzględnej myszy",
        "pt-BR": "Usar posição absoluta do mouse",
        "ru-RU": "Использовать абсолютное положение мыши",
        "tr-TR": "Farenin mutlak pozisyonunu baz al",
        "uk-UA": "Використовувати абсолютне положення миші",
        "vi-VN": "Sử dụng vị trí tuyệt đối của chuột",
        "zh-CN": "使用鼠标的绝对位置",
    },
    "user-agent-profile": {
        "de-DE": "User-Agent Profil",
        "en-US": "User-Agent profile",
        "es-ES": "Perfil del agente de usuario",
        "fr-FR": "Profil de l'agent utilisateur",
        "it-IT": "User-Agent",
        "ja-JP": "ユーザーエージェントプロファイル",
        "ko-KR": "사용자 에이전트 프로파일",
        "pl-PL": "Profil User-Agent",
        "pt-BR": "Perfil do User-Agent",
        "ru-RU": "Профиль устройства",
        "tr-TR": "Kullanıcı aracısı profili",
        "uk-UA": "Профіль User-Agent",
        "vi-VN": "User-Agent",
        "zh-CN": "浏览器UA伪装",
    },
    "vertical-sensitivity": {
        "de-DE": "Vertikale Empfindlichkeit",
        "en-US": "Vertical sensitivity",
        "es-ES": "Sensibilidad Vertical",
        "ja-JP": "上下方向の感度",
        "pl-PL": "Czułość pionowa",
        "pt-BR": "Sensibilidade vertical",
        "ru-RU": "Вертикальная чувствительность",
        "tr-TR": "Dikey hassasiyet",
        "uk-UA": "Вертикальна чутливість",
        "vi-VN": "Độ ngạy dọc",
        "zh-CN": "垂直灵敏度",
    },
    "vibration-intensity": {
        "de-DE": "Vibrationsstärke",
        "en-US": "Vibration intensity",
        "es-ES": "Intensidad de la vibración",
        "ja-JP": "振動の強さ",
        "ko-KR": "진동 세기",
        "pl-PL": "Siła wibracji",
        "pt-BR": "Intensidade da vibração",
        "ru-RU": "Сила вибрации",
        "tr-TR": "Titreşim gücü",
        "uk-UA": "Інтенсивність вібрації",
        "vi-VN": "Cường độ rung",
        "zh-CN": "振动强度",
    },
    "video": {
        "de-DE": "Video",
        "en-US": "Video",
        "es-ES": "Video",
        "fr-FR": "Vidéo",
        "it-IT": "Video",
        "ja-JP": "映像",
        "ko-KR": "비디오",
        "pl-PL": "Obraz",
        "pt-BR": "Vídeo",
        "ru-RU": "Видео",
        "tr-TR": "Görüntü",
        "uk-UA": "Відео",
        "vi-VN": "Hình ảnh",
        "zh-CN": "视频",
    },
    "visual-quality": {
        "de-DE": "Bildqualität",
        "en-US": "Visual quality",
        "es-ES": "Calidad visual",
        "fr-FR": "Qualité visuelle",
        "it-IT": "Profilo codec preferito",
        "ja-JP": "画質",
        "ko-KR": "시각적 품질",
        "pl-PL": "Jakość grafiki",
        "pt-BR": "Qualidade visual",
        "ru-RU": "Качество видеопотока",
        "tr-TR": "Görüntü kalitesi",
        "uk-UA": "Візуальна якість",
        "vi-VN": "Chất lượng hình ảnh",
        "zh-CN": "画质",
    },
    "visual-quality-high": {
        "de-DE": "Hoch",
        "en-US": "High",
        "es-ES": "Alto",
        "fr-FR": "Élevée",
        "it-IT": "Alta",
        "ja-JP": "高",
        "ko-KR": "높음",
        "pl-PL": "Wysoka",
        "pt-BR": "Alto",
        "ru-RU": "Высокое",
        "tr-TR": "Yüksek",
        "uk-UA": "Високий",
        "vi-VN": "Cao",
        "zh-CN": "高",
    },
    "visual-quality-low": {
        "de-DE": "Niedrig",
        "en-US": "Low",
        "es-ES": "Bajo",
        "fr-FR": "Basse",
        "it-IT": "Bassa",
        "ja-JP": "低",
        "ko-KR": "낮음",
        "pl-PL": "Niska",
        "pt-BR": "Baixo",
        "ru-RU": "Низкое",
        "tr-TR": "Düşük",
        "uk-UA": "Низький",
        "vi-VN": "Thấp",
        "zh-CN": "低",
    },
    "visual-quality-normal": {
        "de-DE": "Mittel",
        "en-US": "Normal",
        "es-ES": "Normal",
        "fr-FR": "Normal",
        "it-IT": "Normale",
        "ja-JP": "中",
        "ko-KR": "보통",
        "pl-PL": "Normalna",
        "pt-BR": "Normal",
        "ru-RU": "Среднее",
        "tr-TR": "Normal",
        "uk-UA": "Нормальний",
        "vi-VN": "Thường",
        "zh-CN": "中",
    },
    "volume": {
        "de-DE": "Lautstärke",
        "en-US": "Volume",
        "es-ES": "Volumen",
        "fr-FR": "Volume",
        "it-IT": "Volume",
        "ja-JP": "音量",
        "ko-KR": "음량",
        "pl-PL": "Głośność",
        "pt-BR": "Volume",
        "ru-RU": "Громкость",
        "tr-TR": "Ses düzeyi",
        "uk-UA": "Гучність",
        "vi-VN": "Âm lượng",
        "zh-CN": "音量",
    },
    "wait-time-countdown": {
        "de-DE": "Countdown",
        "en-US": "Countdown",
        "es-ES": "Cuenta Regresiva",
        "fr-FR": "Compte à rebours",
        "it-IT": "Countdown",
        "ja-JP": "カウントダウン",
        "ko-KR": "카운트다운",
        "pl-PL": "Pozostały czas oczekiwania",
        "pt-BR": "Contagem regressiva",
        "ru-RU": "Время до запуска",
        "tr-TR": "Geri sayım",
        "uk-UA": "Зворотній відлік",
        "vi-VN": "Đếm ngược",
        "zh-CN": "倒计时",
    },
    "wait-time-estimated": {
        "de-DE": "Geschätzte Endzeit",
        "en-US": "Estimated finish time",
        "es-ES": "Tiempo estimado de finalización",
        "fr-FR": "Temps estimé avant la fin",
        "it-IT": "Tempo residuo stimato",
        "ja-JP": "推定完了時間",
        "ko-KR": "예상 완료 시간",
        "pl-PL": "Szacowany czas zakończenia",
        "pt-BR": "Tempo estimado de conclusão",
        "ru-RU": "Примерное время запуска",
        "tr-TR": "Tahminî bitiş süresi",
        "uk-UA": "Розрахунковий час завершення",
        "vi-VN": "Thời gian hoàn thành dự kiến",
        "zh-CN": "预计等待时间",
    },
}

const LOCALE = Translations.getLocale();
const __ = Translations.get;


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
    $fragment.appendChild(CE('div', {'class': 'bx-reload-overlay'}, __('safari-failed-message')));

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
                                title: __('help'),
                                url: helpUrl,
                            }),
                    ),
                this.$content = CE('div', {'class': 'bx-dialog-content'}, content),
                !hideCloseButton && ($close = CE('button', {}, __('close'))),
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
        'On': __('powered-on'),
        'Off': __('powered-off'),
        'ConnectedStandby': __('standby'),
        'Unknown': __('unknown'),
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

        RemotePlay.#$content = CE('div', {}, __('getting-consoles-list'));
        RemotePlay.#dialog = new Dialog({
            title: __('remote-play'),
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
            $fragment.appendChild(CE('span', {}, __('no-consoles-found')));
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

                $settingNote.textContent = value === '1080p' ? '✅ ' + __('can-stream-xbox-360-games') : '❌ ' + __('cant-stream-xbox-360-games');
                setPref(Preferences.REMOTE_PLAY_RESOLUTION, value);
            });
            $resolutionSelect.dispatchEvent(new Event('change'));

            const $qualitySettings = CE('div', {'class': 'bx-remote-play-settings'},
                CE('div', {},
                    CE('label', {}, __('target-resolution'), $settingNote),
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
                    label: __('console-connect'),
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
                                    CE('label', {}, __('server')),
                                    CE('span', {}, getPreferredServerRegion()),
                                    CE('label', {}, __('wait-time-estimated')),
                                    $estimated = CE('span', {}),
                                    CE('label', {}, __('wait-time-countdown')),
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
            layoutChanged && Toast.show(__('touch-control-layout'), layout.name);

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
            label: __('map-mouse-to'),
            type: SettingElement.TYPE_OPTIONS,
            default: MouseMapTo[MouseMapTo.RS],
            options: {
                [MouseMapTo[MouseMapTo.RS]]: __('right-stick'),
                [MouseMapTo[MouseMapTo.LS]]: __('left-stick'),
                [MouseMapTo[MouseMapTo.OFF]]: __('off'),
            },
        },

        [MkbPreset.KEY_MOUSE_SENSITIVITY_Y]: {
            label: __('horizontal-sensitivity'),
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
            label: __('vertical-sensitivity'),
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
            label: __('deadzone-counterweight'),
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
            label: __('stick-decay-strength'),
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
            label: __('stick-decay-minimum'),
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
                    name: __('default'),
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

        Toast.show(__('mouse-and-keyboard'), __(this.#enabled ? 'enabled' : 'disabled'));

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
                    CE('p', {}, __('mkb-click-to-activate')),
                    CE('p', {}, __('press-key-to-toggle-mkb')({key: 'F9'})),
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
                        CE('p', {}, __('press-to-bind')),
                        CE('i', {}, __('press-esc-to-cancel')),
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
        this.#$.activateButton.querySelector('span').textContent = activated ? __('activated') : __('activate');
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
                this.#$.activateButton.querySelector('span').textContent = activated ? __('activated') : __('activate');

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
                newName = prompt(__('prompt-preset-name'), value);
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
                    title: __('rename'),
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
                      title: __('new'),
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
                        title: __('copy'),
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
                        title: __('delete'),
                        onClick: e => {
                            if (!confirm(__('confirm-delete-preset'))) {
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
                CE('i', {'class': 'bx-mkb-note'}, __('right-click-to-unbind')),
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

        $rows.appendChild(CE('i', {'class': 'bx-mkb-note'}, __('mkb-adjust-ingame-settings')),);

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
                           label: __('edit'),
                           onClick: e => this.#toggleEditing(true),
                   }),

                   // Activate button
                   this.#$.activateButton = createButton({
                           label: __('activate'),
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
                           label: __('cancel'),
                           style: ButtonStyle.GHOST,
                           onClick: e => {
                               // Restore preset
                               this.#switchPreset(this.#STATE.currentPresetId);
                               this.#toggleEditing(false);
                           },
                       }),

                   // Save button
                   createButton({
                           label: __('save'),
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
                    CE('span', {'class': 'bx-badge-name'}, __(`badge-${name}`)),
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
                    quality = __('visual-quality-high');
                } else if (profile.startsWith('42e')) {
                    quality = __('visual-quality-normal');
                } else if (profile.startsWith('420')) {
                    quality = __('visual-quality-low');
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
            [StreamStats.PING]: [__('stat-ping'), StreamStats.#$ping = CE('span', {}, '0')],
            [StreamStats.FPS]: [__('stat-fps'), StreamStats.#$fps = CE('span', {}, '0')],
            [StreamStats.BITRATE]: [__('stat-bitrate'), StreamStats.#$br = CE('span', {}, '0 Mbps')],
            [StreamStats.DECODE_TIME]: [__('stat-decode-time'), StreamStats.#$dt = CE('span', {}, '0ms')],
            [StreamStats.PACKETS_LOST]: [__('stat-packets-lost'), StreamStats.#$pl = CE('span', {}, '0')],
            [StreamStats.FRAMES_LOST]: [__('stat-frames-lost'), StreamStats.#$fl = CE('span', {}, '0')],
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

    // Deprecated
    static get DEPRECATED_USE_DESKTOP_CODEC() { return 'use_desktop_codec'; }

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
                'default': __('default'),
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
                'auto': __('default'),
                '1080p': '1080p',
                '720p': '720p',
            },
        },
        [Preferences.STREAM_CODEC_PROFILE]: {
            'default': 'default',
            'options': (() => {
                const options = {
                    'default': __('default'),
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
                        options.default = `${__('visual-quality-low')} (${__('default')})`;
                    } else {
                        options.low = __('visual-quality-low');
                    }
                }
                if (hasNormalCodec) {
                    if (!hasLowCodec && !hasHighCodec) {
                        options.default = `${__('visual-quality-normal')} (${__('default')})`;
                    } else {
                        options.normal = __('visual-quality-normal');
                    }
                }
                if (hasHighCodec) {
                    if (!hasLowCodec && !hasNormalCodec) {
                        options.default = `${__('visual-quality-high')} (${__('default')})`;
                    } else {
                        options.high = __('visual-quality-high');
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
                    setting.note = '⚠️ ' + __('browser-unsupported-feature');
                } else {
                    // Set default value to the best codec profile
                    setting.default = keys[keys.length - 1];
                }
            },
        },
        [Preferences.PREFER_IPV6_SERVER]: {
            'default': false,
        },
        [Preferences.SCREENSHOT_BUTTON_POSITION]: {
            'default': 'bottom-left',
            'options': {
                'bottom-left': __('bottom-left'),
                'bottom-right': __('bottom-right'),
                'none': __('disable'),
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
                'default': __('default'),
                'all': __('tc-all-games'),
                'off': __('off'),
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
                'default': __('default'),
                'white': __('tc-all-white'),
                'muted': __('tc-muted-colors'),
            },
            'unsupported': !HAS_TOUCH_SUPPORT,
        },
        [Preferences.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM]: {
            'default': 'default',
            'options': {
                'default': __('default'),
                'muted': __('tc-muted-colors'),
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

        [Preferences.CONTROLLER_ENABLE_SHORTCUTS]: {
            'default': false,
        },

        [Preferences.CONTROLLER_ENABLE_VIBRATION]: {
            'default': true,
        },

        [Preferences.CONTROLLER_DEVICE_VIBRATION]: {
            'default': 'off',
            'options': {
                'on': __('on'),
                'auto': __('device-vibration-not-using-gamepad'),
                'off': __('off'),
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
                    return userAgent.match(/(android|iphone|ipad)/) ? __('browser-unsupported-feature') : false;
                })(),
            'ready': () => {
                const pref = Preferences.SETTINGS[Preferences.MKB_ENABLED];
                const note = __(pref.unsupported ? 'browser-unsupported-feature' : 'mkb-disclaimer');
                Preferences.SETTINGS[Preferences.MKB_ENABLED].note = '⚠️ ' + note;
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
                'show': __('rocket-always-show'),
                'hide-queue': __('rocket-hide-queue'),
                'hide': __('rocket-always-hide'),
            },
        },
        [Preferences.UI_LAYOUT]: {
            'default': 'default',
            'options': {
                'default': __('default'),
                'tv': __('smart-tv'),
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
                [UserAgent.PROFILE_DEFAULT]: __('default'),
                [UserAgent.PROFILE_EDGE_WINDOWS]: 'Edge + Windows',
                [UserAgent.PROFILE_SAFARI_MACOS]: 'Safari + macOS',
                [UserAgent.PROFILE_SMARTTV_TIZEN]: 'Samsung Smart TV',
                [UserAgent.PROFILE_CUSTOM]: __('custom'),
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

                'fill': __('stretch'),
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
            'default': true,
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
            'default': [StreamStats.PING, StreamStats.FPS, StreamStats.PACKETS_LOST, StreamStats.FRAMES_LOST],
            'multiple_options': {
                [StreamStats.PING]: `${StreamStats.PING.toUpperCase()}: ${__('stat-ping')}`,
                [StreamStats.FPS]: `${StreamStats.FPS.toUpperCase()}: ${__('stat-fps')}`,
                [StreamStats.BITRATE]: `${StreamStats.BITRATE.toUpperCase()}: ${__('stat-bitrate')}`,
                [StreamStats.DECODE_TIME]: `${StreamStats.DECODE_TIME.toUpperCase()}: ${__('stat-decode-time')}`,
                [StreamStats.PACKETS_LOST]: `${StreamStats.PACKETS_LOST.toUpperCase()}: ${__('stat-packets-lost')}`,
                [StreamStats.FRAMES_LOST]: `${StreamStats.FRAMES_LOST.toUpperCase()}: ${__('stat-frames-lost')}`,
            },
            'params': {
                size: 6,
            },
        },
        [Preferences.STATS_SHOW_WHEN_PLAYING]: {
            'default': false,
        },
        [Preferences.STATS_QUICK_GLANCE]: {
            'default': false,
        },
        [Preferences.STATS_POSITION]: {
            'default': 'top-left',
            'options': {
                'top-left': __('top-left'),
                'top-center': __('top-center'),
                'top-right': __('top-right'),
            },
        },
        [Preferences.STATS_TEXT_SIZE]: {
            'default': '0.9rem',
            'options': {
                '0.9rem': __('small'),
                '1.0rem': __('normal'),
                '1.1rem': __('large'),
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

        // Deprecated
        /*
        [Preferences.DEPRECATED_USE_DESKTOP_CODEC]: {
            'default': false,
            'migrate': function(savedPrefs, value) {
                const quality = value ? 'high' : 'default';
                this.set(Preferences.STREAM_CODEC_PROFILE, quality);
                savedPrefs[Preferences.STREAM_CODEC_PROFILE] = quality;
            },
        },
        */
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

            /*
            if (setting.migrate && !(settingId in savedPrefs)) {
                setting.migrate.call(this, savedPrefs, savedPrefs[settingId]);
            }
            */
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
            const text = 'isMouseAndKeyboardTitle:()=>yn';
            if (!funcStr.includes(text)) {
                return false;
            }

            return funcStr.replace(text, `isMouseAndKeyboardTitle:()=>(function(e) { return e && e.details ? window.NATIVE_MKB_TITLES.includes(e.details.productId) : true; })`);
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
    };

    static #PATCH_ORDERS = [
        getPref(Preferences.BLOCK_TRACKING) && [
            'disableAiTrack',
            'disableTelemetry',
        ],

        ['disableStreamGate'],

        getPref(Preferences.UI_LAYOUT) === 'tv' && ['tvLayout'],

        ENABLE_XCLOUD_LOGGER && [
            'enableXcloudLogger',
            'enableConsoleLogging',
        ],

        getPref(Preferences.BLOCK_TRACKING) && [
            'disableTrackEvent',
            'blockWebRtcStatsCollector',
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
            'https://peoplehub.xboxlive.com/users/me',
            // 'https://accounts.xboxlive.com/family/memberXuid',
            'https://notificationinbox.xboxlive.com',
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

        for (let blocked of BLOCKED_URLS) {
            if (!url.startsWith(blocked)) {
                continue;
            }

            return new Response('{"acc":1,"webResult":{}}', {
                status: 200,
                statusText: '200 OK',
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
            title: __('remote-play'),
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
                           createButton({icon: Icon.QUESTION, label: __('help'), url: 'https://better-xcloud.github.io/features/'}),
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
            [Preferences.BETTER_XCLOUD_LOCALE]: __('language'),
            [Preferences.REMOTE_PLAY_ENABLED]: __('enable-remote-play-feature'),
        },
        [__('server')]: {
            [Preferences.SERVER_REGION]: __('region'),
            [Preferences.STREAM_PREFERRED_LOCALE]: __('preferred-game-language'),
            [Preferences.PREFER_IPV6_SERVER]: __('prefer-ipv6-server'),
        },
        [__('stream')]: {
            [Preferences.STREAM_TARGET_RESOLUTION]: __('target-resolution'),
            [Preferences.STREAM_CODEC_PROFILE]: __('visual-quality'),
            [Preferences.AUDIO_ENABLE_VOLUME_CONTROL]: __('enable-volume-control'),
            [Preferences.AUDIO_MIC_ON_PLAYING]: __('enable-mic-on-startup'),
            [Preferences.STREAM_DISABLE_FEEDBACK_DIALOG]: __('disable-post-stream-feedback-dialog'),
        },

        [__('mouse-and-keyboard')]: {
            // '_note': '⚠️ ' + __('may-not-work-properly'),
            // [Preferences.MKB_ENABLED]: [__('enable-mkb'), __('only-supports-some-games')],
            [Preferences.MKB_ENABLED]: __('enable-mkb'),
            [Preferences.MKB_HIDE_IDLE_CURSOR]: __('hide-idle-cursor'),
        },

        /*
        [__('controller')]: {
            [Preferences.CONTROLLER_ENABLE_SHORTCUTS]: __('enable-controller-shortcuts'),
        },
        */
        [__('touch-controller')]: {
            _note: !HAS_TOUCH_SUPPORT ? '⚠️ ' + __('device-unsupported-touch') : null,
            [Preferences.STREAM_TOUCH_CONTROLLER]: __('tc-availability'),
            [Preferences.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD]: __('tc-standard-layout-style'),
            [Preferences.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM]: __('tc-custom-layout-style'),
        },

        [__('loading-screen')]: {
            [Preferences.UI_LOADING_SCREEN_GAME_ART]: __('show-game-art'),
            [Preferences.UI_LOADING_SCREEN_WAIT_TIME]: __('show-wait-time'),
            [Preferences.UI_LOADING_SCREEN_ROCKET]: __('rocket-animation'),
        },
        [__('ui')]: {
            [Preferences.UI_LAYOUT]: __('layout'),
            [Preferences.STREAM_SIMPLIFY_MENU]: __('simplify-stream-menu'),
            [Preferences.SKIP_SPLASH_VIDEO]: __('skip-splash-video'),
            [Preferences.HIDE_DOTS_ICON]: __('hide-system-menu-icon'),
            [Preferences.REDUCE_ANIMATIONS]: __('reduce-animations'),
            [Preferences.SCREENSHOT_BUTTON_POSITION]: __('screenshot-button-position'),
        },
        [__('other')]: {
            [Preferences.BLOCK_SOCIAL_FEATURES]: __('disable-social-features'),
            [Preferences.BLOCK_TRACKING]: __('disable-xcloud-analytics'),
        },
        [__('advanced')]: {
            [Preferences.USER_AGENT_PROFILE]: __('user-agent-profile'),
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
                        label += ` (${__('default')})`;
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
        label: __('settings-reload'),
        style: ButtonStyle.PRIMARY | ButtonStyle.FOCUSABLE | ButtonStyle.FULL_WIDTH,
        onClick: e => {
            window.location.reload();
            $reloadBtn.disabled = true;
            $reloadBtn.textContent = __('settings-reloading');
        },
    });
    $reloadBtn.setAttribute('tabindex', 0);
    $wrapper.appendChild($reloadBtn);

    // Donation link
    const $donationLink = CE('a', {'class': 'bx-donation-link', href: 'https://ko-fi.com/redphx', target: '_blank'}, `❤️ ${__('support-better-xcloud')}`);
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
                        confirm(__('confirm-reload-stream')) && window.location.reload();
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
                    $btnStreamSettings = cloneStreamHudButton($orgButton, __('menu-stream-settings'), Icon.STREAM_SETTINGS);
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
                    $btnStreamStats = cloneStreamHudButton($orgButton, __('menu-stream-stats'), Icon.STREAM_STATS);
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
                    label: __('mouse-and-keyboard'),
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
                    label: __('audio'),
                    help_url: 'https://better-xcloud.github.io/ingame-features/#audio',
                    items: [
                        {
                            pref: Preferences.AUDIO_VOLUME,
                            label: __('volume'),
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
                    label: __('video'),
                    help_url: 'https://better-xcloud.github.io/ingame-features/#video',
                    note: CE('div', {'class': 'bx-quick-settings-bar-note bx-clarity-boost-warning'}, `⚠️ ${__('clarity-boost-warning')}`),
                    items: [
                        {
                            pref: Preferences.VIDEO_RATIO,
                            label: __('ratio'),
                            onChange: updateVideoPlayerCss,
                        },

                        {
                            pref: Preferences.VIDEO_CLARITY,
                            label: __('clarity'),
                            onChange: updateVideoPlayerCss,
                            unsupported: isSafari,
                        },

                        {
                            pref: Preferences.VIDEO_SATURATION,
                            label: __('saturation'),
                            onChange: updateVideoPlayerCss,
                        },

                        {
                            pref: Preferences.VIDEO_CONTRAST,
                            label: __('contrast'),
                            onChange: updateVideoPlayerCss,
                        },

                        {
                            pref: Preferences.VIDEO_BRIGHTNESS,
                            label: __('brightness'),
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
                    label: __('controller'),
                    help_url: 'https://better-xcloud.github.io/ingame-features/#controller',
                    items: [
                        {
                            pref: Preferences.CONTROLLER_ENABLE_VIBRATION,
                            label: __('controller-vibration'),
                            unsupported: !VibrationManager.supportControllerVibration(),
                            onChange: VibrationManager.updateGlobalVars,
                        },

                        {
                            pref: Preferences.CONTROLLER_DEVICE_VIBRATION,
                            label: __('device-vibration'),
                            unsupported: !VibrationManager.supportDeviceVibration(),
                            onChange: VibrationManager.updateGlobalVars,
                        },

                        (VibrationManager.supportControllerVibration() || VibrationManager.supportDeviceVibration()) && {
                            pref: Preferences.CONTROLLER_VIBRATION_INTENSITY,
                            label: __('vibration-intensity'),
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
                    label: __('touch-controller'),
                    items: [
                        {
                            label: __('layout'),
                            content: CE('select', {disabled: true}, CE('option', {}, __('default'))),
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
                                        $elm.appendChild(CE('option', {value: ''}, __('default')));
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
                    label: __('menu-stream-stats'),
                    help_url: 'https://better-xcloud.github.io/stream-stats/',
                    items: [
                        {
                            pref: Preferences.STATS_SHOW_WHEN_PLAYING,
                            label: __('show-stats-on-startup'),
                        },
                        {
                            pref: Preferences.STATS_QUICK_GLANCE,
                            label: __('enable-quick-glance-mode'),
                            onChange: e => {
                                e.target.checked ? StreamStats.quickGlanceSetup() : StreamStats.quickGlanceStop();
                            },
                        },
                        {
                            pref: Preferences.STATS_ITEMS,
                            label: __('stats'),
                            onChange: StreamStats.refreshStyles,
                        },
                        {
                            pref: Preferences.STATS_POSITION,
                            label: __('position'),
                            onChange: StreamStats.refreshStyles,
                        },
                        {
                            pref: Preferences.STATS_TEXT_SIZE,
                            label: __('text-size'),
                            onChange: StreamStats.refreshStyles,
                        },
                        {
                            pref: Preferences.STATS_OPACITY,
                            label: __('opacity'),
                            onChange: StreamStats.refreshStyles,
                        },
                        {
                            pref: Preferences.STATS_TRANSPARENT,
                            label: __('transparent-background'),
                            onChange: StreamStats.refreshStyles,
                        },
                        {
                            pref: Preferences.STATS_CONDITIONAL_FORMATTING,
                            label: __('conditional-formatting'),
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
                            title: __('help'),
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
                            setting.unsupported && CE('div', {'class': 'bx-quick-settings-bar-note'}, __('browser-unsupported-feature')),
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

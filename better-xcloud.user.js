// ==UserScript==
// @name         Better xCloud
// @namespace    https://github.com/redphx
// @version      2.0.2
// @description  Improve Xbox Cloud Gaming (xCloud) experience
// @author       redphx
// @license      MIT
// @match        https://www.xbox.com/*/play*
// @run-at       document-start
// @grant        none
// @updateURL    https://raw.githubusercontent.com/redphx/better-xcloud/main/better-xcloud.meta.js
// @downloadURL  https://github.com/redphx/better-xcloud/releases/latest/download/better-xcloud.user.js
// ==/UserScript==
'use strict';

const SCRIPT_VERSION = '2.0.2';
const SCRIPT_HOME = 'https://github.com/redphx/better-xcloud';

const ENABLE_MKB = false;

console.log(`[Better xCloud] readyState: ${document.readyState}`);


// Quickly create a tree of elements without having to use innerHTML
function createElement(elmName, props = {}) {
    let $elm;
    const hasNs = 'xmlns' in props;

    if (hasNs) {
        $elm = document.createElementNS(props.xmlns, elmName);
    } else {
        $elm = document.createElement(elmName);
    }

    for (let key in props) {
        if (key === 'xmlns') {
            continue;
        }

        if (!props.hasOwnProperty(key) || $elm.hasOwnProperty(key)) {
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
            $elm.textContent = arg;
        } else if (arg) {
            $elm.appendChild(arg);
        }
    }

    return $elm;
}


const Translations = {
    getLocale: () => {
        const supportedLocales = [
            'de-DE',
            'en-US',
            'es-ES',
            'fr-FR',
            'ko-KR',
            'it-IT',
            'ja-JP',
            'pl-PL',
            'pt-BR',
            'ru-RU',
            'tr-TR',
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

    get: (key) => {
        const texts = Translations[key] || alert(`Missing translation key: ${key}`);
        return texts[LOCALE] || texts['en-US'];
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
        "vi-VN": "Nâng cao",
        "zh-CN": "高级选项",
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
        "vi-VN": "Trình duyệt không hỗ trợ tính năng này",
        "zh-CN": "您的浏览器不支持此功能",
    },
    "can-stream-xbox-360-games": {
        "de-DE": "Kann Xbox 360 Spiele streamen",
        "en-US": "Can stream Xbox 360 games",
        "es-ES": "Puede transmitir juegos de Xbox 360",
        "it-IT": "Puoi riprodurre i giochi Xbox 360",
        "ja-JP": "Xbox 360ゲームのストリーミング可能",
        "pl-PL": "Można strumieniować gry Xbox 360",
        "pt-BR": "Pode transmitir jogos de Xbox 360",
        "ru-RU": "Позволяет транслировать Xbox 360 игры",
        "tr-TR": "Xbox 360 oyunlarına erişim sağlanabilir",
        "vi-VN": "Có thể stream các game Xbox 360",
    },
    "cant-stream-xbox-360-games": {
        "de-DE": "Kann Xbox 360 Spiele nicht streamen",
        "en-US": "Can't stream Xbox 360 games",
        "es-ES": "No puede transmitir juegos de Xbox 360",
        "it-IT": "Impossibile riprodurre i giochi Xbox 360",
        "ja-JP": "Xbox 360ゲームのストリーミング不可",
        "pl-PL": "Nie można strumieniować gier Xbox 360",
        "pt-BR": "Não pode transmitir jogos de Xbox 360",
        "ru-RU": "Невозможно транслировать игры Xbox 360",
        "tr-TR": "Xbox 360 oyunlarına erişim sağlanamaz",
        "vi-VN": "Không thể stream các game Xbox 360",
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
        "vi-VN": "Các tùy chỉnh này không hoạt động khi chế độ Clarity Boost đang được bật",
        "zh-CN": "这些设置在 Clarity Boost 清晰度增强 开启时不可用",
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
        "vi-VN": "Thay đổi màu chữ tùy theo giá trị",
        "zh-CN": "更改文本颜色",
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
        "vi-VN": "Bạn có muốn kết nối lại stream không?",
        "zh-CN": "您想要刷新吗？",
    },
    "console-connect": {
        "de-DE": "Verbinden",
        "en-US": "Connect",
        "es-ES": "Conectar",
        "it-IT": "Connetti",
        "ja-JP": "本体に接続",
        "pl-PL": "Połącz",
        "pt-BR": "Conectar",
        "ru-RU": "Подключиться",
        "tr-TR": "Bağlan",
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
        "vi-VN": "Độ tương phản",
        "zh-CN": "对比度",
    },
    "controller": {
        "de-DE": "Controller",
        "en-US": "Controller",
        "es-ES": "Joystick",
        "it-IT": "Controller",
        "ja-JP": "コントローラー",
        "pl-PL": "Kontroler",
        "pt-BR": "Controle",
        "ru-RU": "Контроллер",
        "tr-TR": "Oyun Kumandası",
        "vi-VN": "Bộ điều khiển",
        "zh-CN": "手柄",
    },
    "controller-polling-rate": {
        "de-DE": "Controller-Abfragerate",
        "en-US": "Controller polling rate",
        "es-ES": "Tasa de sondeo del Joystick",
        "ja-JP": "コントローラーポーリングレート",
        "pl-PL": "Częstotliwości raportowania kontrolera",
        "pt-BR": "Taxa de consulta do controle",
        "ru-RU": "Частота опроса контроллера",
        "tr-TR": "Oyun kumandası işlem hızı",
        "vi-VN": "Tần suất cập nhật của bộ điều khiển",
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
        "vi-VN": "Tùy chỉnh",
        "zh-CN": "自定义",
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
        "vi-VN": "Mặc định",
        "zh-CN": "默认",
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
        "vi-VN": "Thiết bị này không hỗ trợ cảm ứng",
        "zh-CN": "您的设备不支持触摸",
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
        "vi-VN": "Vô hiệu hóa",
        "zh-CN": "禁用",
    },
    "disable-bandwidth-checking": {
        "de-DE": "Bandbreitenüberprüfung deaktivieren",
        "en-US": "Disable bandwidth checking",
        "es-ES": "Desactivar comprobación de ancho de banda",
        "fr-FR": "Désactiver la vérification de bande passante",
        "it-IT": "Disabilita il controllo della larghezza di banda",
        "ja-JP": "帯域幅の警告を非表示",
        "ko-KR": "대역폭 확인 비활성화",
        "pl-PL": "Wyłącz sprawdzanie przepustowości",
        "pt-BR": "Desativar verificação de banda",
        "ru-RU": "Отключить проверку интернета",
        "tr-TR": "İnternet hız testini atla",
        "vi-VN": "Tắt kiểm tra băng thông",
        "zh-CN": "禁用带宽测速",
    },
    "disable-post-stream-feedback-dialog": {
        "de-DE": "Feedback-Dialog beim Beenden deaktivieren",
        "en-US": "Disable post-stream feedback dialog",
        "es-ES": "Desactivar diálogo de retroalimentación post-stream",
        "fr-FR": "Désactiver la boîte de dialogue de commentaires post-stream",
        "it-IT": "Disabilita la finestra di feedback al termine dello stream",
        "ja-JP": "ストリーミング終了後のフィードバック画面を非表示",
        "pl-PL": "Wyłącz okno opinii po zakończeniu transmisji",
        "pt-BR": "Desativar o diálogo de comentários pós-transmissão",
        "ru-RU": "Отключить диалог обратной связи после стрима",
        "tr-TR": "Yayın sonrası geribildirim ekranını kapat",
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
        "vi-VN": "Khóa phân tích thông tin của xCloud",
        "zh-CN": "关闭 xCloud 遥测数据统计",
    },
    "enable-controller-shortcuts": {
        "de-DE": "Controller-Shortcuts aktivieren",
        "en-US": "Enable controller shortcuts",
        "es-ES": "Habilitar accesos directos del Joystick",
        "it-IT": "Consenti scorciatoie da controller",
        "ja-JP": "コントローラーショートカットを有効化",
        "pl-PL": "Włącz skróty kontrolera",
        "pt-BR": "Ativar atalhos do controle",
        "ru-RU": "Включить быстрые клавиши контроллера",
        "tr-TR": "Oyun kumandası kısayollarını aç",
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
        "vi-VN": "Bật mic lúc vào game",
        "zh-CN": "游戏启动时打开麦克风",
    },
    "enable-mkb": {
        "de-DE": "Maus- und Tastaturunterstützung aktivieren",
        "en-US": "Enable Mouse & Keyboard support",
        "es-ES": "Habilitar soporte para ratón y teclado",
        "ja-JP": "マウス＆キーボードのサポートを有効化",
        "pl-PL": "Włącz obsługę myszy i klawiatury",
        "pt-BR": "Habilitar suporte ao Mouse & Teclado",
        "ru-RU": "Включить поддержку мыши и клавиатуры",
        "tr-TR": "Klavye ve fare desteğini aktive et",
        "vi-VN": "Kích hoạt hỗ trợ Chuột & Bàn phím",
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
        "vi-VN": "Bật chế độ \"Xem nhanh\"",
        "zh-CN": "仅在打开设置时显示统计信息",
    },
    "enable-remote-play-feature": {
        "de-DE": "\"Remote Play\" Funktion aktivieren",
        "en-US": "Enable the \"Remote Play\" feature",
        "es-ES": "Activar la función \"Reproducción remota\"",
        "ja-JP": "リモートプレイ機能を有効化",
        "pl-PL": "Włącz funkcję \"Gra zdalna\"",
        "pt-BR": "Ativar o recurso \"Reprodução Remota\"",
        "ru-RU": "Включить функцию «Удаленная игра»",
        "tr-TR": "\"Uzaktan Oynama\" özelliğini aktive et",
        "vi-VN": "Bật tính năng \"Chơi từ xa\"",
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
        "vi-VN": "Bật tính năng điều khiển âm lượng",
        "zh-CN": "启用音量控制",
    },
    "fast": {
        "de-DE": "Schnell",
        "en-US": "Fast",
        "es-ES": "Rápido",
        "ja-JP": "高速",
        "pl-PL": "Szybko",
        "pt-BR": "Rápido",
        "ru-RU": "Быстрый",
        "tr-TR": "Hızlı",
        "vi-VN": "Nhanh",
    },
    "getting-consoles-list": {
        "de-DE": "Rufe Liste der Konsolen ab...",
        "en-US": "Getting the list of consoles...",
        "es-ES": "Obteniendo la lista de consolas...",
        "it-IT": "Ottenere la lista delle consoles...",
        "ja-JP": "本体のリストを取得中...",
        "pl-PL": "Pobieranie listy konsoli...",
        "pt-BR": "Obtendo a lista de consoles...",
        "ru-RU": "Получение списка консолей...",
        "tr-TR": "Konsol listesine erişiliyor...",
        "vi-VN": "Đang lấy danh sách các console...",
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
        "vi-VN": "Ẩn biểu tượng của menu Hệ thống",
        "zh-CN": "隐藏系统菜单图标",
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
        "vi-VN": "Lớn",
        "zh-CN": "大",
    },
    "layout": {
        "de-DE": "Layout",
        "en-US": "Layout",
        "es-ES": "Diseño",
        "ja-JP": "レイアウト",
        "pl-PL": "Układ",
        "pt-BR": "Layout",
        "ru-RU": "Расположение",
        "tr-TR": "Arayüz Görünümü",
        "vi-VN": "Bố cục",
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
        "vi-VN": "Màn hình chờ",
        "zh-CN": "载入画面",
    },
    "max-bitrate": {
        "de-DE": "Max. Bitrate",
        "en-US": "Max bitrate",
        "es-ES": "Tasa de bits máxima",
        "ja-JP": "最大ビットレート",
        "pl-PL": "Maksymalny bitrate",
        "pt-BR": "Taxa máxima dos bits",
        "ru-RU": "Максимальный битрейт",
        "tr-TR": "Maksimum bithızı",
        "vi-VN": "Bitrate tối đa",
    },
    "may-not-work-properly": {
        "de-DE": "Funktioniert evtl. nicht fehlerfrei!",
        "en-US": "May not work properly!",
        "es-ES": "¡Puede que no funcione correctamente!",
        "ja-JP": "正常に動作しない場合があります！",
        "pl-PL": "Może nie działać poprawnie!",
        "pt-BR": "Pode não funcionar corretamente!",
        "ru-RU": "Может работать некорректно!",
        "tr-TR": "Düzgün çalışmayabilir!",
        "vi-VN": "Có thể không hoạt động!",
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
        "ru-RU": "Статистика потоковой передачи",
        "tr-TR": "Yayın durumu",
        "vi-VN": "Thông số stream",
        "zh-CN": "串流统计数据",
    },
    "microphone": {
        "de-DE": "Mikrofon",
        "en-US": "Microphone",
        "es-ES": "Micrófono",
        "it-IT": "Microfono",
        "ja-JP": "マイク",
        "pl-PL": "Mikrofon",
        "pt-BR": "Microfone",
        "ru-RU": "Микрофон",
        "tr-TR": "Mikrofon",
        "vi-VN": "Micro",
        "zh-CN": "麦克风",
    },
    "mouse-and-keyboard": {
        "de-DE": "Maus & Tastatur",
        "en-US": "Mouse & Keyboard",
        "es-ES": "Ratón y teclado",
        "ja-JP": "マウス＆キーボード",
        "pl-PL": "Mysz i klawiatura",
        "pt-BR": "Mouse e Teclado",
        "ru-RU": "Мышь и клавиатура",
        "tr-TR": "Klavye ve Fare",
        "vi-VN": "Chuột và Bàn phím",
    },
    "muted": {
        "de-DE": "Stumm",
        "en-US": "Muted",
        "es-ES": "Silenciado",
        "it-IT": "Microfono disattivato",
        "ja-JP": "ミュート",
        "pl-PL": "Wyciszony",
        "pt-BR": "Mudo",
        "ru-RU": "Выкл микрофон",
        "tr-TR": "Kapalı",
        "vi-VN": "Đã tắt âm",
        "zh-CN": "静音",
    },
    "no-consoles-found": {
        "de-DE": "Keine Konsolen gefunden",
        "en-US": "No consoles found",
        "es-ES": "No se encontraron consolas",
        "it-IT": "Nessuna console trovata",
        "ja-JP": "本体が見つかりません",
        "pl-PL": "Nie znaleziono konsoli",
        "pt-BR": "Nenhum console encontrado",
        "ru-RU": "Консолей не найдено",
        "tr-TR": "Konsol bulunamadı",
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
        "vi-VN": "Tắt",
        "zh-CN": "关",
    },
    "on": {
        "de-DE": "An",
        "en-US": "On",
        "es-ES": "Activado",
        "it-IT": "Attivo",
        "ja-JP": "オン",
        "pl-PL": "Włącz",
        "pt-BR": "Ativado",
        "ru-RU": "Вкл",
        "tr-TR": "Açık",
        "vi-VN": "Bật",
        "zh-CN": "开启",
    },
    "only-supports-some-games": {
        "de-DE": "Unterstützt nur einige Spiele",
        "en-US": "Only supports some games",
        "es-ES": "Sólo soporta algunos juegos",
        "ja-JP": "一部のゲームのみサポート",
        "pl-PL": "Wspiera tylko niektóre gry",
        "pt-BR": "Suporta apenas alguns jogos",
        "ru-RU": "Поддерживает только некоторые игры",
        "tr-TR": "Yalnızca belli oyunlar destekleniyor",
        "vi-VN": "Chỉ hỗ trợ một vài game",
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
        "vi-VN": "Khác",
        "zh-CN": "其他",
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
        "vi-VN": "Vị trí",
        "zh-CN": "位置",
    },
    "powered-off": {
        "de-DE": "Ausgeschaltet",
        "en-US": "Powered off",
        "es-ES": "Desactivado",
        "it-IT": "Spento",
        "ja-JP": "本体オフ",
        "pl-PL": "Zasilanie wyłączone",
        "pt-BR": "Desligado",
        "ru-RU": "Выключено",
        "tr-TR": "Kapalı",
        "vi-VN": "Đã tắt nguồn",
        "zh-CN": "关机",
    },
    "powered-on": {
        "de-DE": "Eingeschaltet",
        "en-US": "Powered on",
        "es-ES": "Activado",
        "it-IT": "Acceso",
        "ja-JP": "本体オン",
        "pl-PL": "Zasilanie włączone",
        "pt-BR": "Ligado",
        "ru-RU": "Включено",
        "tr-TR": "Açık",
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
        "vi-VN": "Ngôn ngữ game ưu tiên",
        "zh-CN": "首选游戏语言",
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
        "vi-VN": "Khu vực",
        "zh-CN": "地区",
    },
    "remote-play": {
        "de-DE": "Remote Play",
        "en-US": "Remote Play",
        "es-ES": "Reproducción remota",
        "it-IT": "Riproduzione Remota",
        "ja-JP": "リモートプレイ",
        "pl-PL": "Gra zdalna",
        "pt-BR": "Jogo Remoto",
        "ru-RU": "Удаленная игра",
        "tr-TR": "Uzaktan Bağlanma",
        "vi-VN": "Chơi từ xa",
        "zh-CN": "远程游玩",
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
        "vi-VN": "Độ bão hòa",
        "zh-CN": "饱和度",
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
        "ko-KR": "변경 사항을 적용하려면 페이지를 다시 로드하세요.",
        "pl-PL": "Odśwież stronę, aby zastosować zmiany",
        "pt-BR": "Recarregue a página para refletir as alterações",
        "ru-RU": "Перезагрузить страницу, чтобы применить изменения",
        "tr-TR": "Kaydetmek için sayfayı yenile",
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
        "vi-VN": "Bỏ qua video Xbox",
        "zh-CN": "跳过 Xbox 启动动画",
    },
    "slow": {
        "de-DE": "Langsam",
        "en-US": "Slow",
        "es-ES": "Lento",
        "ja-JP": "低速",
        "pl-PL": "Wolno",
        "pt-BR": "Lento",
        "ru-RU": "Медленный",
        "tr-TR": "Yavaş",
        "vi-VN": "Chậm",
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
        "vi-VN": "Nhỏ",
        "zh-CN": "小",
    },
    "smart-tv": {
        "de-DE": "Smart TV",
        "en-US": "Smart TV",
        "es-ES": "Smart TV",
        "ja-JP": "スマートTV",
        "pl-PL": "Smart TV",
        "pt-BR": "Smart TV",
        "ru-RU": "Smart TV",
        "tr-TR": "Akıllı TV",
        "vi-VN": "TV thông minh",
    },
    "sound": {
        "de-DE": "Ton",
        "en-US": "Sound",
        "es-ES": "Sonido",
        "it-IT": "Suoni",
        "ja-JP": "サウンド",
        "pl-PL": "Dźwięk",
        "pt-BR": "Som",
        "ru-RU": "Звук",
        "tr-TR": "Ses",
        "vi-VN": "Âm thanh",
        "zh-CN": "声音",
    },
    "standby": {
        "de-DE": "Standby",
        "en-US": "Standby",
        "es-ES": "Modo de espera",
        "it-IT": "Sospendi",
        "ja-JP": "スタンバイ",
        "pl-PL": "Stan czuwania",
        "pt-BR": "Suspenso",
        "ru-RU": "Режим ожидания",
        "tr-TR": "Beklemede",
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
        "vi-VN": "Các thông số",
        "zh-CN": "统计信息",
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
        "vi-VN": "Stream",
        "zh-CN": "串流",
    },
    "stream-stats-settings": {
        "de-DE": "Stream Statistik Einstellungen",
        "en-US": "Stream stats settings",
        "es-ES": "Ajustes de estadísticas de stream",
        "fr-FR": "Paramètres des statistiques du stream",
        "it-IT": "Impostazioni statistiche dello streaming",
        "ja-JP": "ストリーミング統計の設定",
        "ko-KR": "스트리밍 통계 설정",
        "pl-PL": "Ustawienia statystyk strumienia",
        "pt-BR": "Ajustes de estatísticas",
        "ru-RU": "Настройки потоковой передачи",
        "tr-TR": "Yayın durumu ayarları",
        "vi-VN": "Cấu hình thông số của stream",
        "zh-CN": "串流统计信息设置",
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
        "vi-VN": "Kéo giãn",
        "zh-CN": "拉伸",
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
        "vi-VN": "Phía trên bên phải",
        "zh-CN": "右上角",
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
        "vi-VN": "Giao diện",
        "zh-CN": "UI",
    },
    "unknown": {
        "de-DE": "Unbekannt",
        "en-US": "Unknown",
        "es-ES": "Desconocido",
        "it-IT": "Sconosciuto",
        "ja-JP": "不明",
        "pl-PL": "Nieznane",
        "pt-BR": "Desconhecido",
        "ru-RU": "Неизвестный",
        "tr-TR": "Bilinmiyor",
        "vi-VN": "Không rõ",
        "zh-CN": "未知",
    },
    "unlimited": {
        "de-DE": "Unbegrenzt",
        "en-US": "Unlimited",
        "es-ES": "Ilimitado",
        "ja-JP": "無制限",
        "pl-PL": "Bez ograniczeń",
        "pt-BR": "Ilimitado",
        "ru-RU": "Неограничено",
        "tr-TR": "Limitsiz",
        "vi-VN": "Không giới hạn",
    },
    "unmuted": {
        "de-DE": "Ton an",
        "en-US": "Unmuted",
        "es-ES": "Activar sonido",
        "it-IT": "Microfono attivato",
        "ja-JP": "ミュート解除",
        "pl-PL": "Wyciszenie wyłączone",
        "pt-BR": "Sem Mudo",
        "ru-RU": "Вкл микрофон",
        "tr-TR": "Açık",
        "vi-VN": "Đã mở âm",
        "zh-CN": "已取消静音",
    },
    "use-mouse-absolute-position": {
        "de-DE": "Absolute Position der Maus verwenden",
        "en-US": "Use mouse's absolute position",
        "es-ES": "Usar la posición absoluta del ratón",
        "ja-JP": "マウスの絶対座標を使用",
        "pl-PL": "Użyj pozycji bezwzględnej myszy",
        "pt-BR": "Usar posição absoluta do mouse",
        "ru-RU": "Использовать абсолютное положение мыши",
        "tr-TR": "Farenin mutlak pozisyonunu baz al",
        "vi-VN": "Sử dụng vị trí tuyệt đối của chuột",
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
        "vi-VN": "User-Agent",
        "zh-CN": "浏览器UA伪装",
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
    const $elm = createElement('div', {'class': 'bx-reload-overlay'}, __('safari-failed-message'));
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
    document.documentElement.appendChild(createElement('style', {}, css));
    document.documentElement.appendChild($elm);

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


const SERVER_REGIONS = {};
var IS_PLAYING = false;
var STREAM_WEBRTC;
var STREAM_AUDIO_CONTEXT;
var STREAM_AUDIO_GAIN_NODE;
var $STREAM_VIDEO;
var $SCREENSHOT_CANVAS;
var GAME_TITLE_ID;
var APP_CONTEXT;

let IS_REMOTE_PLAYING;
let REMOTE_PLAY_CONFIG;

const HAS_TOUCH_SUPPORT = ('ontouchstart' in window || navigator.maxTouchPoints > 0);

// Credit: https://phosphoricons.com
const ICON_VIDEO_SETTINGS = '<path d="M16 9.144A6.89 6.89 0 0 0 9.144 16 6.89 6.89 0 0 0 16 22.856 6.89 6.89 0 0 0 22.856 16 6.9 6.9 0 0 0 16 9.144zm0 11.427c-2.507 0-4.571-2.064-4.571-4.571s2.064-4.571 4.571-4.571 4.571 2.064 4.571 4.571-2.064 4.571-4.571 4.571zm15.704-7.541c-.065-.326-.267-.607-.556-.771l-4.26-2.428-.017-4.802c-.001-.335-.15-.652-.405-.868-1.546-1.307-3.325-2.309-5.245-2.953-.306-.103-.641-.073-.923.085L16 3.694l-4.302-2.407c-.282-.158-.618-.189-.924-.086a16.02 16.02 0 0 0-5.239 2.964 1.14 1.14 0 0 0-.403.867L5.109 9.84.848 12.268a1.14 1.14 0 0 0-.555.771 15.22 15.22 0 0 0 0 5.936c.064.326.267.607.555.771l4.261 2.428.017 4.802c.001.335.149.652.403.868 1.546 1.307 3.326 2.309 5.245 2.953.306.103.641.073.923-.085L16 28.306l4.302 2.407a1.13 1.13 0 0 0 .558.143 1.18 1.18 0 0 0 .367-.059c1.917-.648 3.695-1.652 5.239-2.962.255-.216.402-.532.405-.866l.021-4.807 4.261-2.428a1.14 1.14 0 0 0 .555-.771 15.21 15.21 0 0 0-.003-5.931zm-2.143 4.987l-4.082 2.321a1.15 1.15 0 0 0-.429.429l-.258.438a1.13 1.13 0 0 0-.174.601l-.022 4.606a13.71 13.71 0 0 1-3.623 2.043l-4.117-2.295a1.15 1.15 0 0 0-.559-.143h-.546c-.205-.005-.407.045-.586.143l-4.119 2.3a13.74 13.74 0 0 1-3.634-2.033l-.016-4.599a1.14 1.14 0 0 0-.174-.603l-.257-.437c-.102-.182-.249-.333-.429-.437l-4.085-2.328a12.92 12.92 0 0 1 0-4.036l4.074-2.325a1.15 1.15 0 0 0 .429-.429l.258-.438a1.14 1.14 0 0 0 .175-.601l.021-4.606a13.7 13.7 0 0 1 3.625-2.043l4.11 2.295a1.14 1.14 0 0 0 .585.143h.52c.205.005.407-.045.586-.143l4.119-2.3a13.74 13.74 0 0 1 3.634 2.033l.016 4.599a1.14 1.14 0 0 0 .174.603l.257.437c.102.182.249.333.429.438l4.085 2.327a12.88 12.88 0 0 1 .007 4.041h.007z" fill-rule="nonzero"/>';
const ICON_STREAM_STATS = '<path d="M27.295 9.31C24.303 6.313 20.234 4.631 16 4.643h-.057C7.153 4.673 0 11.929 0 20.804v3.267a2.3 2.3 0 0 0 2.286 2.286h27.429A2.3 2.3 0 0 0 32 24.072v-3.429A15.9 15.9 0 0 0 27.294 9.31zm2.419 14.761H14.816l7.823-10.757a1.15 1.15 0 0 0-.925-1.817c-.366 0-.71.176-.925.471l-8.801 12.103H2.286v-3.267c0-.44.022-.874.062-1.304h3.367a1.15 1.15 0 0 0 1.143-1.143 1.15 1.15 0 0 0-1.143-1.143H2.753c1.474-5.551 6.286-9.749 12.104-10.237v3.379A1.15 1.15 0 0 0 16 11.5a1.15 1.15 0 0 0 1.143-1.143V6.975c5.797.488 10.682 4.608 12.143 10.239h-3a1.15 1.15 0 0 0-1.143 1.143 1.15 1.15 0 0 0 1.143 1.143h3.382a14.58 14.58 0 0 1 .047 1.143v3.429z" fill-rule="nonzero"/>';
const ICON_SCREENSHOT_B64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDMyIDMyIiBmaWxsPSIjZmZmIj48cGF0aCBkPSJNMjguMzA4IDUuMDM4aC00LjI2NWwtMi4wOTctMy4xNDVhMS4yMyAxLjIzIDAgMCAwLTEuMDIzLS41NDhoLTkuODQ2YTEuMjMgMS4yMyAwIDAgMC0xLjAyMy41NDhMNy45NTYgNS4wMzhIMy42OTJBMy43MSAzLjcxIDAgMCAwIDAgOC43MzF2MTcuMjMxYTMuNzEgMy43MSAwIDAgMCAzLjY5MiAzLjY5MmgyNC42MTVBMy43MSAzLjcxIDAgMCAwIDMyIDI1Ljk2MlY4LjczMWEzLjcxIDMuNzEgMCAwIDAtMy42OTItMy42OTJ6bS02Ljc2OSAxMS42OTJjMCAzLjAzOS0yLjUgNS41MzgtNS41MzggNS41MzhzLTUuNTM4LTIuNS01LjUzOC01LjUzOCAyLjUtNS41MzggNS41MzgtNS41MzggNS41MzggMi41IDUuNTM4IDUuNTM4eiIvPjwvc3ZnPgo=';


class Dialog {
    constructor(title, className, $content, onClose) {
        const CE = createElement;

        // Create dialog overlay
        this.$overlay = document.querySelector('.bx-dialog-overlay');
        if (!this.$overlay) {
            this.$overlay = CE('div', {'class': 'bx-dialog-overlay bx-gone'});
            document.documentElement.appendChild(this.$overlay);
        }

        let $close;
        this.onClose = onClose;
        this.$dialog = CE('div', {'class': `bx-dialog ${className} bx-gone`},
                                    CE('b', {}, title),
                                    CE('div', {'class': 'bx-dialog-content'}, $content),
                                    $close = CE('button', {}, __('close')));

        $close.addEventListener('click', e => {
            this.hide(e);
        });
        document.documentElement.appendChild(this.$dialog);
    }

    show() {
        this.$dialog.classList.remove('bx-gone');
        this.$overlay.classList.remove('bx-gone');
    }

    hide(e) {
        this.$dialog.classList.add('bx-gone');
        this.$overlay.classList.add('bx-gone');
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
                    clientAppId: 'Microsoft.GamingApp',
                    clientAppType: 'native',
                    clientAppVersion: '2203.1001.4.0',
                    clientSdkVersion: '8.5.2',
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
                        dpiX: 2,
                        dpiY: 2,
                    },
                },
                hw: {
                    make: 'Microsoft',
                    model: 'Surface Pro',
                    sdktype: 'native',
                },
                os: {
                    name: 'Windows 11',
                    ver: '22631.2715',
                    platform: 'desktop',
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

        const CE = createElement;

        RemotePlay.#$content = CE('div', {}, __('getting-consoles-list'));
        RemotePlay.#dialog = new Dialog(__('remote-play'), '', RemotePlay.#$content);

        RemotePlay.#getXhomeToken(() => {
            RemotePlay.#getConsolesList(() => {
                console.log(RemotePlay.#CONSOLES);
                RemotePlay.#renderConsoles();
            });
        });
    }

    static #renderConsoles() {
        const CE = createElement;

        const $fragment = document.createDocumentFragment();

        if (!RemotePlay.#CONSOLES || RemotePlay.#CONSOLES.length === 0) {
            $fragment.appendChild(CE('span', {}, __('no-consoles-found')));
        } else {
            const $settingNote = CE('p', {});

            const resolutions = [1080, 720];
            const currentResolution = PREFS.get(Preferences.REMOTE_PLAY_RESOLUTION);
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
                PREFS.set(Preferences.REMOTE_PLAY_RESOLUTION, value);
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
                        CE('span', {'class': 'bx-remote-play-console-type'}, con.consoleType)
                    ),
                    CE('div', {'class': 'bx-remote-play-power-state'}, RemotePlay.#STATE_LABELS[con.powerState]),
                ),
                $connectButton = CE('button', {'class': 'bx-primary-button bx-no-margin'}, __('console-connect')),
            );

            $connectButton.addEventListener('click', e => {
                REMOTE_PLAY_CONFIG = {
                    serverId: con.serverId,
                };

                const url = window.location.href.substring(0, 31) + '/launch/fortnite/BT5P2X999VH2#remote-play';

                const $pageContent = document.getElementById('PageContent');
                const $anchor = CE('a', {href: url, class: 'bx-hidden', style: 'position:absolute;top:-9990px;left:-9999px'}, '');
                $anchor.addEventListener('click', e => {
                    setTimeout(() => {
                        $pageContent.removeChild($anchor);
                    }, 1000);
                });

                $pageContent.appendChild($anchor);
                $anchor.click();

                RemotePlay.#dialog.hide();
            });
            $fragment.appendChild($child);
        }

        RemotePlay.#$content.parentElement.replaceChild($fragment, RemotePlay.#$content);
    }

    static detect() {
        if (!PREFS.get(Preferences.REMOTE_PLAY_ENABLED)) {
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

        const GSSV_TOKEN = JSON.parse(localStorage.getItem('xboxcom_xbl_user_info')).tokens['http://gssv.xboxlive.com/'].token;

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

    static #getConsolesList(callback) {
        if (RemotePlay.#CONSOLES) {
            callback();
            return;
        }

        fetch('https://wus2.gssv-play-prodxhome.xboxlive.com/v6/servers/home?mr=50', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${RemotePlay.XHOME_TOKEN}`,
            },
        }).then(resp => resp.json())
            .then(json => {
                RemotePlay.#CONSOLES = json.results;
                callback();
            });
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

        if (PREFS.get(Preferences.UI_LOADING_SCREEN_ROCKET) === 'hide') {
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
        const CE = createElement;

        // Hide rocket when queing
        if (PREFS.get(Preferences.UI_LOADING_SCREEN_ROCKET) === 'hide-queue') {
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
                                    CE('label', {}, __('wait-time-estimated')),
                                    $estimated = CE('span', {'class': 'bx-wait-time-estimated'}),
                                    CE('label', {}, __('wait-time-countdown')),
                                    $countDown = CE('span', {'class': 'bx-wait-time-countdown'}),
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

    static reset() {
        LoadingScreen.#$waitTimeBox && LoadingScreen.#$waitTimeBox.classList.add('bx-gone');
        LoadingScreen.#$bgStyle && (LoadingScreen.#$bgStyle.textContent = '');

        LoadingScreen.#waitTimeInterval && clearInterval(LoadingScreen.#waitTimeInterval);
        LoadingScreen.#waitTimeInterval = null;
    }
}


class TouchController {
    static get #EVENT_SHOW_CONTROLLER() {
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

    static enable() {
        TouchController.#enable = true;
    }

    static disable() {
        TouchController.#enable = false;
    }

    static isEnabled() {
        return TouchController.#enable;
    }

    static #show() {
        TouchController.#dispatchMessage(TouchController.#EVENT_SHOW_CONTROLLER);
        TouchController.#showing = true;
    }

    static #hide() {
        TouchController.#dispatchMessage(TouchController.#EVENT_HIDE_CONTROLLER);
        TouchController.#showing = false;
    }

    static #toggleVisibility() {
        if (!TouchController.#dataChannel) {
            return;
        }

        TouchController.#showing ? TouchController.#hide() : TouchController.#show();
    }

    static enableBar() {
        TouchController.#$bar && TouchController.#$bar.setAttribute('data-showing', true);
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

    static setup() {
        const $style = document.createElement('style');
        document.documentElement.appendChild($style);

        const $bar = createElement('div', {'id': 'bx-touch-controller-bar'});
        document.documentElement.appendChild($bar);

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

        const PREF_STYLE_STANDARD = PREFS.get(Preferences.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD);
        const PREF_STYLE_CUSTOM = PREFS.get(Preferences.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM);

        RTCPeerConnection.prototype.orgCreateDataChannel = RTCPeerConnection.prototype.createDataChannel;
        RTCPeerConnection.prototype.createDataChannel = function() {
            const dataChannel = this.orgCreateDataChannel.apply(this, arguments);
            if (!TouchController.#enable || dataChannel.label !== 'message') {
                return dataChannel;
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
            }

            TouchController.#dataChannel = dataChannel;

            // Fix sometimes the touch controller doesn't show at the beginning
            dataChannel.addEventListener('open', e => {
                setTimeout(TouchController.#show, 1000);
            });

            dataChannel.addEventListener('message', msg => {
                if (msg.origin === 'better-xcloud' || typeof msg.data !== 'string') {
                    return;
                }

                // Dispatch a message to display generic touch controller
                if (msg.data.includes('touchcontrols/showtitledefault')) {
                    TouchController.#show();
                }
            });

            return dataChannel;
        };
    }
}


class Toast {
    static #$wrapper;
    static #$msg;
    static #$status;

    static setup() {
        Toast.#$wrapper = createElement('div', {'class': 'bx-toast bx-gone'},
                                        Toast.#$msg = createElement('span', {'class': 'bx-toast-msg'}),
                                        Toast.#$status = createElement('span', {'class': 'bx-toast-status'}));

        document.documentElement.appendChild(Toast.#$wrapper);
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
        const CE = createElement;

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
            if (stat.type === 'candidate-pair' && stat.state == 'succeeded') {
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

    static #$dialog;

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

        StreamStats.#$container.removeAttribute('data-display');
        StreamStats.#$container.classList.add('bx-gone');
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

    static isHidden = () => StreamStats.#$container.classList.contains('bx-gone');
    static isGlancing = () => StreamStats.#$container.getAttribute('data-display') === 'glancing';

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

        const PREF_STATS_CONDITIONAL_FORMATTING = PREFS.get(Preferences.STATS_CONDITIONAL_FORMATTING);
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
                    StreamStats.#$pl.textContent = `${packetsLost} (${packetsLostPercentage}%)`;

                    // Frames Dropped
                    const framesDropped = stat.framesDropped;
                    const framesReceived = stat.framesReceived;
                    const framesDroppedPercentage = (framesDropped * 100 / ((framesDropped + framesReceived) || 1)).toFixed(2);
                    StreamStats.#$fl.textContent = `${framesDropped} (${framesDroppedPercentage}%)`;

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
                } else if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
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

    static #refreshStyles() {
        const PREF_ITEMS = PREFS.get(Preferences.STATS_ITEMS);
        const PREF_POSITION = PREFS.get(Preferences.STATS_POSITION);
        const PREF_TRANSPARENT = PREFS.get(Preferences.STATS_TRANSPARENT);
        const PREF_OPACITY = PREFS.get(Preferences.STATS_OPACITY);
        const PREF_TEXT_SIZE = PREFS.get(Preferences.STATS_TEXT_SIZE);

        StreamStats.#$container.setAttribute('data-stats', '[' + PREF_ITEMS.join('][') + ']');
        StreamStats.#$container.setAttribute('data-position', PREF_POSITION);
        StreamStats.#$container.setAttribute('data-transparent', PREF_TRANSPARENT);
        StreamStats.#$container.style.opacity = PREF_OPACITY + '%';
        StreamStats.#$container.style.fontSize = PREF_TEXT_SIZE;
    }

    static hideSettingsUi() {
        if (StreamStats.isGlancing() && !PREFS.get(Preferences.STATS_QUICK_GLANCE)) {
            StreamStats.stop();
        }
    }

    static #toggleSettingsUi() {
        StreamStats.#$dialog.toggle();
    }

    static render() {
        if (StreamStats.#$container) {
            return;
        }

        const CE = createElement;
        const STATS = {
            [StreamStats.PING]: (StreamStats.#$ping = CE('span', {}, '0')),
            [StreamStats.FPS]: (StreamStats.#$fps = CE('span', {}, '0')),
            [StreamStats.BITRATE]: (StreamStats.#$br = CE('span', {}, '0 Mbps')),
            [StreamStats.DECODE_TIME]: (StreamStats.#$dt = CE('span', {}, '0ms')),
            [StreamStats.PACKETS_LOST]: (StreamStats.#$pl = CE('span', {}, '0 (0.00%)')),
            [StreamStats.FRAMES_LOST]: (StreamStats.#$fl = CE('span', {}, '0 (0.00%)')),
        };

        const $barFragment = document.createDocumentFragment();
        for (let statKey in STATS) {
            const $div = CE('div', {'class': `bx-stat-${statKey}`}, CE('label', {}, statKey.toUpperCase()), STATS[statKey]);
            $barFragment.appendChild($div);
        }

        StreamStats.#$container = CE('div', {'class': 'bx-stats-bar bx-gone'}, $barFragment);

        let clickTimeout;
        StreamStats.#$container.addEventListener('mousedown', e => {
            clearTimeout(clickTimeout);
            if (clickTimeout) {
                // Double-clicked
                clickTimeout = null;
                StreamStats.#toggleSettingsUi();
                return;
            }

            clickTimeout = setTimeout(() => {
                clickTimeout = null;
            }, 400);
        });

        document.documentElement.appendChild(StreamStats.#$container);

        const refreshFunc = e => {
            StreamStats.#refreshStyles()
        };

        let $close;


        const STATS_UI = {
            [Preferences.STATS_SHOW_WHEN_PLAYING]: {
                'label': __('show-stats-on-startup'),
            },
            [Preferences.STATS_QUICK_GLANCE]: {
                'label': __('enable-quick-glance-mode'),
                'onChange': e => {
                    e.target.checked ? StreamStats.quickGlanceSetup() : StreamStats.quickGlanceStop();
                },
            },
            [Preferences.STATS_ITEMS]: {
                'label': __('stats'),
                'onChange': refreshFunc,
            },
            [Preferences.STATS_POSITION]: {
                'label': __('position'),
                'onChange': refreshFunc,
            },
            [Preferences.STATS_TEXT_SIZE]: {
                'label': __('text-size'),
                'onChange': refreshFunc,
            },
            [Preferences.STATS_OPACITY]: {
                'label': `${__('opacity')} (50-100%)`,
                'onChange': refreshFunc,
            },
            [Preferences.STATS_TRANSPARENT]: {
                'label': __('transparent-background'),
                'onChange': refreshFunc,
            },
            [Preferences.STATS_CONDITIONAL_FORMATTING]: {
                'label': __('conditional-formatting'),
                'onChange': refreshFunc,
            },
        };

        const $fragment = document.createDocumentFragment();
        for (let settingKey in STATS_UI) {
            const setting = STATS_UI[settingKey];

            $fragment.appendChild(CE('div', {},
               CE('label', {'for': `xcloud_setting_${settingKey}`}, setting.label),
               PREFS.toElement(settingKey, setting.onChange)
            ));
        }

        StreamStats.#$dialog = new Dialog(__('stream-stats-settings'), 'bx-stats-settings-dialog', $fragment, StreamStats.hideSettingsUi);
        StreamStats.#refreshStyles();
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
            return PREFS.get(Preferences.USER_AGENT_CUSTOM, '');
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
        const profile = PREFS.get(Preferences.USER_AGENT_PROFILE);
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
                if (PREFS.get(Preferences.STREAM_TOUCH_CONTROLLER) === 'all') {
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
    static get STREAM_HIDE_IDLE_CURSOR() { return 'stream_hide_idle_cursor';}
    static get STREAM_SIMPLIFY_MENU() { return 'stream_simplify_menu'; }

    static get STREAM_TOUCH_CONTROLLER() { return 'stream_touch_controller'; }
    static get STREAM_TOUCH_CONTROLLER_STYLE_STANDARD() { return 'stream_touch_controller_style_standard'; }
    static get STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM() { return 'stream_touch_controller_style_custom'; }

    static get STREAM_DISABLE_FEEDBACK_DIALOG() { return 'stream_disable_feedback_dialog'; }

    static get CONTROLLER_ENABLE_SHORTCUTS() { return 'controller_enable_shortcuts'; }

    static get MKB_ENABLED() { return 'mkb_enabled'; }
    static get MKB_ABSOLUTE_MOUSE() { return 'mkb_absolute_mouse'; }

    static get SCREENSHOT_BUTTON_POSITION() { return 'screenshot_button_position'; }
    static get BLOCK_TRACKING() { return 'block_tracking'; }
    static get BLOCK_SOCIAL_FEATURES() { return 'block_social_features'; }
    static get DISABLE_BANDWIDTH_CHECKING() { return 'disable_bandwidth_checking'; }
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
                'ko-KR': '\ud55c\uad6d\uc5b4',
                'it-IT': 'italiano',
                'ja-JP': '\u65e5\u672c\u8a9e',
                'pl-PL': 'polski',
                'pt-BR': 'portugu\xeas (Brasil)',
                'ru-RU': '\u0440\u0443\u0441\u0441\u043a\u0438\u0439',
                'tr-TR': 'T\xfcrk\xe7e',
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
            'default': 'auto',
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

                if (typeof RTCRtpTransceiver === 'undefined' || !('setCodecPreferences' in RTCRtpTransceiver.prototype)) {
                    return options;
                }

                if (!('getCapabilities' in RTCRtpReceiver)) {
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
        },
        [Preferences.PREFER_IPV6_SERVER]: {
            'default': false,
        },
        [Preferences.DISABLE_BANDWIDTH_CHECKING]: {
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
            'default': 'default',
            'options': {
                'default': __('default'),
                'all': __('tc-all-games'),
                'off': __('off'),
            },
        },
        [Preferences.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD]: {
            'default': 'default',
            'options': {
                'default': __('default'),
                'white': __('tc-all-white'),
                'muted': __('tc-muted-colors'),
            },
        },
        [Preferences.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM]: {
            'default': 'default',
            'options': {
                'default': __('default'),
                'muted': __('tc-muted-colors'),
            },
        },
        [Preferences.STREAM_SIMPLIFY_MENU]: {
            'default': false,
        },
        [Preferences.STREAM_HIDE_IDLE_CURSOR]: {
            'default': false,
        },
        [Preferences.STREAM_DISABLE_FEEDBACK_DIALOG]: {
            'default': false,
        },

        [Preferences.CONTROLLER_ENABLE_SHORTCUTS]: {
            'default': false,
        },

        [Preferences.MKB_ENABLED]: {
            'default': false,
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
            'default': false,
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
            'default': 0,
            'min': 0,
            'max': 5,
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
            'default': 100,
            'min': 50,
            'max': 150,
        },
        [Preferences.VIDEO_CONTRAST]: {
            'default': 100,
            'min': 50,
            'max': 150,
        },
        [Preferences.VIDEO_BRIGHTNESS]: {
            'default': 100,
            'min': 50,
            'max': 150,
        },

        [Preferences.AUDIO_MIC_ON_PLAYING]: {
            'default': false,
        },
        [Preferences.AUDIO_ENABLE_VOLUME_CONTROL]: {
            'default': true,
        },
        [Preferences.AUDIO_VOLUME]: {
            'default': 100,
            'min': 0,
            'max': 600,
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
            'default': 80,
            'min': 50,
            'max': 100,
        },
        [Preferences.STATS_CONDITIONAL_FORMATTING]: {
            'default': false,
        },

        [Preferences.REMOTE_PLAY_ENABLED]: {
            'default': false,
        },

        [Preferences.REMOTE_PLAY_RESOLUTION]: {
            'default': 1080,
            'options': {
                '1080p': '1080p',
                '720p': '720p',
            },
        },

        // Deprecated
        [Preferences.DEPRECATED_USE_DESKTOP_CODEC]: {
            'default': false,
            'migrate': function(savedPrefs, value) {
                const quality = value ? 'high' : 'default';
                this.set(Preferences.STREAM_CODEC_PROFILE, quality);
                savedPrefs[Preferences.STREAM_CODEC_PROFILE] = quality;
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
            if (!(settingId in savedPrefs)) {
                continue;
            }
            const setting = Preferences.SETTINGS[settingId];
            setting && setting.migrate && setting.migrate.call(this, savedPrefs, savedPrefs[settingId]);
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
                this.#prefs[settingId] = savedPrefs[settingId];
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

        // Return "default" for STREAM_TOUCH_CONTROLLER pref when the browser doesn't support touch
        if (!HAS_TOUCH_SUPPORT && key === Preferences.STREAM_TOUCH_CONTROLLER) {
            return 'default';
        }

        let value = this.#prefs[key];
        value = this.#validateValue(key, value);

        return value;
    }

    set(key, value) {
        value = this.#validateValue(key, value);

        this.#prefs[key] = value;
        this.#updateStorage();
    }

    #updateStorage() {
        this.#storage.setItem(this.#key, JSON.stringify(this.#prefs));
    }

    toElement(key, onChange) {
        const CE = createElement;
        const setting = Preferences.SETTINGS[key];
        const currentValue = PREFS.get(key);

        let $control;
        if ('options' in setting) {
            $control = CE('select', {'id': 'xcloud_setting_' + key});
            for (let value in setting.options) {
                const label = setting.options[value];

                const $option = CE('option', {value: value}, label);
                $control.appendChild($option);
            }

            $control.value = currentValue;
            $control.addEventListener('change', e => {
                const value = (setting.type && setting.type === 'number') ? parseInt(e.target.value) : e.target.value;
                PREFS.set(key, value);
                onChange && onChange(e);
            });
        } else if ('multiple_options' in setting) {
            $control = CE('select', {'id': 'xcloud_setting_' + key, 'multiple': true});
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

            $control.addEventListener('mousedown', e => {
                const $this = this;
                const orgScrollTop = $this.scrollTop;
                setTimeout(() => ($this.scrollTop = orgScrollTop), 0);
            });

            $control.addEventListener('mousemove', e => e.preventDefault());

            // $control.value = currentValue;
            $control.addEventListener('change', e => {
                const values = Array.from(e.target.selectedOptions).map(e => e.value);
                PREFS.set(key, values);

                onChange && onChange(e);
            });
        } else if (typeof setting.default === 'number') {
            $control = CE('input', {'type': 'number', 'min': setting.min, 'max': setting.max});

            $control.value = currentValue;
            $control.addEventListener('change', e => {
                let value = Math.max(setting.min, Math.min(setting.max, parseInt(e.target.value)));
                e.target.value = value;

                PREFS.set(key, value);
                onChange && onChange(e);
            });
        } else {
            $control = CE('input', {'type': 'checkbox'});
            $control.checked = currentValue;

            $control.addEventListener('change', e => {
                PREFS.set(key, e.target.checked);
                onChange && onChange(e);
            });
        }

        $control.id = `xcloud_setting_${key}`;
        return $control;
    }

    toNumberStepper(key, onChange, options={}) {
        options = options || {};
        options.suffix = options.suffix || '';
        options.disabled = !!options.disabled;
        options.hideSlider = !!options.hideSlider;

        const setting = Preferences.SETTINGS[key]
        let value = PREFS.get(key);
        if (options.disabled) {
            value = Preferences.SETTINGS[key].default;
        }

        let $text, $decBtn, $incBtn, $range;

        const MIN = setting.min;
        const MAX= setting.max;
        const STEPS = Math.max(setting.steps || 1, 1);

        const CE = createElement;
        const $wrapper = CE('div', {},
                            $decBtn = CE('button', {'data-type': 'dec'}, '-'),
                            $text = CE('span', {}, value + options.suffix),
                            $incBtn = CE('button', {'data-type': 'inc'}, '+'),
                           );

        if (!options.disabled && !options.hideSlider) {
            $range = CE('input', {'type': 'range', 'min': MIN, 'max': MAX, 'value': value});
            $range.addEventListener('input', e => {
                value = parseInt(e.target.value);

                $text.textContent = value + options.suffix;
                PREFS.set(key, value);
                onChange && onChange(e, value);
            });
            $wrapper.appendChild($range);

            if (options.ticks) {
                const markersId = `markers-${key}`;
                const $markers = CE('datalist', {'id': markersId});
                $range.setAttribute('list', markersId);

                for (let i = MIN; i <= MAX; i += options.ticks) {
                    $markers.appendChild(CE('option', {'value': i}));
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
            PREFS.set(key, value);

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
}


const PREFS = new Preferences();


class Patcher {
    static #PATCHES = {
        remotePlayKeepAlive: PREFS.get(Preferences.REMOTE_PLAY_ENABLED) && function(funcStr) {
            if (!funcStr.includes('onServerDisconnectMessage(e){')) {
                return false;
            }

            funcStr = funcStr.replace('onServerDisconnectMessage(e){', `onServerDisconnectMessage (e) {
                const msg = JSON.parse(e);
                if (msg.reason === 'WarningForBeingIdle') {
                    try {
                        this.sendKeepAlive();
                        return;
                    } catch (ex) {}
                }
            `);
            return funcStr;
        },

        // Enable Remote Play feature
        remotePlayConnectMode: PREFS.get(Preferences.REMOTE_PLAY_ENABLED) && function(funcStr) {
            const text = 'connectMode:"cloud-connect"';
            if (!funcStr.includes(text)) {
                return false;
            }

            return funcStr.replace(text, `connectMode:window.BX_REMOTE_PLAY_CONFIG?"xhome-connect":"cloud-connect",remotePlayServerId:(window.BX_REMOTE_PLAY_CONFIG&&window.BX_REMOTE_PLAY_CONFIG.serverId)||''`);
        },

        // Replace "/direct-connect" with "/play"
        remotePlayDirectConnectUrl: PREFS.get(Preferences.REMOTE_PLAY_ENABLED) && function(funcStr) {
            const index = funcStr.indexOf('/direct-connect');
            if (index === -1) {
                return false;
            }

            return funcStr.replace(funcStr.substring(index - 9, index + 15), 'https://www.xbox.com/play');
        },

        // Set disableTelemetry() to true
        disableTelemetry: PREFS.get(Preferences.BLOCK_TRACKING) && function(funcStr) {
            const text = '.disableTelemetry=function(){return!1}';
            if (!funcStr.includes(text)) {
                return false;
            }

            return funcStr.replace(text, '.disableTelemetry=function(){return!0}');
        },

        // Disable trackEvent() function
        disableTrackEvent: PREFS.get(Preferences.BLOCK_TRACKING) && function(funcStr) {
            const text = 'this.trackEvent=';
            if (!funcStr.includes(text)) {
                return false;
            }

            return funcStr.replace(text, 'this.trackEvent=e=>{},this.uwuwu=');
        },

        // Disable ApplicationInsights.track() function
        disableAiTrack: PREFS.get(Preferences.BLOCK_TRACKING) && function(funcStr) {
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

        // Block WebRTC stats collector
        blockWebRtcStatsCollector: PREFS.get(Preferences.BLOCK_TRACKING) && function(funcStr) {
            const text = 'this.intervalMs=0,';
            if (!funcStr.includes(text)) {
                return false;
            }

            return funcStr.replace(text, 'false,' + text);
        },

        // Set TV layout
        tvLayout: PREFS.get(Preferences.UI_LAYOUT) === 'tv' && function(funcStr) {
            const text = '?"tv":"default"';
            if (!funcStr.includes(text)) {
                return false;
            }

            return funcStr.replace(text, '?"tv":"tv"');
        },

        // Enable Mouse and Keyboard support
        enableMouseAndKeyboard: PREFS.get(Preferences.MKB_ENABLED) && function(funcStr) {
            if (!funcStr.includes('EnableMouseAndKeyboard:')) {
                return false;
            }

            funcStr = funcStr.replace('EnableMouseAndKeyboard:!1', 'EnableMouseAndKeyboard:!0');
            if (PREFS.get(Preferences.MKB_ABSOLUTE_MOUSE)) {
                funcStr = funcStr.replace('EnableAbsoluteMouse:!1', 'EnableAbsoluteMouse:!0');
            }

            return funcStr;
        },
    };

    static #patchFunctionBind() {
        Function.prototype.nativeBind = Function.prototype.bind;
        Function.prototype.bind = function() {
            let valid = false;
            if (arguments.length === 2 && arguments[0] === null) {
                if (arguments[1] === 0 || (typeof arguments[1] === 'function')) {
                    valid = true;
                }
            }

            if (!valid) {
                return this.nativeBind.apply(this, arguments);
            }

            if (typeof arguments[1] === 'function') {
                console.log('[Better xCloud] Restored Function.prototype.bind()');
                Function.prototype.bind = Function.prototype.nativeBind;
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

            return newFunc.nativeBind.apply(newFunc, arguments);
        };
    }

    static length() { return Object.keys(Patcher.#PATCHES).length };

    static patch(item) {
        for (let id in item[1]) {
            if (Patcher.length() <= 0) {
                return;
            }

            for (const patchName in Patcher.#PATCHES) {
                const func = item[1][id];
                let funcStr = func.toString();

                const patchedFuncStr = Patcher.#PATCHES[patchName].call(null, funcStr);
                if (patchedFuncStr) {
                    item[1][id] = eval(patchedFuncStr);
                    delete Patcher.#PATCHES[patchName];

                    console.log(`[Better xCloud] Applied "${patchName}" patch`);
                    break;
                }
            }
        }
    }

    static initialize() {
        // Remove disabled patches
        for (const patchName in Patcher.#PATCHES) {
            if (!Patcher.#PATCHES[patchName]) {
                delete Patcher.#PATCHES[patchName];
            }
        }

        Patcher.#patchFunctionBind();
    }
}


function checkForUpdate() {
    const CHECK_INTERVAL_SECONDS = 4 * 3600; // check every 4 hours

    const currentVersion = PREFS.get(Preferences.CURRENT_VERSION);
    const lastCheck = PREFS.get(Preferences.LAST_UPDATE_CHECK);
    const now = Math.round((+new Date) / 1000);

    if (currentVersion === SCRIPT_VERSION && now - lastCheck < CHECK_INTERVAL_SECONDS) {
        return;
    }

    // Start checking
    PREFS.set(Preferences.LAST_UPDATE_CHECK, now);
    fetch('https://api.github.com/repos/redphx/better-xcloud/releases/latest')
        .then(response => response.json())
        .then(json => {
            // Store the latest version
            PREFS.set(Preferences.LATEST_VERSION, json.tag_name.substring(1));
            PREFS.set(Preferences.CURRENT_VERSION, SCRIPT_VERSION);
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

    --bx-wait-time-box-z-index: 9999;
    --bx-stream-settings-z-index: 9999;
    --bx-screenshot-z-index: 8888;
    --bx-touch-controller-bar-z-index: 5555;
    --bx-dialog-z-index: 1010;
    --bx-stats-bar-z-index: 1000;
    --bx-dialog-overlay-z-index: 900;
}

.bx-settings-button {
    background-color: transparent;
    border: none;
    color: white;
    font-weight: bold;
    line-height: 30px;
    border-radius: 4px;
    padding: 8px;
}

.bx-settings-button:hover, .bx-settings-button:focus {
    background-color: #515863;
}

.bx-settings-button[data-update-available]::after {
    content: ' 🌟';
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

.bx-gone {
    display: none !important;
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

.bx-primary-button {
    padding: 8px 32px;
    margin: 10px auto 0;
    border: none;
    border-radius: 4px;
    display: block;
    background-color: #044e2a;
    text-align: center;
    color: white;
    text-transform: uppercase;
    font-family: var(--bx-title-font);
    font-weight: 400;
    font-size: 14px;
    line-height: 24px;
}

@media (hover: hover) {
    .bx-primary-button:hover {
        background-color: #00753c;
    }
}

.bx-primary-button:focus {
    background-color: #00753c;
}

.bx-primary-button:active {
    background-color: #00753c;
}

.bx-primary-button[disabled] {
    background: #393939;
    color: #a2a2a2;
}

.bx-settings-app-version {
    margin-top: 10px;
    text-align: center;
    color: #747474;
    font-size: 12px;
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
    background-image: url(${ICON_SCREENSHOT_B64});
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
    width: 420px;
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

.bx-dialog > b {
    color: #fff;
    display: block;
    font-family: var(--bx-title-font);
    font-size: 26px;
    font-weight: 400;
    line-height: 32px;
    margin-bottom: 12px;
}

.bx-dialog > div {
    overflow: auto;
    padding: 2px 0;
}

.bx-dialog > button {
    padding: 8px 32px;
    margin: 20px auto 0;
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
    display: none;
    flex-direction: column;
    user-select: none;
    -webkit-user-select: none;
    position: fixed;
    right: 0;
    top: 20px;
    bottom: 20px;
    z-index: var(--bx-stream-settings-z-index);
    padding: 8px;
    width: 220px;
    background: #1a1b1e;
    color: #fff;
    border-radius: 8px 0 0 8px;
    font-weight: 400;
    font-size: 16px;
    font-family: var(--bx-title-font);
    text-align: center;
    box-shadow: 0px 0px 6px #000;
    opacity: 0.95;
    overflow: overlay;
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

.bx-quick-settings-bar[data-clarity-boost="true"] > div[data-type="video"] {
    display: none;
}

.bx-quick-settings-bar *:focus {
    outline: none !important;
}

.bx-quick-settings-bar > div {
    margin-bottom: 16px;
}

.bx-quick-settings-bar h2 {
    font-size: 32px;
    font-weight: bold;
    margin-bottom: 8px;
}

.bx-quick-settings-bar input[type="range"] {
    display: block;
    margin: 12px auto;
    width: 80%;
    color: #959595 !important;
}

.bx-quick-settings-bar label {
    font-size: 16px;
    font-weight: bold;
    display: block;
    margin-bottom: 8px;
}

.bx-quick-settings-bar button {
    border: none;
    width: 24px;
    height: 24px;
    margin: 0 4px;
    line-height: 24px;
    background-color: #515151;
    color: #fff;
    border-radius: 4px;
    font-weight: bold;
    font-size: 14px;
    font-family: var(--bx-monospaced-font);
}

.bx-toast {
    position: fixed;
    left: 50%;
    top: 24px;
    transform: translate(-50%, 0);
    background: #000000cc;
    border-radius: 40px;
    padding: 8px 18px;
    color: white;
    z-index: 999;
    font-family: var(--bx-normal-font);
    border: 1px solid #fff;
}

.bx-toast-msg {
    font-size: 12px;
    display: inline-block;
    vertical-align: middle;
}

.bx-toast-status {
    font-weight: bold;
    font-size: 18px;
    text-transform: uppercase;
    display: inline-block;
    vertical-align: middle;
    margin-left: 10px;
}

@media (hover: hover) {
    .bx-quick-settings-bar button:hover {
        background-color: #414141;
        color: white;
    }
}

.bx-quick-settings-bar button:active {
        background-color: #414141;
        color: white;
    }

.bx-quick-settings-bar span {
    display: inline-block;
    width: 40px;
    font-family: var(--bx-monospaced-font);
    font-size: 14px;
}

.bx-stream-menu-button-on {
    fill: #000 !important;
    background-color: #fff !important;
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

.bx-wait-time-estimated, .bx-wait-time-countdown {
    display: block;
    font-family: var(--bx-monospaced-font);
    text-align: right;
    font-size: 16px;
}

.bx-wait-time-estimated {
    margin-bottom: 10px;
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
    margin-bottom: 8px;
}

.bx-remote-play-device-wrapper:not(:last-child) {
  margin-bottom: 14px;
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
    background: #888;
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
    if (PREFS.get(Preferences.BLOCK_SOCIAL_FEATURES)) {
        css += `
div[class^=HomePage-module__bottomSpacing]:has(button[class*=SocialEmptyCard]),
button[class*=SocialEmptyCard] {
    display: none;
}
`;
    }

    // Reduce animations
    if (PREFS.get(Preferences.REDUCE_ANIMATIONS)) {
        css += `
div[class*=GameCard-module__gameTitleInnerWrapper],
div[class*=GameCard-module__card],
div[class*=ScrollArrows-module] {
    transition: none !important;
}
`;
    }

    // Hide the top-left dots icon while playing
    if (PREFS.get(Preferences.HIDE_DOTS_ICON)) {
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
    if (PREFS.get(Preferences.STREAM_TOUCH_CONTROLLER) === 'off') {
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
    if (PREFS.get(Preferences.STREAM_SIMPLIFY_MENU)) {
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
    let preferredRegion = PREFS.get(Preferences.SERVER_REGION);
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


function updateIceCandidates(candidates) {
    const pattern = new RegExp(/a=candidate:(?<foundation>\d+) (?<component>\d+) UDP (?<priority>\d+) (?<ip>[^\s]+) (?<the_rest>.*)/);

    const lst = [];
    for (let item of candidates) {
        if (item.candidate == 'a=end-of-candidates') {
            continue;
        }

        const groups = pattern.exec(item.candidate).groups;
        lst.push(groups);
    }

    lst.sort((a, b) => (a.ip.includes(':') || a.ip > b.ip) ? -1 : 1);

    const newCandidates = [];
    let foundation = 1;
    lst.forEach(item => {
        item.foundation = foundation;
        item.priority = (foundation == 1) ? 100 : 1;

        newCandidates.push({
            'candidate': `a=candidate:${item.foundation} 1 UDP ${item.priority} ${item.ip} ${item.the_rest}`,
            'messageType': 'iceCandidate',
            'sdpMLineIndex': '0',
            'sdpMid': '0',
        });

        ++foundation;
    });

    newCandidates.push({
        'candidate': 'a=end-of-candidates',
        'messageType': 'iceCandidate',
        'sdpMLineIndex': '0',
        'sdpMid': '0',
    });

    return newCandidates;
}


function clearApplicationInsightsBuffers() {
    window.sessionStorage.removeItem('AI_buffer');
    window.sessionStorage.removeItem('AI_sentBuffer');
}


function interceptHttpRequests() {
    var BLOCKED_URLS = [];
    if (PREFS.get(Preferences.BLOCK_TRACKING)) {
        // Clear Applications Insight buffers
        clearApplicationInsightsBuffers();

        BLOCKED_URLS = BLOCKED_URLS.concat([
            'https://arc.msn.com',
            'https://browser.events.data.microsoft.com',
            'https://dc.services.visualstudio.com',
            // 'https://2c06dea3f26c40c69b8456d319791fd0@o427368.ingest.sentry.io',
        ]);
    }

    if (PREFS.get(Preferences.BLOCK_SOCIAL_FEATURES)) {
        // Disable WebSocket
        WebSocket = {
            CLOSING: 2,
        };

        BLOCKED_URLS = BLOCKED_URLS.concat([
            'https://peoplehub.xboxlive.com/users/me',
            'https://accounts.xboxlive.com/family/memberXuid',
            'https://notificationinbox.xboxlive.com',
        ]);
    }

    const xhrPrototype = XMLHttpRequest.prototype;
    xhrPrototype.orgOpen = xhrPrototype.open;
    xhrPrototype.orgSend = xhrPrototype.send;

    xhrPrototype.open = function(method, url) {
        // Save URL to use it later in send()
        this._url = url;
        return this.orgOpen.apply(this, arguments);
    };

    xhrPrototype.send = function(...arg) {
        for (let blocked of BLOCKED_URLS) {
            if (this._url.startsWith(blocked)) {
                if (blocked === 'https://dc.services.visualstudio.com') {
                    setTimeout(clearApplicationInsightsBuffers, 1000);
                }
                return false;
            }
        }

        return this.orgSend.apply(this, arguments);
    };

    const PREF_PREFER_IPV6_SERVER = PREFS.get(Preferences.PREFER_IPV6_SERVER);
    const PREF_STREAM_TARGET_RESOLUTION = PREFS.get(Preferences.STREAM_TARGET_RESOLUTION);
    const PREF_STREAM_PREFERRED_LOCALE = PREFS.get(Preferences.STREAM_PREFERRED_LOCALE);
    const PREF_UI_LOADING_SCREEN_GAME_ART = PREFS.get(Preferences.UI_LOADING_SCREEN_GAME_ART);
    const PREF_UI_LOADING_SCREEN_WAIT_TIME = PREFS.get(Preferences.UI_LOADING_SCREEN_WAIT_TIME);

    const PREF_STREAM_TOUCH_CONTROLLER = PREFS.get(Preferences.STREAM_TOUCH_CONTROLLER);
    const PREF_AUDIO_MIC_ON_PLAYING = PREFS.get(Preferences.AUDIO_MIC_ON_PLAYING);
    const PREF_OVERRIDE_CONFIGURATION = PREF_AUDIO_MIC_ON_PLAYING || PREF_STREAM_TOUCH_CONTROLLER === 'all';

    const PREF_REMOTE_PLAY_RESOLUTION = PREFS.get(Preferences.REMOTE_PLAY_RESOLUTION);

    const orgFetch = window.fetch;

    const patchIpv6 = function(...arg) {
        // ICE server candidates
        const request = arg[0];
        const url = (typeof request === 'string') ? request : request.url;

        if (PREF_PREFER_IPV6_SERVER && url && url.endsWith('/ice') && url.includes('/sessions/') && request.method === 'GET') {
            const promise = orgFetch(...arg);

            return promise.then(response => {
                return response.clone().text().then(text => {
                    if (!text.length) {
                        return response;
                    }

                    const obj = JSON.parse(text);
                    let exchangeResponse = JSON.parse(obj.exchangeResponse);
                    exchangeResponse = updateIceCandidates(exchangeResponse)
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
        const url = (typeof request === 'string') ? request : request.url;

        // Remote Play
        if (IS_REMOTE_PLAYING && url.includes('/home/play')) {
            const clone = request.clone();
            const cloneBody = await clone.json();
            cloneBody.settings.osName = 'windows';

            // Clone headers
            const headers = {};
            for (const pair of clone.headers.entries()) {
                headers[pair[0]] = pair[1];
            }

            const deviceInfo = RemotePlay.BASE_DEVICE_INFO;
            if (PREF_REMOTE_PLAY_RESOLUTION === '720p') {
                deviceInfo.dev.os.name = 'android';
            }

            headers['x-ms-device-info'] = JSON.stringify(deviceInfo);
            headers['authorization'] = `Bearer ${RemotePlay.XHOME_TOKEN}`;

            request = new Request('https://wus2.gssv-play-prodxhome.xboxlive.com/v5/sessions/home/play', {
                method: 'POST',
                body: JSON.stringify(cloneBody),
                headers: headers,
            });
            arg[0] = request;

            return orgFetch(...arg);
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

            return orgFetch(...arg);
        }

        if (IS_REMOTE_PLAYING && url.includes('/titles')) {
            const clone = request.clone();

            const headers = {};
            for (const pair of clone.headers.entries()) {
                headers[pair[0]] = pair[1];
            }
            headers['authorization'] = `Bearer ${RemotePlay.XCLOUD_TOKEN}`;

            const index = request.url.indexOf('.xboxlive.com');
            request = new Request('https://wus.core.gssv-play-prod' + request.url.substring(index), {
                method: clone.method,
                body: await clone.text(),
                headers: headers,
            });

            arg[0] = request;
            return orgFetch(...arg);
        }

        if (IS_REMOTE_PLAYING && url.includes('/sessions/home')) {
            const clone = request.clone();

            const headers = {};
            for (const pair of clone.headers.entries()) {
                headers[pair[0]] = pair[1];
            }
            headers['authorization'] = `Bearer ${RemotePlay.XHOME_TOKEN}`;

            const opts = {
                method: clone.method,
                headers: headers,
            };

            if (clone.method === 'POST') {
                opts.body = await clone.text();
            }

            const index = request.url.indexOf('.xboxlive.com');
            request = new Request('https://wus2.gssv-play-prodxhome' + request.url.substring(index), opts);

            arg[0] = request;

            return patchIpv6(...arg) || orgFetch(...arg);
        }

        // ICE server candidates
        if (!IS_REMOTE_PLAYING) {
            const patchedIpv6 = patchIpv6(...arg);
            if (patchedIpv6) {
                return patchedIpv6;
            }
        }

        // Server list
        if (!url.includes('xhome.') && url.endsWith('/v2/login/user')) {
            const promise = orgFetch(...arg);

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
                        if (!document.getElementById('gamepass-root')) {
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
            // Setup loading screen
            PREF_UI_LOADING_SCREEN_GAME_ART && LoadingScreen.setup();

            // Start hiding cursor
            if (PREFS.get(Preferences.STREAM_HIDE_IDLE_CURSOR)) {
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
            return orgFetch(...arg);
        }

        // Get wait time
        if (PREF_UI_LOADING_SCREEN_WAIT_TIME && url.includes('xboxlive.com') && url.includes('/waittime/')) {
            const promise = orgFetch(...arg);
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
            PREF_UI_LOADING_SCREEN_GAME_ART && LoadingScreen.hide();

            const promise = orgFetch(...arg);
            if (!PREF_OVERRIDE_CONFIGURATION) {
                return promise;
            }

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

                // If both settings are invalid -> return promise
                if (!PREF_AUDIO_MIC_ON_PLAYING && !TouchController.isEnabled()) {
                    return promise;
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

                    // Enable touch controller
                    if (TouchController.isEnabled()) {
                        overrides.inputConfiguration = overrides.inputConfiguration || {};
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
            const promise = orgFetch(...arg);
            return promise.then(response => {
                return response.clone().json().then(json => {
                    for (let productId in json.Products) {
                        TitlesInfo.saveFromCatalogInfo(json.Products[productId]);
                    }

                    return response;
                });
            });
        }

        if (PREF_STREAM_TOUCH_CONTROLLER === 'all' && (url.endsWith('/titles') || url.endsWith('/mru'))) {
            const promise = orgFetch(...arg);
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

        return orgFetch(...arg);
    }
}


function injectSettingsButton($parent) {
    if (!$parent) {
        return;
    }

    const CE = createElement;
    const PREF_PREFERRED_REGION = getPreferredServerRegion();
    const PREF_LATEST_VERSION = PREFS.get(Preferences.LATEST_VERSION);
    const PREF_REMOTE_PLAY_ENABLED = PREFS.get(Preferences.REMOTE_PLAY_ENABLED);

    // Setup Settings button
    const $button = CE('button', {'class': 'bx-settings-button'}, PREF_PREFERRED_REGION);
    $button.addEventListener('click', e => {
        const $settings = document.querySelector('.better_xcloud_settings');
        $settings.classList.toggle('bx-gone');
        $settings.scrollIntoView();
    });

    // Show new update status
    if (PREF_LATEST_VERSION && PREF_LATEST_VERSION !== SCRIPT_VERSION) {
        $button.setAttribute('data-update-available', true);
    }

    // Add Settings button to the web page
    $parent.appendChild($button);

    // Setup Settings UI
    const $container = CE('div', {
        'class': 'better_xcloud_settings bx-gone',
    });

    let $updateAvailable;
    let $remotePlayBtn;
    const $wrapper = CE('div', {'class': 'bx-settings-wrapper'},
                        CE('div', {'class': 'bx-settings-title-wrapper'},
                           CE('a', {
                                'class': 'bx-settings-title',
                                'href': SCRIPT_HOME,
                                'target': '_blank',
                           }, 'Better xCloud ' + SCRIPT_VERSION),
                           $remotePlayBtn = CE('button', {'class': 'bx-primary-button bx-no-margin'}, __('remote-play')),
                        )
                       );
    $updateAvailable = CE('a', {
        'class': 'bx-settings-update bx-gone',
        'href': 'https://github.com/redphx/better-xcloud/releases',
        'target': '_blank',
    });

    if (PREF_REMOTE_PLAY_ENABLED) {
        $remotePlayBtn.addEventListener('click', e => {
            RemotePlay.showDialog();

            // Hide Settings
            $container.classList.add('bx-gone');
        });
    } else {
        $remotePlayBtn.classList.add('bx-gone');
    }

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
            [Preferences.DISABLE_BANDWIDTH_CHECKING]: __('disable-bandwidth-checking'),
            [Preferences.AUDIO_ENABLE_VOLUME_CONTROL]: __('enable-volume-control'),
            [Preferences.AUDIO_MIC_ON_PLAYING]: __('enable-mic-on-startup'),
            [Preferences.STREAM_HIDE_IDLE_CURSOR]: __('hide-idle-cursor'),
            [Preferences.STREAM_DISABLE_FEEDBACK_DIALOG]: __('disable-post-stream-feedback-dialog'),
        },
        [__('controller')]: {
            [Preferences.CONTROLLER_ENABLE_SHORTCUTS]: __('enable-controller-shortcuts'),
        },
        [__('touch-controller')]: {
            [Preferences.STREAM_TOUCH_CONTROLLER]: __('tc-availability'),
            [Preferences.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD]: __('tc-standard-layout-style'),
            [Preferences.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM]: __('tc-custom-layout-style'),
        },

        [__('mouse-and-keyboard')]: {
            '_note': '⚠️ ' + __('may-not-work-properly'),
            [Preferences.MKB_ENABLED]: [__('enable-mkb'), __('only-supports-some-games')],
            [Preferences.MKB_ABSOLUTE_MOUSE]: __('use-mouse-absolute-position'),
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
        if (!ENABLE_MKB && groupLabel === __('mouse-and-keyboard')) {
            continue;
        }

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

            let settingLabel;
            let settingNote;

            if (Array.isArray(SETTINGS_UI[groupLabel][settingId])) {
                [settingLabel, settingNote] = SETTINGS_UI[groupLabel][settingId];
            } else {
                settingLabel = SETTINGS_UI[groupLabel][settingId];
            }

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
                    PREFS.set(Preferences.USER_AGENT_CUSTOM, e.target.value.trim());
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

                $control = CE('select', {id: 'xcloud_setting_' + settingId});
                $control.addEventListener('change', e => {
                    PREFS.set(settingId, e.target.value);
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
            if (settingId === Preferences.STREAM_CODEC_PROFILE) {
                const options = Preferences.SETTINGS[Preferences.STREAM_CODEC_PROFILE].options;
                if (Object.keys(options).length <= 1) {
                    $control.disabled = true;
                    $control.title = __('browser-unsupported-feature');
                }
            } else if (!HAS_TOUCH_SUPPORT) {
                // Disable this setting for non-touchable devices
                if ([Preferences.STREAM_TOUCH_CONTROLLER, Preferences.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD, Preferences.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM].indexOf(settingId) > -1) {
                    $control.disabled = true;
                    $control.title = __('device-unsupported-touch');
                }
            }
            $control.disabled && ($control.style.cursor = 'help');

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
    const $reloadBtn = CE('button', {'class': 'bx-primary-button bx-full-width', 'tabindex': 0}, __('settings-reload'));
    $reloadBtn.addEventListener('click', e => {
        window.location.reload();
        $reloadBtn.textContent = __('settings-reloading');
    });
    $wrapper.appendChild($reloadBtn);

    // Show Game Pass app version
    try {
        const appVersion = document.querySelector('meta[name=gamepass-app-version]').content;
        const appDate = new Date(document.querySelector('meta[name=gamepass-app-date]').content).toISOString().substring(0, 10);
        $wrapper.appendChild(CE('div', {'class': 'bx-settings-app-version'}, `GamePass app ${appVersion} (${appDate})`));
    } catch (e) {}

    $container.appendChild($wrapper);

    // Add Settings UI to the web page
    const $pageContent = document.getElementById('PageContent');
    $pageContent.parentNode.insertBefore($container, $pageContent);
}

function getVideoPlayerFilterStyle() {
    const filters = [];

    const clarity = PREFS.get(Preferences.VIDEO_CLARITY);
    if (clarity != 0) {
        const level = (7 - (clarity - 1) * 0.5).toFixed(1); // 5, 5.5, 6, 6.5, 7
        const matrix = `0 -1 0 -1 ${level} -1 0 -1 0`;
        document.getElementById('bx-filter-clarity-matrix').setAttributeNS(null, 'kernelMatrix', matrix);

        filters.push(`url(#bx-filter-clarity)`);
    }

    const saturation = PREFS.get(Preferences.VIDEO_SATURATION);
    if (saturation != 100) {
        filters.push(`saturate(${saturation}%)`);
    }

    const contrast = PREFS.get(Preferences.VIDEO_CONTRAST);
    if (contrast != 100) {
        filters.push(`contrast(${contrast}%)`);
    }

    const brightness = PREFS.get(Preferences.VIDEO_BRIGHTNESS);
    if (brightness != 100) {
        filters.push(`brightness(${brightness}%)`);
    }

    return filters.join(' ');
}


function updateVideoPlayerCss() {
    let $elm = document.getElementById('bx-video-css');
    if (!$elm) {
        const CE = createElement;

        $elm = CE('style', {id: 'bx-video-css'});
        document.documentElement.appendChild($elm);

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
        document.documentElement.appendChild($svg);
    }

    let filters = getVideoPlayerFilterStyle();
    let videoCss = '';
    if (filters) {
        videoCss += `filter: ${filters} !important;`;
    }

    const PREF_RATIO = PREFS.get(Preferences.VIDEO_RATIO);
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


function cloneStreamMenuButton($orgButton, label, svg_icon) {
    const $button = $orgButton.cloneNode(true);
    $button.setAttribute('aria-label', label);
    $button.querySelector('div[class*=label]').textContent = label;

    const $svg = $button.querySelector('svg');
    $svg.innerHTML = svg_icon;
    $svg.setAttribute('viewBox', '0 0 32 32');

    return $button;
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
        $quickBar.style.display = 'none';

        $parent.removeEventListener('click', hideQuickBarFunc);
        $parent.removeEventListener('touchstart', hideQuickBarFunc);
    }

    const PREF_DISABLE_FEEDBACK_DIALOG = PREFS.get(Preferences.STREAM_DISABLE_FEEDBACK_DIALOG);
    const observer = new MutationObserver(mutationList => {
        mutationList.forEach(item => {
            if (item.type !== 'childList') {
                return;
            }

            item.addedNodes.forEach(async $node => {
                if (!$node.className) {
                    return;
                }

                if (PREF_DISABLE_FEEDBACK_DIALOG && $node.className.startsWith('PostStreamFeedbackScreen')) {
                    const $btnClose = $node.querySelector('button');
                    $btnClose && $btnClose.click();
                    return;
                }

                if (!$node.className.startsWith('StreamMenu')) {
                    return;
                }

                // Get the second last button
                const $orgButton = $node.querySelector('div[class^=StreamMenu] > div > button:nth-last-child(2)');
                if (!$orgButton) {
                    return;
                }

                // Create Stream Settings button
                const $btnStreamSettings = cloneStreamMenuButton($orgButton, __('menu-stream-settings'), ICON_VIDEO_SETTINGS);
                $btnStreamSettings.addEventListener('click', e => {
                    e.preventDefault();
                    e.stopPropagation();

                    const msVideoProcessing = $STREAM_VIDEO.msVideoProcessing;
                    $quickBar.setAttribute('data-clarity-boost', (msVideoProcessing && msVideoProcessing !== 'default'));

                    // Close HUD
                    $btnCloseHud && $btnCloseHud.click();

                    // Show Quick settings bar
                    $quickBar.style.display = 'flex';

                    $parent.addEventListener('click', hideQuickBarFunc);
                    $parent.addEventListener('touchstart', hideQuickBarFunc);

                    const $touchSurface = document.getElementById('MultiTouchSurface');
                    $touchSurface && $touchSurface.style.display != 'none' && $touchSurface.addEventListener('touchstart', hideQuickBarFunc);
                });

                // Add button at the beginning
                $orgButton.parentElement.insertBefore($btnStreamSettings, $orgButton.parentElement.firstChild);

                // Hide Quick bar when closing HUD
                const $btnCloseHud = document.querySelector('button[class*=StreamMenu-module__backButton]');
                $btnCloseHud && $btnCloseHud.addEventListener('click', e => {
                    $quickBar.style.display = 'none';
                });

                // Create Stream Stats button
                const $btnStreamStats = cloneStreamMenuButton($orgButton, __('menu-stream-stats'), ICON_STREAM_STATS);
                $btnStreamStats.addEventListener('click', e => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Close HUD
                    $btnCloseHud && $btnCloseHud.click();
                    // Toggle Stream Stats
                    StreamStats.toggle();
                });

                const btnStreamStatsOn = (!StreamStats.isHidden() && !StreamStats.isGlancing());
                $btnStreamStats.classList.toggle('bx-stream-menu-button-on', btnStreamStatsOn);

                // Insert after Stream Settings button
                $orgButton.parentElement.insertBefore($btnStreamStats, $btnStreamSettings);

                // Get "Quit game" button
                const $btnQuit = $orgButton.parentElement.querySelector('button:last-of-type');
                // Hold "Quit game" button to refresh the stream
                new MouseHoldEvent($btnQuit, () => {
                    confirm(__('confirm-reload-stream')) && window.location.reload();
                }, 1000);

                // Render stream badges
                const $menu = document.querySelector('div[class*=StreamMenu-module__menuContainer] > div[class*=Menu-module]');
                $menu.appendChild(await StreamBadges.render());

                hideQuickBarFunc();
            });
        });
    });
    observer.observe($screen, {subtree: true, childList: true});
}


function patchVideoApi() {
    const PREF_SKIP_SPLASH_VIDEO = PREFS.get(Preferences.SKIP_SPLASH_VIDEO);
    const PREF_SCREENSHOT_BUTTON_POSITION = PREFS.get(Preferences.SCREENSHOT_BUTTON_POSITION);

    // Show video player when it's ready
    var showFunc;
    showFunc = function() {
        this.style.visibility = 'visible';
        this.removeEventListener('playing', showFunc);

        if (!this.videoWidth) {
            return;
        }

        onStreamStarted(this);
    }

    HTMLMediaElement.prototype.orgPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() {
        LoadingScreen.reset();

        if (this.className && this.className.startsWith('XboxSplashVideo')) {
            if (PREF_SKIP_SPLASH_VIDEO) {
                this.volume = 0;
                this.style.display = 'none';
                this.dispatchEvent(new Event('ended'));

                return {
                    catch: () => {},
                };
            }

            return this.orgPlay.apply(this);
        }

        this.addEventListener('playing', showFunc);
        injectStreamMenuButtons();

        return this.orgPlay.apply(this);
    };
}


function patchRtcCodecs() {
    const codecProfile = PREFS.get(Preferences.STREAM_CODEC_PROFILE);
    if (codecProfile === 'default') {
        return;
    }

    if (typeof RTCRtpTransceiver === 'undefined' || !('setCodecPreferences' in RTCRtpTransceiver.prototype)) {
        return false;
    }

    const profilePrefix = codecProfile === 'high' ? '4d' : (codecProfile === 'low' ? '420' : '42e');
    const profileLevelId = `profile-level-id=${profilePrefix}`;

    RTCRtpTransceiver.prototype.orgSetCodecPreferences = RTCRtpTransceiver.prototype.setCodecPreferences;
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
            this.orgSetCodecPreferences.apply(this, [newCodecs]);
        } catch (e) {
            // Didn't work -> use default codecs
            console.log(e);
            this.orgSetCodecPreferences.apply(this, [codecs]);
        }
    }
}


function setupVideoSettingsBar() {
    const CE = createElement;
    const isSafari = UserAgent.isSafari();
    const onVideoChange = e => {
        updateVideoPlayerCss();
    }

    let $stretchInp;
    const $wrapper = CE('div', {'class': 'bx-quick-settings-bar'},
                        CE('h2', {}, __('audio')),
                        CE('div', {},
                            CE('label', {}, __('volume')),
                            PREFS.toNumberStepper(Preferences.AUDIO_VOLUME, (e, value) => {
                                STREAM_AUDIO_GAIN_NODE && (STREAM_AUDIO_GAIN_NODE.gain.value = (value / 100).toFixed(2));
                            }, {suffix: '%', ticks: 100, disabled: !PREFS.get(Preferences.AUDIO_ENABLE_VOLUME_CONTROL)})),

                        CE('h2', {}, __('video')),
                        CE('div', {'class': 'bx-clarity-boost-warning'}, `⚠️ ${__('clarity-boost-warning')}`),
                        CE('div', {'data-type': 'video'},
                            CE('label', {'for': 'bx-quick-setting-stretch'}, __('ratio')),
                            PREFS.toElement(Preferences.VIDEO_RATIO, onVideoChange)),
                        CE('div', {'data-type': 'video'},
                            CE('label', {}, __('clarity')),
                            PREFS.toNumberStepper(Preferences.VIDEO_CLARITY, onVideoChange, {disabled: isSafari, hideSlider: true})), // disable this feature in Safari
                        CE('div', {'data-type': 'video'},
                            CE('label', {}, __('saturation')),
                            PREFS.toNumberStepper(Preferences.VIDEO_SATURATION, onVideoChange, {suffix: '%', ticks: 25})),
                        CE('div', {'data-type': 'video'},
                            CE('label', {}, __('contrast')),
                            PREFS.toNumberStepper(Preferences.VIDEO_CONTRAST, onVideoChange, {suffix: '%', ticks: 25})),
                        CE('div', {'data-type': 'video'},
                            CE('label', {}, __('brightness')),
                            PREFS.toNumberStepper(Preferences.VIDEO_BRIGHTNESS, onVideoChange, {suffix: '%', ticks: 25}))
                     );

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
    var orig = window.history[type];
    return function(...args) {
        const event = new Event('xcloud_popstate');
        event.arguments = args;
        window.dispatchEvent(event);

        return orig.apply(this, arguments);
    };
};


function onHistoryChanged(e) {
    if (e.arguments[0] && e.arguments[0].origin === 'better-xcloud') {
        return;
    }

    IS_PLAYING = false;
    setTimeout(RemotePlay.detect, 10);

    const $settings = document.querySelector('.better_xcloud_settings');
    if ($settings) {
        $settings.classList.add('bx-gone');
    }

    const $quickBar = document.querySelector('.bx-quick-settings-bar');
    if ($quickBar) {
        $quickBar.style.display = 'none';
    }

    STREAM_AUDIO_GAIN_NODE = null;
    $STREAM_VIDEO = null;
    StreamStats.onStoppedPlaying();
    document.querySelector('.bx-screenshot-button').style = '';

    MouseCursorHider.stop();
    TouchController.reset();

    LoadingScreen.reset();

    GamepadHandler.stopPolling();

    setTimeout(checkHeader, 2000);
}


function onStreamStarted($video) {
    IS_PLAYING = true;

    // Get title ID for screenshot's name
    if (window.location.pathname.includes('/launch/')) {
        GAME_TITLE_ID = /\/launch\/([^/]+)/.exec(window.location.pathname)[1];
    } else {
        GAME_TITLE_ID = 'remote-play';
    }

    if (TouchController.isEnabled()) {
        TouchController.enableBar();
    }

    if (PREFS.get(Preferences.CONTROLLER_ENABLE_SHORTCUTS)) {
        GamepadHandler.startPolling();
    }

    const PREF_SCREENSHOT_BUTTON_POSITION = PREFS.get(Preferences.SCREENSHOT_BUTTON_POSITION);
    const PREF_STATS_QUICK_GLANCE = PREFS.get(Preferences.STATS_QUICK_GLANCE);

    // Setup Stat's Quick Glance mode
    if (PREF_STATS_QUICK_GLANCE) {
        StreamStats.quickGlanceSetup();
        // Show stats bar
        StreamStats.start(true);
    }

    $STREAM_VIDEO = $video;
    $SCREENSHOT_CANVAS.width = $video.videoWidth;
    $SCREENSHOT_CANVAS.height = $video.videoHeight;

    StreamBadges.resolution = {width: $video.videoWidth, height: $video.videoHeight};
    StreamBadges.startTimestamp = +new Date;

    // Get battery level
    try {
        navigator.getBattery && navigator.getBattery().then(bm => {
            StreamBadges.startBatteryLevel = Math.round(bm.level * 100);
        });
    } catch(e) {}

    STREAM_WEBRTC.getStats().then(stats => {
        const allVideoCodecs = {};
        let videoCodecId;

        const allAudioCodecs = {};
        let audioCodecId;

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

        if (PREFS.get(Preferences.STATS_SHOW_WHEN_PLAYING)) {
            StreamStats.start();
        }
    });

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


// Hide Settings UI when navigate to another page
window.addEventListener('xcloud_popstate', onHistoryChanged);
window.addEventListener('popstate', onHistoryChanged);
// Make pushState/replaceState methods dispatch "xcloud_popstate" event
window.history.pushState = patchHistoryMethod('pushState');
window.history.replaceState = patchHistoryMethod('replaceState');

PreloadedState.override();

// Disable bandwidth checking
if (PREFS.get(Preferences.DISABLE_BANDWIDTH_CHECKING)) {
    Object.defineProperty(window.navigator, 'connection', {
        get: () => undefined,
    });
}

// Check for Update
checkForUpdate();

// Monkey patches
if (PREFS.get(Preferences.AUDIO_ENABLE_VOLUME_CONTROL)) {
    if (UserAgent.isSafari(true)) {
        window.AudioContext.prototype.orgCreateGain = window.AudioContext.prototype.createGain;
        window.AudioContext.prototype.createGain = function() {
            const gainNode = this.orgCreateGain.apply(this);
            gainNode.gain.value = (PREFS.get(Preferences.AUDIO_VOLUME) / 100).toFixed(2);
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

    HTMLAudioElement.prototype.orgPlay = HTMLAudioElement.prototype.play;
    HTMLAudioElement.prototype.play = function() {
        this.muted = true;

        const promise = this.orgPlay.apply(this);
        if (STREAM_AUDIO_GAIN_NODE) {
            return promise;
        }

        this.addEventListener('playing', e => e.target.pause());

        const audioCtx = STREAM_AUDIO_CONTEXT;
        const audioStream = audioCtx.createMediaStreamSource(this.srcObject);
        const gainNode = audioCtx.createGain();

        audioStream.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        gainNode.gain.value = (PREFS.get(Preferences.AUDIO_VOLUME) / 100).toFixed(2);
        STREAM_AUDIO_GAIN_NODE = gainNode;

        return promise;
    }
}

RTCPeerConnection.prototype.orgAddIceCandidate = RTCPeerConnection.prototype.addIceCandidate;
RTCPeerConnection.prototype.addIceCandidate = function(...args) {
    const candidate = args[0].candidate;
    if (candidate && candidate.startsWith('a=candidate:1 ')) {
        StreamBadges.ipv6 = candidate.substring(20).includes(':');
    }

    return this.orgAddIceCandidate.apply(this, args);
}

if (PREFS.get(Preferences.STREAM_TOUCH_CONTROLLER) === 'all') {
    TouchController.setup();
}

const OrgRTCPeerConnection = window.RTCPeerConnection;
window.RTCPeerConnection = function() {
    const peer = new OrgRTCPeerConnection();
    STREAM_WEBRTC = peer;
    return peer;
}

patchRtcCodecs();
interceptHttpRequests();
patchVideoApi();

// Setup UI
addCss();
updateVideoPlayerCss();
window.addEventListener('resize', updateVideoPlayerCss);
Toast.setup();

setupVideoSettingsBar();
setupScreenshotButton();
StreamStats.render();

disablePwa();

if (PREFS.get(Preferences.CONTROLLER_ENABLE_SHORTCUTS)) {
    GamepadHandler.initialSetup();
}

Patcher.initialize();

RemotePlay.detect();

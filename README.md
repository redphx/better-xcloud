# Better xCloud
Improve Xbox Cloud Gaming (xCloud) experience on [xbox.com/play](https://www.xbox.com/play). It also allows you to use Remote Play on the xCloud website.  

**Supported platforms:**  
- Windows
- macOS
- Linux, SteamOS (including Steam Deck)
- Android, Android TV (including Meta Quest VR Headsets)
- iOS, iPadOS

This script makes me spend more time with xCloud, and I hope the same thing happens to you.  
If you like this project please give it a 🌟. Thank you 🙏.

[![Latest version](https://img.shields.io/github/v/release/redphx/better-xcloud?label=latest)](https://github.com/redphx/better-xcloud/releases) 
[![Total downloads](https://img.shields.io/github/downloads/redphx/better-xcloud/total?color=%23e15f2c)](https://github.com/redphx/better-xcloud/releases) 
[![Total stars](https://img.shields.io/github/stars/redphx/better-xcloud?color=%23cca400)](https://github.com/redphx/better-xcloud/stargazers)  

## 🔥 The Mouse & Keyboard feature is in development
Follow [this issue](https://github.com/redphx/better-xcloud/issues/98#issuecomment-1866075541) if you want to help me test this feature. Thanks.

## Table of Contents
- [**How to install**](#how-to-install)
- [**Compatibility**](#compatibility)
- [**Features**](#features)
- [**Stream stats**](#stream-stats)
- [**Capture screenshot**](#capture-screenshot)
- [**FAQ**](#faq)
- [**Translators**](#translators)
- [**Donation**](#donation)
- [**Acknowledgements**](#acknowledgements)
- [**Disclaimers**](#disclaimers)

## How to install
1. Install an userscript extension:
   - **Safari**: Install [Userscripts extension](https://apps.apple.com/us/app/userscripts/id1463298887). Check [this page](https://github.com/redphx/better-xcloud/wiki/Using-with-Safari) before using.
   - **All other browsers**: Install [Tampermonkey extension](https://www.tampermonkey.net/).  
3. Install **Better xCloud**:
    - [Stable version](https://github.com/redphx/better-xcloud/releases/latest/download/better-xcloud.user.js)
    <!-- - [Dev version](https://github.com/redphx/better-xcloud/raw/main/better-xcloud.user.js)-->  
    I only distribute **Better xCloud** on GitHub, *DO NOT* download it on other websites or from unknown sources.
4. Refresh the [xCloud web page](https://www.xbox.com/play/).
5. Click on the new *\<SERVER NAME\>* button next to your profile picture to adjust settings.

To update manually, just install the script again (you won't lose your settings).

⚠️⚠️⚠️ If you're using Kiwi Browser on Android, make sure to follow the steps correctly and install the script with Tampermonkey (not installing it as an extension), or else it won't work.

## Compatibility
- 👍 = best choice, all features work as intended
- ✅ = confirmed to be working, might miss some features
- ❌ = not supported (mostly because of lacking Userscript/extension support)
- ➖ = unavailable
- 🗒️ = see custom notes

|                                         | Windows/Linux/SteamOS | macOS            | Android/Android TV | iOS              |
|-----------------------------------------|:----------------------|:-----------------|:-------------------|:-----------------|
| Chrome/Edge/Chromium...                 | 👍                    | 👍               | ❌                  | ❌               |
| Firefox                                 | ✅                    | ✅               | 🗒️<sup>(1)</sup>    | ❌               |
| Safari                                  | ➖                    | ✅<sup>(2)</sup> | ➖                  | ✅<sup>(3)</sup> |
| [Kiwi Browser](https://kiwibrowser.com) | ➖                    | ➖               | 👍                  | ➖               |

Don't see your browser in the table? If it supports Tampermonkey/Userscript then the answer is likely **"YES"**.

<sup>1</sup> Follow [this guide](https://support.mozilla.org/en-US/kb/find-and-install-add-ons-firefox-android) to install Tampermonkey on Firefox Android. Its Gamepad API doesn't work properly so it might not recognize your controller.  
<sup>2, 3</sup> Requires [Userscripts app](https://apps.apple.com/us/app/userscripts/id1463298887) (free & open-source). Check [this page](https://github.com/redphx/better-xcloud/wiki/Using-with-Safari) before using.  

---
- **Kiwi Browser** is the best choice on Android. All features work, it means you can get 1080p stream + high-quality codec profile (the best possible quality).  
- **Better xCloud** also works on Android TV, but you'll have to sideload the browser APK and need a Bluetooth mouse if you want to interact with the Settings.  

## Features

<img width="400" alt="Settings UI" src="https://github.com/redphx/better-xcloud/assets/96280/ca38b3fa-1e89-4b37-937c-a6796c07cdf1">
<br>
<img width="400" alt="Remote Play dialog" src="https://github.com/redphx/better-xcloud/assets/96280/daf7f698-a228-4f9c-8f23-9669e061a64c">
<br>
<img width="600" alt="Stream HUD" src="https://github.com/redphx/better-xcloud/assets/96280/51bdb96c-79ab-402f-902a-a9e6229973b2">
<br>
<img width="600" alt="Stream settings" src="https://github.com/redphx/better-xcloud/assets/96280/ed513cb3-6e6c-4e8e-9e06-c62e71e41c90">

&nbsp;  
  
**Demo video:** [https://youtu.be/oDr5Eddp55E  ](https://youtu.be/AYb-EUcz72U)  
- **🔥 Support [Remote Play](https://support.xbox.com/help/games-apps/game-setup-and-play/how-to-set-up-remote-play)**  
  > 1080p resolution and can stream Xbox 360 games.  
- **🔥 Improve visual quality of the stream**  
  > Similar to (but not as good as) the "Clarity Boost" of xCloud on Edge browser. [Demo video](https://youtu.be/ZhW2choAHUs). 
- **🔥 Show stream stats**  
  > Check [Stream stats section](#stream-stats) for more info.  
- **🔥 Capture screenshot**
  > Exclusive to **Better xCloud**. Check the [**Capture screenshot** section](#capture-screenshot) for more info.
- **🔥 Hold the "Quit game" button for one second to refresh the stream**
  > Sometimes you can fix the bad connection to the stream or low FPS simply by refreshing the page.  
  > Useful on mobile where the pull-to-refresh feature doesn't work while playing.  
- **🔥 Touch controller**
  > Enable touch controller support for all games.

### Server
- **Set the region of streaming server**  
  > Connect to another server instead of the default one.  
  > It's not using VPN.  
  > ["Can I get banned for using this?"](#faq)  
- **Preferred game's language**
  > If the game doesn't support this language, it will use the same language as xCloud's website.  
- **Prefer IPv6 server**
  > Might reduce latency.

### Stream
- **Set target resolution**
  > By default you only get 1080p stream when playing on desktop.  
  > This feature can give you 1080p stream even on mobile, without having to change User-Agent.  
- **Change visual quality**
  > Increase/decrease the quality of the stream to your liking. Only works in Chrome/Edge/Kiwi...  
  > Comparison video with the setting ON & OFF: https://youtu.be/-9PuBJJSgR4  
- **Disable bandwidth checking**  
  > xCloud won't warn about slow connection speed.
- **Enable volume control feature**
  > Allow increasing stream's volume up to 600%  
  > ⚠️ Disable this setting if you experience slowdown, choppy/muted stream  
- **Enable microphone on game launch**  
  > Automatically enable the mic when starting to play a game.  
- **Hide mouse cursor on idle**  
  > Hide the mouse cursor after 3 seconds of not moving.  

### Controller
- Enable controller shortcuts  
  > `Home` is  the button which activates the Xbox sidebar menu (similar to the Xbox/Nexus button on the official controller).  
  > Not all controllers have this button. It's the `B16` button on the [Gamepad Tester site](https://hardwaretester.com/gamepad).  
  > More shortcuts will be added later.
  
  | Shortcut      | Action           |
  |---------------|------------------|
  | Home + RB     | Take screenshot  |
  | Home + Select | Toggle stats bar |

### 🔥 Touch controller
- **Availability**
  > Only for devices with touch support (Android/iOS/iPadOS/...). Using "Desktop mode" in mobile browsers also disables this feature.  
  > - **Default**: nothing change.  
  > - **Off**: stop the touch controller from showing when touching the screen. Useful when you play on a device with a built-in controller like Logitech G Cloud, Steam Deck, etc.  
  > - **All games**: enable touch controller support for all games. Games with custom layout won't be affected.  
  > Double-tap anywhere at the bottom of the screen to show/hide the controller. Useful when you're viewing cutscenes.  
  > &nbsp;  
  > ![toggle-touch-controller](https://github.com/redphx/better-xcloud/assets/96280/8b9c7091-529a-45ae-8b45-73e61531ecc8)
- **Button styles**
  > - Default  
  > - Muted  
  > - All white (only for standard/default controller)  
  > &nbsp;  
  > <img width="400" alt="Button styles" src="https://github.com/redphx/better-xcloud/assets/96280/2bfef2b3-6712-4924-b067-c2312f8c8062">

### Loading screen
- **Show game art**
  > Replace the black background with game art if it's available.  
- **Show the estimated wait time**
  > The time is estimated by the server.  
  > It's not 100% correct: you might get in the game sooner or later.  
  > Check [#51](https://github.com/redphx/better-xcloud/issues/51) for more info.  
- **Show/hide the rocket animation**
  > Always show/Hide when queuing/Always hide.  
  > Hide this animation might save some battery life while queuing.  
  
<img height="300" alt="Loading screen" src="https://github.com/redphx/better-xcloud/assets/96280/46074b14-1abb-466d-a859-d46ad4dac2fd">


### UI
- **Switch website's layout**  
  > Switch between default layout and Smart TV layout (without having to change User-Agent).  
- **Simplify Stream's menu**  
  > Hide the labels of the menu buttons.  
- **Skip Xbox splash video**
  > Save 3 seconds.
- **Hide System menu's icon**
  > You can still click on it, but it doesn't block the screen anymore.
- **Reduce UI animations**
  > Disable `transition` CSS property in some elements. The smooth scrolling cannot be disabled.  

### Other  
- **Disable social features**
  > Features like friends, chat... Disable these will make the page load faster.  
- **Disable xCloud analytics**
  > The analytics contains statistics of your streaming session, so I'd recommend allowing analytics to help Xbox improve xCloud's experience in the future.

### In-game settings
- **🔥 Controller & device vibrations**
  > Control vibration settings  
  > Adjust vibration intensity  
- **Volume control**
  > Increase stream's volume up to 600%  
  > Can be disabled in the Main Settings  
- **🔥 Improve stream's clarity**
  > Similar to (but not as good as) the "Clarity Boost" of xCloud on Edge browser. [Demo video](https://youtu.be/ZhW2choAHUs).  
  > Also known as poor man's "Clarity Boost".  
  > Affects the stream's performance, uses more battery, and may causes frames to drop (especially on lower-end devices).  
  > Works with Chrome/Chromium browsers.  
  > Doesn't work with Safari.  
  > &nbsp;  
  > ![clarity](https://github.com/redphx/better-xcloud/assets/96280/ed63bbb0-fcbf-43e2-8e51-ac2733e697b8)
  > *(click to enlarge)*

- **Change video's ratio**
  > Useful when you don't have a 16:9 screen
- **Adjust video filters**
  > Brightness/Contrast/Saturation.  
  > ⚠️ These features don't work when xCloud's "Clarity Boost" feature is ON ([#64](https://github.com/redphx/better-xcloud/issues/64)).  
- **Display stream's statuses**
  > Region/Server/Codecs/Resolution...  
  > Current playtime of the session.  
  > Current battery level. Not working on [some browsers](https://caniuse.com/battery-status).  
  > Estimated total data sent/received.  

### Advanced features  
- **Change User-Agent**
  > Useful when you're using unsupported browsers.  
  > This setting only affects xCloud, and it doesn't change browser's global User-Agent.  
  > 📝 If you get 404 error after using this feature, try refreshing the page a few times. See [#34](https://github.com/redphx/better-xcloud/issues/34).  
- **Hide footer and other UI elements**

<sup>(\*)</sup> By default (for compatibility reasons) xCloud only uses high quality codec profile when you use Tizen TV or Chrome/Edge/Chromium browser on Chrome/MacOS. Enable this setting will give you the best experience no matter what platform & browser you're on.

## Stream stats  
<img alt="Stream stats" src="https://github.com/redphx/better-xcloud/assets/96280/9fb51941-85a9-47c4-8d48-331456b9ce73">  
  
<img width="418" alt="Stream stats settings" src="https://github.com/redphx/better-xcloud/assets/96280/6313a0c6-03bf-4325-b60d-18a23c681933">  

- While playing > `...` > `Stream Stats`.  
- Change settings by opening `Stream settings` while playing.  
- This bar is updated every second.  
- **Quick glance** feature: only show the stats bar when the System menu is expanded. The 👀 emoji at the beginning indicates that the stats bar is in the quick glance mode.  
- ⚠️ Using **Better xCloud** or showing the stats bar also affects the performance of the stream.  

| Abbr. | Full name          | Explain                                                                                                                                           |
|------:|:-------------------|:--------------------------------------------------------------------------------------------------------------------------------------------------|
| PING  | Ping               | The number of seconds it takes for data to be sent from your device to the server and back over (the correct term is "Round Trip Time")           |
| FPS   | Frames per Seconds | The number of decoded frames in the last second of the stream (may not be the same as the FPS of the game)                                        |
| DT    | Decode Time        | The average time it took to decode one frame in the last second (bugged on Android [#26](https://github.com/redphx/better-xcloud/issues/26))      |
| BR    | Bitrate            | The amount of data the server sent to your device in the last second                                                                              |
| PL    | Packets Lost       | The total number of packets lost                                                                                                                  |
| FL    | Frames Lost        | The total number of frames dropped prior to decode or dropped because the frame missed its display deadline                                       |

This info is provided by WebRTC API. You can use browser's built-in tool to see more info:  
- Chrome/Edge/Chromium variants: `chrome://webrtc-internals`  
- Firefox: `about:webrtc`

Colors:  
- Red = Bad
- Yellow = Okay
- Green = Good
- White = Great

⚠️ Having this info on all the time will drain the battery faster, so I'd recommend only using it when having network problems.  

## Capture screenshot  
- This feature is only available in **Better xCloud**.  
- Works on both desktop & mobile, but it was designed for mobile users.
- It's client-side only.
- It captures the current frame of the stream and saves it to a file. That means you won't get the raw quality like when you play on a console, but it's still better than using the built-in screenshot feature on your phone.  
- Screenshot's resolution & quality depend on the quality of the stream at the moment.  
- Screenshot doesn't include touch UI, notification bar... only the gameplay.  
- There might be a slight delay.  
- ⚠️ It's not possible to map the Share/Screenshot button on your controller to this feature.  

### How to capture screenshot  
1. Enable this feature in the Settings.
2. Play a game.
3. Tap once at the bottom left/right (depending on your setting) to show the Screenshot button.
4. Tap on that button to capture screenshot.
5. Screenshot will be saved by the browser.
6. You can double-tap that corner to capture screenshot.

![screenshot](https://github.com/redphx/better-xcloud/assets/96280/b277193e-df94-4d72-b75c-3f728c984974)

## FAQ
1. **Will I get banned for using this?**  
I think it's very unlikely that you'll get banned for using this. Most of the features only affect client-side, except for switching region of streaming server (you'll connect to another server instead of the default one). If you want to be safe just avoid using that. As always, use it as your own risk.

2. **Why is it an Userscript and not an extension?**  
It's because not many browsers on Android support installing extensions (and not all extensions can be installed).

3. **Why doesn't the xCloud website implement *this* or *that* feature from Better xCloud?**  
Think of this project as an unofficial beta version of xCloud.  
    - **Better xCloud** doesn't have to worry about the compatibility much: if it doesn't work on this browser, it can just suggest you switch to another one. xCloud can't do the same.  
    - On the xCloud's side, they have a lot more users and devices to support, so it's more difficult for them to implement a new feature.  
    - Also, it's not easy to explain some of the features of **Better xCloud** to normal xCloud users.  

4. **Can I use this with the Xbox Android app?**  
No, you can't. You'll have to modify the app.

5. **Will it be able to enable the "Clarity Boost" feature on non-Edge browsers?**  
~~No. The "Clarity Boost" feature uses an exclusive API (`Video.msVideoProcessing`) that's only available on Edge browser for desktop at the moment.~~  
Fake news! This feature has been implemented in **Better xCloud** since version 1.12, but the original "Clarity Boost" still perform better.  

7. **Will it be able to request a lower FPS or increase the maximum bitrate (15Mbps) of the stream?**  
Sorry, no. The server decides all these settings.

8. **What's the meaning behind the name "Better xCloud"?**  
It's a reference to an Userscript called "better360" that I created many years ago. I regret not choosing the name "xCloud Enhancement Suite", or XES for short.  

## Translators
  - **Chinese (Simplified)**: [@nyavana](https://github.com/nyavana)
  - **French**: rodolphe.chouteau, Stay34yth
  - **German**: [@KingNothing81](https://github.com/KingNothing81), mynameismanu
  - **Korean**: [@rightones](https://github.com/rightones)
  - **Italian**: Greenylie, Rakan129, Carza-104, graziequalcuno, DioCannabinoide
  - **Japanese**: Tak_attack, udonshi
  - **Portuguese (Brazilian)**: [@ricardo404](https://github.com/ricardo404), [@Haisom](https://github.com/Haisom), italorafael22062009, PotatoPTT, guilhermecursi, renatomaster01
  - **Polish**: [@aleksishere](https://github.com/aleksishere)
  - **Russian**: anpom6, soophik
  - **Spanish**: [@PabloSebas](https://github.com/PabloSebas), csvnchzn
  - **Turkish**: [@transbebek](https://github.com/transbebek)
  - **Ukrainian**: glebanych
  - **Vietnamese**: [@redphx](https://github.com/redphx)

Visit [here](https://crowdin.com/project/better-xcloud) if you want to translate **Better xCloud** to more languages.  
Use [this post](https://github.com/redphx/better-xcloud/discussions/131) for discussion.  

## Donation
If you think this project is useful and want to support future developments, please consider making a donate via [my Ko-fi page](https://ko-fi.com/redphx).  
Or you can give this project a star, that's also helpful.  
Thank you.  

## Acknowledgements  
- [n-thumann/xbox-cloud-server-selector](https://github.com/n-thumann/xbox-cloud-server-selector) for the idea of IPv6 feature
- Icons by [Phosphor Icons](https://phosphoricons.com)

## Disclaimers  
- Use it at your own risk.
- This project is not affiliated with Xbox in any way. All Xbox logos/icons/trademarks are copyright of their respective owners.

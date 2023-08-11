# Better xCloud
Improve [Xbox Cloud Gaming (xCloud)](https://www.xbox.com/play/) experience on web browser.  
The main target of this script is mobile users, but it should work great on desktop too.  

This script makes me spend more time with xCloud, and I hope the same thing happens to you.  
If you like this project please give it a 🌟. Thank you 🙏.

[![Latest version](https://img.shields.io/github/v/release/redphx/better-xcloud?label=latest)](https://github.com/redphx/better-xcloud/releases) 
[![Total stars](https://img.shields.io/github/stars/redphx/better-xcloud?color=%23cca400)](https://github.com/redphx/better-xcloud/stargazers)  
<!--
[![Total downloads](https://img.shields.io/github/downloads/redphx/better-xcloud/total?color=%23e15f2c)](https://github.com/redphx/better-xcloud/releases) 
-->

## Table of Contents
- [**Features**](#features)
- [**How to install**](#how-to-install)
- [**Compatibility**](#compatibility)
- [**Stream stats**](#stream-stats)
- [**Capture screenshot**](#capture-screenshot)
- [**FAQ**](#faq)
- [**Acknowledgements**](#acknowledgements)
- [**Disclaimers**](#disclaimers)


## Features

<img width="400" alt="Settings UI" src="https://github.com/redphx/better-xcloud/assets/96280/6e74fdaf-dc84-416a-a2bc-5e117a3717e3">
<br>
<img width="600" alt="Stream HUD" src="https://github.com/redphx/better-xcloud/assets/96280/e30f6514-13ca-41c6-bff2-979573cff956">
<br>
<img width="600" alt="Video settings" src="https://github.com/redphx/better-xcloud/assets/96280/c45877f9-379c-4ba4-977c-021d3d8835e4">

&nbsp;  
  
**Demo video:** [https://youtu.be/oDr5Eddp55E  ](https://youtu.be/AYb-EUcz72U)  

- **🔥 Show stream stats**  
  > Check [Stream stats section](#stream-stats) for more info.  
- **🔥 Capture screenshot**
  > Exclusive to **Better xCloud**. Check the [**Capture screenshot** section](#capture-screenshot) for more info.
- **🔥 Hold the "Quit game" button for one second to refresh the stream**
  > Sometimes you can fix the bad connection to the stream simply by refreshing the page.  
  > Useful on mobile where the pull-to-refresh feature doesn't work while playing.  
- **🔥 Touch controller**
  > Enable touch controller support for all games.

### Server
- **Set the region of streaming server**  
  > Connect to another server instead of the default one. Check the [**FAQ** section](#faq) for some notes.
- **Preferred game's language**
  > If the game doesn't support this language, it will use the same language as xCloud's website.  
- **Prefer IPv6 server**
  > Might reduce latency.

### Stream quality
- **Set target resolution**
  > By default you only get 1080p stream when playing on desktop.  
  > This feature can give you 1080p stream even on mobile, without having to change User-Agent.  
- **Force high-quality codec (if supported)<sup>(\*)</sup>**
  > Force xCloud to use the best streaming codec profile (same as desktop & TV) if possible. You don't have to change User-Agent anymore.  
  > You should enable this feature even if you're on desktop.  
  > Not available for some browsers (Firefox, Safari...).  
  > Use more bandwidth & battery.  
  > Comparison video with the setting ON & OFF: https://youtu.be/-9PuBJJSgR4  
- **Disable bandwidth checking**  
  > xCloud won't warn about slow connection speed.  

### Controller
- **🔥 Touch controller**
  > Only for mobile (Android/iOS/iPadOS).  
  > - **Default**: nothing change.  
  > - **Off**: stop the touch controller from showing when touching the screen. Useful when you play on a device with a built-in controller like Logitech G Cloud, Steam Deck, etc.  
  > - **All games**: enable touch controller support for all games. Games with custom layout won't be affected.  
  > Double-tap anywhere at the bottom of the screen to show/hide the controller. Useful when you're viewing cutscenes.
  > ![touch-controller](https://github.com/redphx/better-xcloud/assets/96280/6ad6fc76-74aa-46f8-8fb0-806474f494ad)

- **Hide mouse cursor on idle**  
  > Hide the mouse cursor after 3 seconds of not moving.  

### UI
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

### Stream's video features
⚠️ These features don't work when xCloud's "Clarity Boost" feature is ON ([#64](https://github.com/redphx/better-xcloud/issues/64)).  

- **Stretch video to full sctreen**
  > Useful when you don't have a 16:9 screen
- **Adjust video filters**
  > Brightness/Contrast/Saturation.
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

## How to install
1. Install [Tampermonkey extension](https://www.tampermonkey.net/) on suppported browsers. For Safari, use [Userscripts app](https://apps.apple.com/us/app/userscripts/id1463298887) (not working properly, see [#81](https://github.com/redphx/better-xcloud/issues/81)).  
2. Install **Better xCloud**:
    - [Stable version](https://github.com/redphx/better-xcloud/releases/latest/download/better-xcloud.user.js)
    - [Dev version](https://github.com/redphx/better-xcloud/raw/main/better-xcloud.user.js)  
    I only distribute **Better xCloud** on GitHub, *DO NOT* download it on other websites or from unknown sources.  
3. Refresh [xCloud web page](https://www.xbox.com/play/).
4. Click on the new "SERVER NAME" button next to your profile picture to adjust settings.  
5. Don't forget to enable auto updating for the script in Tampermonkey.

To update manually, just install the script again (you won't lose your settings).

⚠️⚠️⚠️ If you're using Kiwi Browser on Android, make sure to follow the steps correctly and install the script with Tampermonkey (not installing it as an extension), or else it won't work.

### Tutorial videos  
If you still have trouble installing **Better xCloud**, you can follow one of these tutorial videos:  
- 🇧🇷 [Tudo isso agora tem no xCloud!! (ChipTec)](https://youtu.be/zS8Zy0mYIbU?t=40)
- 🇫🇷 [#Tuto Xbox Cloud Gaming : Ecran ultra large et adieu les bandes noires sur smartphone (Cloud Gaming France)](https://www.youtube.com/watch?v=5U05KoTdDHs)


## Compatibility
✅ = confirmed to be working  
❓ = not yet tested  
❌ = not supported (mostly because of lacking Userscript/extension support)  
➖ = unavailable  
⚠️ = see custom notes  
|                                         | Desktop          | Android/Android TV | iOS             |
|-----------------------------------------|:-----------------|:-------------------|:----------------|
| Chrome/Edge/Chromium variants           | ✅               | ❌                 | ❌               |
| Firefox                                 | ✅               | ⚠️<sup>(1)</sup>   | ❌               |
| Safari                                  | ⚠️<sup>(2)</sup> | ➖                 | ⚠️<sup>(3)</sup> |
| [Hermit](https://hermit.chimbori.com)   | ➖               | ⚠️<sup>(4)</sup>   | ➖               |
| [Kiwi Browser](https://kiwibrowser.com) | ➖               | ✅                 | ➖               |

Don't see your browser in the table? If it supports Tampermonkey/Userscript then the answer is likely **"YES"**.

<sup>1</sup> Follow [this guide](https://support.mozilla.org/en-US/kb/find-and-install-add-ons-firefox-android) to install Tampermonkey on Firefox Android. Its Gamepad API doesn't work properly so it might not recognize your controller.  
<sup>2, 3</sup> Requires [Userscripts app](https://apps.apple.com/us/app/userscripts/id1463298887) (free & open source).  Not working properly ([#81](https://github.com/redphx/better-xcloud/issues/81)). If you're on macOS, I'd recommend using Chrome/Edge instead.  
<sup>4</sup> NOT RECOMMENDED at the moment since its Userscript implementation is not working properly (see https://github.com/redphx/better-xcloud/issues/5 for full details).    

---
- **Kiwi Browser** is the best choice on Android. All features work, it means you can get 1080p stream + high quality codec profile (the best possible quality).  
- **Better xCloud** also works on Android TV, but you'll have to sideload the browser APK and need a Bluetooth mouse if you want to interact with the Settings.  

## Stream stats  
<img width="500" alt="Stream stats" src="https://github.com/redphx/better-xcloud/assets/96280/0d4abb6b-49ab-4c9a-a52d-df7e396d2145">

- While playing > `...` > `Stream Stats`.
- Double-click on the stats bar to show the Settings dialog.
- This bar is updated every second.  
- **Quick glance** feature: only show the stats bar when the System menu is expanded. The 👀 emoji at the beginning indicates that the stats bar is in the quick glance mode.  
- ⚠️ Using **Better xCloud** or showing the stats bar also affects the performance of the stream.  

| Abbr. | Full name          | Explain                                                                                                                                    |
|------:|:-------------------|:-------------------------------------------------------------------------------------------------------------------------------------------|
| FPS   | Frames per Seconds | The number of decoded frames in the last second of the stream (may not be the same as the FPS of the game)                                 |
| DT    | Decode Time        | The average time it took to decode one frame in the last second (bugged in Kiwi Browser [#26](https://github.com/redphx/better-xcloud/issues/26)) |
| RTT   | Round Trip Time    | The number of seconds it takes for data to be sent from your device to the server and back over (similar to ping, lower is better)         |
| BR    | Bitrate            | The amount of data the server sent to your device in the last second                                                                       |
| PL    | Packets Lost       | The total number of packets lost                                                                                                           |
| FL    | Frames Lost        | The total number of frames dropped prior to decode or dropped because the frame missed its display deadline                                |

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

<img width="600" alt="Screenshot button" src="https://github.com/redphx/better-xcloud/assets/96280/a911b141-5dc0-450a-aeac-30d9cf202b44">

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
No. The "Clarity Boost" feature uses an exclusive API (`Video.msVideoProcessing`) that's only available on Edge browser for desktop at the moment.

6. **Will it be able to request a lower FPS or increase the maximum bitrate (15Mbps) of the stream?**  
Sorry, no. The server decides all these settings.

7. **What's the meaning behind the name "Better xCloud"?**  
It's a reference to an Userscript called "better360" that I created many years ago. I regret not choosing the name "xCloud Enhancement Suite", or XES for short.  

## User-Agent
Moved to [wiki](https://github.com/redphx/better-xcloud/wiki/User‐Agent).

## Acknowledgements  
- [n-thumann/xbox-cloud-server-selector](https://github.com/n-thumann/xbox-cloud-server-selector) for the idea of IPv6 feature
- Icons by [Phosphor Icons](https://phosphoricons.com)

## Disclaimers  
- Use as it your own risk.  
- This project is not affiliated with Xbox in any way. All Xbox logos/icons/trademarks are copyright of their respective owners.

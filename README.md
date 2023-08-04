# Better xCloud
Improve [Xbox Cloud Gaming (xCloud)](https://www.xbox.com/play/) experience on web browser.  
The main target of this script is mobile users, but it should work great on desktop too.

This script makes me spend more time with xCloud, and I hope the same thing happens to you.  
Give this project a 🌟 if you like it. Thank you 🙏.

[![Latest version](https://img.shields.io/github/v/release/redphx/better-xcloud?label=latest)](https://github.com/redphx/better-xcloud/releases) 
[![Total stars](https://img.shields.io/github/stars/redphx/better-xcloud?color=%23cca400)](https://github.com/redphx/better-xcloud/stargazers)  
<!--
[![Total downloads](https://img.shields.io/github/downloads/redphx/better-xcloud/total?color=%23e15f2c)](https://github.com/redphx/better-xcloud/releases) 
-->


## Features

<img width="475" alt="Settings UI" src="https://github.com/redphx/better-xcloud/assets/96280/575d566a-7759-4cce-962d-7e5f55a70d9e">

<img width="475" alt="Stream HUD UI" src="https://github.com/redphx/better-xcloud/assets/96280/b4f943f1-d0b4-4401-a8cb-0fd677a5c6f0">

&nbsp;  
  
**Demo video:** https://youtu.be/oDr5Eddp55E  

- **🔥 Show stream stats**  
  > Check [Stream stats section](#stream-stats) for more info.  
- **🔥 Capture screenshot**
  > Exclusive to **Better xCloud**. Check the [**Capture screenshot** section](#capture-screenshot) for more info.
- **🔥 Hold the "Quit game" button for one second to refresh the stream**
  > Sometimes you can fix the bad connection to the stream simply by refreshing the page.  
  > Useful on mobile where the pull-to-refresh feature doesn't work while playing.  
- **Switch region of streaming server**  
  > Connect to another server instead of the default one. Check the [**FAQ** section](#faq) for some notes.
- **Preferred game's language**
  > If the game doesn't support this language, it will use the same language as xCloud's website.  
- **Stream's target resolution**
  > Set stream's resolution.  
  > By default you only get 1080p stream when playing on desktop.  
  > This feature can give you 1080p stream even on mobile, without having to change User-Agent.  
- **Force high quality codec (if supported)<sup>(\*)</sup>**
  > Force xCloud to use the best streaming codec profile (same as desktop & TV) if possible. You don't have to change User-Agent anymore.  
  > You should enable this feature even if you're on desktop.  
  > Not available for some browsers (Firefox, Safari...). Use the [changing User-Agent method](https://github.com/redphx/better-xcloud/wiki/User‐Agent) instead.  
  > Use more bandwidth & battery.  
  > Comparison video with the setting ON & OFF: https://youtu.be/-9PuBJJSgR4  
- **Prefer IPv6 streaming server**
  > Might reduce latency.
- **Disable bandwidth checking**  
  > xCloud won't warn about slow connection speed.  
- **Skip Xbox splash video**
  > Save 3 seconds.
- **Hide Dots icon while playing**
  > You can still click on it, but it doesn't block the screen anymore.
- **Disable touch controller**
  > Stop the touch controller from showing when touching the screen.  
  > Useful when you play on a device with a built-in controller like Logitech G Cloud, Steam Deck, Retroid, etc.
- **Simplify Stream's menu**
  > Hide the labels of the menu buttons.
- **Hide mouse cursor while playing**  
  > Hide the mouse cursor after 3 seconds of not moving.  
- **Stretch video to full sctreen**
  > Useful when you don't have a 16:9 screen
- **Adjust video filters**
  > Brightness/Contrast/Saturation.
- **Display stream's statuses**
  > Region/Server/Codecs/Resolution...  
  > Current playtime of the session.  
  > Current battery level.  
  > Estimated total data sent/received.  
- **Disable social features**
  > Features like friends, chat... Disable these will make the page load faster.  
- **Disable xCloud analytics**
  > The analytics contains statistics of your streaming session, so I'd recommend allowing analytics to help Xbox improve xCloud's experience in the future.
- **Change User-Agent**
  > Useful when you're using unsupported browsers.  
  > This setting only affects xCloud, and it doesn't change browser's global User-Agent.  
  > 📝 If you get 404 error after using this feature, try refreshing the page a few times. See [#34](https://github.com/redphx/better-xcloud/issues/34).  
- **Reduce UI animations**
  > Disable `transition` CSS property in some elements. The smooth scrolling cannot be disabled.  
- **Hide footer and other UI elements**

<sup>(\*)</sup> By default (for compatibility reasons) xCloud only uses high quality codec profile when you use Tizen TV or Chrome/Edge/Chromium browser on Chrome/MacOS. Enable this setting will give you the best experience no matter what platform & browser you're on.

## How to use
1. Install [Tampermonkey extension](https://www.tampermonkey.net/) on suppported browsers. For Safari, use [Userscripts app](https://apps.apple.com/us/app/userscripts/id1463298887).  
2. Install **Better xCloud**:
    - [Stable version](https://github.com/redphx/better-xcloud/releases/latest/download/better-xcloud.user.js)
    - [Dev version](https://github.com/redphx/better-xcloud/raw/main/better-xcloud.user.js)  
4. Refresh [xCloud web page](https://www.xbox.com/play/).
5. Click on the new "SERVER NAME" button next to your profile picture to adjust settings.  
6. Don't forget to enable auto updating for the script in Tampermonkey.

To update manually, just install the script again (you won't lose your settings).

## Tutorial videos  
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
| Safari                                  | ✅<sup>(2)</sup> | ➖                 | ✅<sup>(3)</sup> |
| [Hermit](https://hermit.chimbori.com)   | ➖               | ⚠️<sup>(4)</sup>   | ➖               |
| [Kiwi Browser](https://kiwibrowser.com) | ➖               | ✅                 | ➖               |

Don't see your browser in the table? If it supports Tampermonkey/Userscript then the answer is likely **"YES"**.

<sup>1</sup> Follow [this guide](https://support.mozilla.org/en-US/kb/find-and-install-add-ons-firefox-android) to install Tampermonkey on Firefox Android. Its Gamepad API doesn't work properly so it might not recognize your controller.  
<sup>2, 3</sup> Requires [Userscripts app](https://apps.apple.com/us/app/userscripts/id1463298887) (free & open source).  
<sup>4</sup> NOT RECOMMENDED at the moment since its Userscript implementation is not working properly (see https://github.com/redphx/better-xcloud/issues/5 for full details).    

---
- **Kiwi Browser** is the best choice on Android. All features work, it means you can get 1080p stream + high quality codec profile (the best possible quality).  
- **Better xCloud** also works on Android TV, but you'll have to sideload the browser APK and need a Bluetooth mouse if you want to interact with the Settings.  

## Stream stats  
<img width="500" alt="Stream stats" src="https://github.com/redphx/better-xcloud/assets/96280/0d4abb6b-49ab-4c9a-a52d-df7e396d2145">

- While playing > `...` > `Stream Stats` (the one with the eye icon).
- Double-click on the stats bar to show the Settings dialog.
- This bar is updated every second.  
- **Quick glance** feature: only show the stats bar when the System buttons bar is expanded. The 👀 emoji at the beginning indicates that the stats bar is in the quick glance mode.  
- ⚠️ Using **Better xCloud** or showing the stats bar also affects the performance of the stream.  

| Abbr. | Full name          | Explain                                                                                                                                    |
|------:|:-------------------|:-------------------------------------------------------------------------------------------------------------------------------------------|
| FPS   | Frames per Seconds | The number of decoded frames in the last second of the stream (may not be the same as the FPS of the game)                                 |
| DT    | Decode Time        | The average time it took to decode one frame in the last second (might be bugged [#26](https://github.com/redphx/better-xcloud/issues/26)) |
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
For being an unofficial tool, **Better xCloud** has the luxury to implement anything on the xCloud website. On the xCloud's side, they have a lot more users and devices to support, so it's more difficult for them to implement a new feature. Also it's not easy to explain some of the features of **Better xCloud** to normal xCloud users.  

4. **Can I use this with the Xbox Android app?**  
No, you can't. You'll have to modify the app.

5. **Will you be able to enable the "Clarity Boost" feature on non-Edge browsers?**  
No. The "Clarity Boost" feature uses an exclusive API (`Video.msVideoProcessing`) that's only available on Edge browser for desktop at the moment.

## User-Agent
Moved to [wiki](https://github.com/redphx/better-xcloud/wiki/User‐Agent).

## Acknowledgements  
- [n-thumann/xbox-cloud-server-selector](https://github.com/n-thumann/xbox-cloud-server-selector) for the idea of IPv6 feature
- Icons by [Adam Design](https://www.iconfinder.com/iconsets/user-interface-outline-27)

## Disclaimers  
- Use as it your own risk.  
- This project is not affiliated with Xbox in any way. All Xbox logos/icons/trademarks are copyright of their respective owners.

# Better xCloud
Improve [Xbox Cloud Gaming (xCloud)](https://www.xbox.com/play/) experience on web browser.  
The main target of this script is mobile users, but it should work great on desktop too.

Give this project a 🌟 if you like it. Thank you 🙏.

## Features

<img width="475" alt="Settings UI" src="https://github.com/redphx/better-xcloud/assets/96280/ad687344-214d-4822-affe-21f1b1e105c8"> 
<img width="475" alt="Stream HUD UI" src="https://github.com/redphx/better-xcloud/assets/96280/ff695d3a-b077-4b21-b778-beb0a1fdd6be">  

&nbsp;  
  
**Demo video:** https://youtu.be/oDr5Eddp55E  

- **Switch region of streaming server**  
  > Connect to another server instead of the default one. Check the [**FAQ** section](#faq) for some notes.  
  > Not working in Hermit ([#5](https://github.com/redphx/better-xcloud/issues/5)).
- **Force 1080p stream**
  > By default you only get 1080p stream when playing on desktop.  
  > This feature will give you 1080p stream even on mobile, without having to change User-Agent.  
  > Not working in Hermit ([#5](https://github.com/redphx/better-xcloud/issues/5)).
- **Force high quality codec (if possible)<sup>(\*)</sup>**
  > Force xCloud to use the best streaming codec profile (same as desktop & TV) if possible. You don't have to change User-Agent anymore.  
  > You should enable this feature even if you're on desktop.  
  > Not available for some browsers (Firefox, Safari...).  
  > Use more bandwidth & battery.  
  > Comparison video with the setting ON & OFF: https://youtu.be/-9PuBJJSgR4  
- **Prefer IPv6 streaming server**
  > Might reduce latency.
- **Disable bandwidth checking**
  > xCloud won't reduce quality when the internet speed is slow
- **🔥 Capture screenshot**
  > Exclusive to **Better xCloud**. Check the [**Capture screenshot** section](#capture-screenshot) for more info.
- **Skip Xbox splash video**
  > Save 3 seconds.
- **Hide Dots icon while playing**
  > You can still click on it, but it doesn't block the screen anymore
- **Reduce UI animations**
  > Disable `transition` CSS property in some elements. The smooth scrolling cannot be disabled.
- **Stretch video to full sctreen**
  > Useful when you don't have a 16:9 screen
- **Adjust video filters**
  > Brightness/Contrast/Saturation.
- **Display stream's statuses**
  > Region/Server/Quality/Resolution...
- **Disable social features**
  > Features like friends, chat... Disable these will make the page load faster.  
  > Not working in Hermit ([#5](https://github.com/redphx/better-xcloud/issues/5)).
- **Disable xCloud analytics**
  > The analytics contains statistics of your streaming session, so I'd recommend to allow analytics to help Xbox improve xCloud's experence in the future.  
  > Not working in Hermit ([#5](https://github.com/redphx/better-xcloud/issues/5)).
- **Hide footer and other UI elements**
- **🔥 Show stream stats**
  > Check [Stream stats section](#stream-stats) for more info.  

<sup>(\*)</sup> By default (for compatibility reasons) xCloud only uses high quality codec profile when you use Tizen TV or Chrome/Edge/Chromium browser on Chrome/MacOS. Enable this setting will give you the best experience no matter what platform & browser you're on.

## How to use
1. Install [Tampermonkey extension](https://www.tampermonkey.net/) on suppported browsers.  
2. Install **Better xCloud**:
    - [Stable version](https://github.com/redphx/better-xcloud/releases/latest/download/better-xcloud.user.js)
    - [Dev version](https://github.com/redphx/better-xcloud/raw/main/better-xcloud.user.js)  
4. Refresh [xCloud web page](https://www.xbox.com/play/).
5. Click on the new "SERVER NAME" button next to your profile picture to adjust settings.  
6. Don't forget to enable auto updating for the script in Tampermonkey.

To update manually, just install the script again (you won't lose your settings).

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
- **Better xCloud** also works on Android TV, but you'll have to sideload the browser APK and need a bluetooth mouse if you want to interact with the Settings.  

## Stream stats  
![image](https://github.com/redphx/better-xcloud/assets/96280/dc0f4f36-8a69-4ec1-aadd-cfda2d701991)  

- While playing > `...` > `Stream Stats`.  
- This bar is updated every second.  

| Abbr. | Full name          | Explain                                                                                                           |
|------:|:-------------------|:------------------------------------------------------------------------------------------------------------------|
| FPS   | Frames per Seconds | The number of decoded frames in the last second                                                                   |
| RTT   | Round Trip Time    | The number of seconds it takes for data to be sent from your device to the server and back over (lower is better) |
| BR    | Bitrate            | The amount of data server send to your device in the last second                                                  |
| PL    | Packets Lost       | Total number of packets lost                                                                                      |
| FL    | Frames Lost        | The total number of frames dropped prior to decode or dropped because the frame missed its display deadline       |

These info are provied by WebRTC API. You can use browser's built-in tool to see more info:  
- Chrome/Edge/Chromium variants: `chrome://webrtc-internals`  
- Firefox: `about:webrtc`  


## Capture screenshot  
- This feature is only available in **Better xCloud**.  
- Works on both desktop & mobile, but it's designed for mobile users.
- It's client-side only.
- It captures the current frame of the stream and save to a file. That means you won't get the raw quality like when you play on console, but it's still better than using the built-in screenshot feature on your phone.  
- Screenshot's resolution & quality depend on the quality of the stream at the moment.  
- Screenshot doesn't include touch UI, notification bar... only the gameplay.  
- There might be a slight delay.  
- ⚠️ It's not possible to map the Share/Screenshot button on your controller to this feature.  

### How to capture screenshot  
1. Enable this feature in setting.
2. Play a game.
3. Tap once at the bottom left/right (depend on your setting) to show the Screenshot button.
4. Tap on that button to capture screenshot.
5. Screenshot will be saved by browser.
6. You can double tap that corner to capture screenshot.

<img width="600" alt="Screenshot button" src="https://github.com/redphx/better-xcloud/assets/96280/a911b141-5dc0-450a-aeac-30d9cf202b44">

## FAQ
1. **Will I get banned for using this?**  
I think it's very unlikely that you'll get banned for using this. Most of the features only affect client-side, except for switching region of streaming server (you'll connect to another server instead of the default one). If you want to be safe just avoid using that. As always, use as your own risk.

2. **Why is it an Userscript and not extension?**  
It's because not many browsers on Android support installing extensions (and not all extensions can be installed).

3. **I see "???" button instead of server's name**  
That means Tampermonkey is not working properly. Please make sure you're using the latest version or switch to a well-known browser.  

4. **Can I use this with the Xbox Android app?**  
No you can't. You'll have to modify the app.

5. **Will you able to enable "Clarity Boost" feature on non-Edge browsers?**  
No. "Clarity Boost" feature uses an exclusive API (`Video.msVideoProcessing`) that's only available on Edge browser for desktop at the moment.

## User-Agent
You're no longer needed to change User-Agent since you can just use the **Force high quality stream** setting.  
If your browser doesn't support **Force high quality stream** setting, try changing User-Agent to:  
```
Mozilla/5.0 (SMART-TV; LINUX; Tizen 7.0) AppleWebKit/537.36 (KHTML, like Gecko) 94.0.4606.31/7.0 TV Safari/537.36
```
This will change your device to a Samsung TV running Tizen OS. It will improve the stream quality.  

---
Change User-Agent to:
```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.67
```
This will trick xCloud into thinking you're using Edge browser on desktop.

Other options (only do one of these):
- Add ` smarttv` to switch to Smart TV layout.
- Add ` Xbox;` to become an Xbox console.
- Add ` 36102dd3-6953-45f6-8b48-031fb95e0e0d` to become a Logitech G Cloud device.
- Add ` 0ed22b6f-b61d-41eb-810a-a1ed586a550b` to become a Razer Edge device.

## Acknowledgements  
- [n-thumann/xbox-cloud-server-selector](https://github.com/n-thumann/xbox-cloud-server-selector) for the idea of IPv6 feature
- Icons by [Adam Design](https://www.iconfinder.com/iconsets/user-interface-outline-27)

## Disclaimers  
- Use as your own risk.  
- This project is not affiliated with Xbox in any way. All Xbox logos/icons/trademarks are copyright of their respective owners.
